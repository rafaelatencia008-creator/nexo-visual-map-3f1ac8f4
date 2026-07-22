/**
 * Validação de campos de ordenação para os mocks.
 *
 * `sortBy` só é aceito quando pertence ao catálogo do serviço.
 * `sortDir` só é aceito quando pertence a `SORT_DIRECTIONS`.
 * Nunca "cai" silenciosamente para o padrão quando um valor foi informado.
 */

import type { ServiceResult } from "../services/result";
import { SORT_DIRECTIONS } from "../services/pagination";

const DIR_SET: ReadonlySet<string> = new Set<string>(SORT_DIRECTIONS);

export function validateSort(
  sortBy: unknown,
  sortDir: unknown,
  allowedFields: readonly string[],
): ServiceResult<undefined> {
  if (sortBy !== undefined) {
    if (typeof sortBy !== "string" || !allowedFields.includes(sortBy)) {
      return {
        ok: false,
        error: { code: "validation_error", message: "invalid_sort" },
      };
    }
  }
  if (sortDir !== undefined) {
    if (typeof sortDir !== "string" || !DIR_SET.has(sortDir)) {
      return {
        ok: false,
        error: { code: "validation_error", message: "invalid_sort" },
      };
    }
  }
  return { ok: true, data: undefined };
}
