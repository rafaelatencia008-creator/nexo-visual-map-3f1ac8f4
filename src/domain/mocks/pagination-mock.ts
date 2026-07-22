/**
 * Paginação determinística por cursor opaco para os mocks.
 *
 * Cursor interno tem o formato `mock_cursor_<offset>`, mas o consumidor
 * deve tratá-lo como opaco. Rejeitamos cursores fora do conjunto:
 *  - offset < 0
 *  - offset > total
 * `offset === total` é aceito somente porque representa a página final
 * vazia que a implementação pode ter emitido legitimamente.
 */

import {
  validatePageRequest,
  type PageRequest,
  type PageResult,
} from "../services/pagination";
import type { ServiceResult } from "../services/result";
import { deepClone } from "./clone";

const CURSOR_RE = /^mock_cursor_(\d+)$/;

function invalidCursor<T>(): ServiceResult<PageResult<T>> {
  return {
    ok: false,
    error: { code: "validation_error", message: "invalid_cursor" },
  };
}

export function paginateItems<T>(
  items: readonly T[],
  page: unknown,
): ServiceResult<PageResult<T>> {
  const v = validatePageRequest(page);
  if (!v.ok) return { ok: false, error: v.error };
  const req: PageRequest = v.value;
  const total = items.length;
  let offset = 0;
  if (req.cursor !== undefined) {
    const m = CURSOR_RE.exec(req.cursor);
    if (!m) return invalidCursor<T>();
    const raw = Number(m[1]);
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
      return invalidCursor<T>();
    }
    if (raw > total) return invalidCursor<T>();
    offset = raw;
  }
  const slice = items.slice(offset, offset + req.limit).map((it) => deepClone(it));
  const consumed = offset + slice.length;
  const nextCursor = consumed < total ? `mock_cursor_${consumed}` : undefined;
  return {
    ok: true,
    data: { items: slice, nextCursor, total },
  };
}
