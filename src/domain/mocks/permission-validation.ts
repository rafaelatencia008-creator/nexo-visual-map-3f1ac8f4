/**
 * Helper interno usado pelos serviços mock para exigir permissão antes
 * de qualquer efeito colateral. Ordem: contexto → pedido → matriz → acesso
 * contextual (Agenda).
 *
 * Negativas são retornadas como `forbidden / permission_denied` (matriz)
 * ou `forbidden / case_access_denied` (acesso contextual da Agenda).
 */

import { isPermissionRequest, type PermissionRequest } from "../services/permissions";
import type { ServiceResult } from "../services/result";
import type { MockStore } from "./store";
import { requireContext, type ValidatedContext } from "./context-validation";
import { isActionAllowedForRole } from "./permission-mock";
import { checkAgendaCaseAccess, isAgendaAction } from "./agenda-case-access";

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
  if (isAgendaAction(request.action) && request.caseId !== undefined) {
    const access = checkAgendaCaseAccess(store, ctx.data.context, request.caseId);
    // Caso não pertence à org: NÃO barra aqui; o serviço devolverá not_found.
    if (access.kind === "denied") {
      return {
        ok: false,
        error: { code: "forbidden", message: "case_access_denied" },
      };
    }
  }
  return ctx;
}
