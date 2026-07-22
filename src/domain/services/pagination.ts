/**
 * Paginação por cursor opaco. Contratos puros.
 */

import type { ServiceError } from "./result";

export const PAGE_LIMIT_MIN = 1;
export const PAGE_LIMIT_MAX = 100;

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
 * Validação pura do PageRequest. Devolve `ok: true` ou um `ServiceError`
 * com código `validation_error`. O cursor é opaco — não interpretamos
 * conteúdo, apenas exigimos string não vazia quando informado.
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
