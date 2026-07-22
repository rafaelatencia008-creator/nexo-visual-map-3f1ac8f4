/**
 * Paginação por cursor opaco. Contratos puros com validação estrita.
 */

import { containsForbiddenKey, hasOnlyAllowedKeys } from "../core/common";
import type { ServiceError } from "./result";

export const PAGE_LIMIT_MIN = 1;
export const PAGE_LIMIT_MAX = 100;

export const PAGE_REQUEST_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "cursor",
  "limit",
]);

export type PageRequest = Readonly<{
  cursor?: string;
  limit: number;
}>;

export type PageResult<T> = Readonly<{
  items: readonly T[];
  nextCursor?: string;
  total?: number;
}>;

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export function isSortDirection(v: unknown): v is SortDirection {
  return v === "asc" || v === "desc";
}

/**
 * Validação pura e estrita do PageRequest.
 *
 * Rejeita:
 * - valor não-objeto ou array;
 * - qualquer chave fora de `PAGE_REQUEST_ALLOWED_KEYS`;
 * - qualquer chave proibida em qualquer nível de aninhamento
 *   (`token`, `password`, `secret` etc.);
 * - `limit` fora de [1, 100] ou não inteiro;
 * - `cursor` vazio ou não string quando informado.
 *
 * Cursor permanece opaco: não interpretamos seu conteúdo.
 */
export function validatePageRequest(
  req: unknown,
):
  | Readonly<{ ok: true; value: PageRequest }>
  | Readonly<{ ok: false; error: ServiceError }> {
  if (!req || typeof req !== "object" || Array.isArray(req)) {
    return {
      ok: false,
      error: { code: "validation_error", message: "invalid_page_request" },
    };
  }
  if (containsForbiddenKey(req)) {
    return {
      ok: false,
      error: {
        code: "validation_error",
        message: "forbidden_key_in_page_request",
      },
    };
  }
  if (!hasOnlyAllowedKeys(req, PAGE_REQUEST_ALLOWED_KEYS)) {
    return {
      ok: false,
      error: {
        code: "validation_error",
        message: "unknown_key_in_page_request",
      },
    };
  }
  const r = req as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  if (typeof r.limit !== "number" || !Number.isInteger(r.limit)) {
    errors.limit = ["not_integer"];
  } else if (r.limit < PAGE_LIMIT_MIN || r.limit > PAGE_LIMIT_MAX) {
    errors.limit = ["out_of_range"];
  }
  if (r.cursor !== undefined) {
    if (typeof r.cursor !== "string" || r.cursor.length === 0) {
      errors.cursor = ["empty_or_invalid"];
    }
  }
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      error: {
        code: "validation_error",
        message: "invalid_page_request",
        fieldErrors: errors,
      },
    };
  }
  return {
    ok: true,
    value: { limit: r.limit as number, cursor: r.cursor as string | undefined },
  };
}
