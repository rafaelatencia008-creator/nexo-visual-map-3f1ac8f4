/**
 * Paginação determinística por cursor opaco, vinculado à consulta.
 *
 * Formato interno do cursor: `mock_cursor_<sig>_<offset>` onde `sig` é uma
 * hash determinística da assinatura da consulta (serviço + escopo +
 * filtros + ordenação + limite). Cursores de consultas incompatíveis são
 * rejeitados como `validation_error/invalid_cursor`. O consumidor deve
 * tratar o cursor como opaco.
 */

import {
  validatePageRequest,
  type PageRequest,
  type PageResult,
} from "../services/pagination";
import type { ServiceResult } from "../services/result";
import { deepClone } from "./clone";

const CURSOR_RE = /^mock_cursor_([0-9a-f]{8})_(\d+)$/;

function invalidCursor<T>(): ServiceResult<PageResult<T>> {
  return {
    ok: false,
    error: { code: "validation_error", message: "invalid_cursor" },
  };
}

/**
 * Hash determinística FNV-1a 32-bit — não criptográfica, sem estado
 * global, suficiente para vincular um cursor à sua consulta.
 */
function hashSignature(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Constrói a assinatura opaca de uma consulta paginada. O `limit` faz
 * parte da assinatura: mudar o limite invalida cursores anteriores.
 */
function computeSignature(queryKey: string, limit: number): string {
  return hashSignature(`${queryKey}|limit=${limit}`);
}

export function paginateItems<T>(
  items: readonly T[],
  page: unknown,
  queryKey: string,
): ServiceResult<PageResult<T>> {
  const v = validatePageRequest(page);
  if (!v.ok) return { ok: false, error: v.error };
  const req: PageRequest = v.value;
  const total = items.length;
  const sig = computeSignature(queryKey, req.limit);
  let offset = 0;
  if (req.cursor !== undefined) {
    const m = CURSOR_RE.exec(req.cursor);
    if (!m) return invalidCursor<T>();
    if (m[1] !== sig) return invalidCursor<T>();
    const raw = Number(m[2]);
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) {
      // offset 0 nunca é emitido: não pode ser recebido de volta.
      return invalidCursor<T>();
    }
    if (raw >= total) return invalidCursor<T>();
    offset = raw;
  }
  const slice = items.slice(offset, offset + req.limit).map((it) => deepClone(it));
  const consumed = offset + slice.length;
  const nextCursor =
    consumed < total ? `mock_cursor_${sig}_${consumed}` : undefined;
  return {
    ok: true,
    data: { items: slice, nextCursor, total },
  };
}
