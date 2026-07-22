/**
 * Paginação determinística por cursor opaco para os mocks.
 *
 * Cursor interno tem o formato `mock_cursor_<offset>`, mas o consumidor
 * deve tratá-lo como opaco.
 */

import {
  validatePageRequest,
  type PageRequest,
  type PageResult,
} from "../services/pagination";
import type { ServiceResult } from "../services/result";
import { deepClone } from "./clone";

const CURSOR_RE = /^mock_cursor_(\d+)$/;

export function paginateItems<T>(
  items: readonly T[],
  page: unknown,
): ServiceResult<PageResult<T>> {
  const v = validatePageRequest(page);
  if (!v.ok) return { ok: false, error: v.error };
  const req: PageRequest = v.value;
  let offset = 0;
  if (req.cursor !== undefined) {
    const m = CURSOR_RE.exec(req.cursor);
    if (!m) {
      return {
        ok: false,
        error: { code: "validation_error", message: "invalid_cursor" },
      };
    }
    offset = Number(m[1]);
    if (!Number.isFinite(offset) || offset < 0) {
      return {
        ok: false,
        error: { code: "validation_error", message: "invalid_cursor" },
      };
    }
  }
  const total = items.length;
  const slice = items.slice(offset, offset + req.limit).map((it) => deepClone(it));
  const consumed = offset + slice.length;
  const nextCursor = consumed < total ? `mock_cursor_${consumed}` : undefined;
  return {
    ok: true,
    data: { items: slice, nextCursor, total },
  };
}
