/**
 * Helper interno usado pelos serviços mock para exigir permissão antes
 * de qualquer efeito colateral. Ordem: contexto → pedido → matriz.
 *
 * Negativas são retornadas como `forbidden / permission_denied`, sem
 * dados internos, sem stack e sem detalhes da matriz.
 */

import { isPermissionRequest, type PermissionRequest } from "../services/permissions";
import type { ServiceResult } from "../services/result";
import type { MockStore } from "./store";
import { requireContext, type ValidatedContext } from "./context-validation";
import { isActionAllowedForRole } from "./permission-mock";

export function requirePermission(
  store: MockStore,
  context: unknown,
  request: PermissionRequest,
): ServiceResult<ValidatedContext> {
  const ctx = requireContext(store, context);
  if (!ctx.ok) return ctx;
  if (!isPermissionRequest(request)) {
    return {
      ok: false,
      error: {
        code: "validation_error",
        message: "invalid_permission_request",
      },
    };
  }
  if (!isActionAllowedForRole(request.action, ctx.data.context.role)) {
    return {
      ok: false,
      error: { code: "forbidden", message: "permission_denied" },
    };
  }
  return ctx;
}
