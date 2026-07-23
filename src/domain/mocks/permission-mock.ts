/**
 * Política mock de permissões — LV-07.4 (+ LV-07.4.1).
 *
 * Fonte única da matriz provisória. Não representa RLS, autenticação real
 * nem regras finais por profissão; existe apenas para validar fluxos locais
 * e impedir escrita por perfis somente-leitura.
 *
 * A matriz é **privada a este módulo**: nem o valor `PERMISSION_MATRIX`
 * nem os arrays de papéis (`ALL_ROLES`, `ADMIN_ROLES`, `WRITE_ROLES`) são
 * exportados. Apenas o **tipo** `PermissionMatrix` é público (para provas
 * de tipo em testes) e a função `isActionAllowedForRole`, consumida pelos
 * guards internos. Os arrays estão congelados em runtime (`Object.freeze`)
 * e o objeto da matriz também.
 */

import {
  PERMISSION_ACTIONS,
  isPermissionRequest,
  type PermissionAction,
  type PermissionDecision,
  type PermissionPolicy,
  type PermissionRequest,
} from "../services/permissions";
import { ROLES, type Role } from "../shared/work-context";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { MockStore } from "./store";
import { requireContext } from "./context-validation";

// ---- Tipo público exclusivamente para provas de tipo ----------------------

export type PermissionMatrix = Readonly<
  Record<PermissionAction, readonly Role[]>
>;

// ---- Grupos de papéis (congelados em runtime) -----------------------------

const ALL_ROLES: readonly Role[] = Object.freeze([...ROLES]);
const ADMIN_ROLES: readonly Role[] = Object.freeze([
  "proprietario",
  "administrador",
]);
const WRITE_ROLES: readonly Role[] = Object.freeze([
  "proprietario",
  "administrador",
  "profissional",
  "revisor",
  "colaborador",
]);

// Agenda (LV-09.1A): revisor e leitura são somente-leitura;
// colaborador pode escrever mas não remover.
const AGENDA_WRITE_ROLES: readonly Role[] = Object.freeze([
  "proprietario",
  "administrador",
  "profissional",
  "colaborador",
]);
const AGENDA_REMOVE_ROLES: readonly Role[] = Object.freeze([
  "proprietario",
  "administrador",
  "profissional",
]);

// ---- Matriz privada -------------------------------------------------------
// `satisfies` garante em compilação:
//   - todas as ações de PERMISSION_ACTIONS estão presentes;
//   - nenhuma chave desconhecida;
//   - arrays de Role[] readonly.

const PERMISSION_MATRIX = Object.freeze({
  "organization.read": ALL_ROLES,
  "organization.update": ADMIN_ROLES,

  "membership.read": ALL_ROLES,
  "membership.list": ALL_ROLES,
  "membership.create": ADMIN_ROLES,
  "membership.update": ADMIN_ROLES,
  "membership.revoke": ADMIN_ROLES,

  "professionalProfile.read": ALL_ROLES,
  "professionalProfile.list": ALL_ROLES,
  "professionalProfile.create": WRITE_ROLES,
  "professionalProfile.update": WRITE_ROLES,

  "credential.read": ALL_ROLES,
  "credential.list": ALL_ROLES,
  "credential.create": WRITE_ROLES,
  "credential.update": WRITE_ROLES,

  "case.read": ALL_ROLES,
  "case.list": ALL_ROLES,
  "case.create": WRITE_ROLES,
  "case.update": WRITE_ROLES,
  "case.changeStatus": WRITE_ROLES,
  "case.archive": WRITE_ROLES,

  "person.read": ALL_ROLES,
  "person.list": ALL_ROLES,
  "person.create": WRITE_ROLES,
  "person.update": WRITE_ROLES,

  "casePerson.read": ALL_ROLES,
  "casePerson.list": ALL_ROLES,
  "casePerson.create": WRITE_ROLES,
  "casePerson.update": WRITE_ROLES,
  "casePerson.remove": WRITE_ROLES,

  "relationship.read": ALL_ROLES,
  "relationship.list": ALL_ROLES,
  "relationship.create": WRITE_ROLES,
  "relationship.update": WRITE_ROLES,
  "relationship.remove": WRITE_ROLES,

  "assignment.read": ALL_ROLES,
  "assignment.list": ALL_ROLES,
  "assignment.create": WRITE_ROLES,
  "assignment.update": WRITE_ROLES,
  "assignment.changeStatus": WRITE_ROLES,

  "casePlanItem.read": ALL_ROLES,
  "casePlanItem.list": ALL_ROLES,
  "casePlanItem.create": WRITE_ROLES,
  "casePlanItem.update": WRITE_ROLES,
  "casePlanItem.changeStatus": WRITE_ROLES,
  "casePlanItem.remove": WRITE_ROLES,

  "caseTimelineEntry.read": ALL_ROLES,
  "caseTimelineEntry.list": ALL_ROLES,
  "caseTimelineEntry.create": WRITE_ROLES,
  "caseTimelineEntry.update": WRITE_ROLES,
  "caseTimelineEntry.remove": WRITE_ROLES,

  "auditEvent.read": ALL_ROLES,
  "caseSnapshot.read": ALL_ROLES,
  "caseSnapshot.create": Object.freeze([
    "proprietario",
    "administrador",
    "profissional",
  ] as readonly Role[]),

  // Agenda — LV-09.1A
  "deadline.read": ALL_ROLES,
  "deadline.list": ALL_ROLES,
  "deadline.create": AGENDA_WRITE_ROLES,
  "deadline.update": AGENDA_WRITE_ROLES,
  "deadline.changeStatus": AGENDA_WRITE_ROLES,
  "deadline.remove": AGENDA_REMOVE_ROLES,
  "appointment.read": ALL_ROLES,
  "appointment.list": ALL_ROLES,
  "appointment.create": AGENDA_WRITE_ROLES,
  "appointment.update": AGENDA_WRITE_ROLES,
  "appointment.changeStatus": AGENDA_WRITE_ROLES,
  "appointment.remove": AGENDA_REMOVE_ROLES,
}) satisfies PermissionMatrix;

// ---- Consulta pura (não expõe a matriz) -----------------------------------

export function isActionAllowedForRole(
  action: PermissionAction,
  role: Role,
): boolean {
  const list = (PERMISSION_MATRIX as PermissionMatrix)[action];
  return list.includes(role);
}

// Guardas de integridade em tempo de módulo — protegem contra desvio silencioso.
// (Executam uma vez por processo; O(40) trivial.)
{
  const catalog = new Set<string>(PERMISSION_ACTIONS);
  for (const key of Object.keys(PERMISSION_MATRIX)) {
    if (!catalog.has(key)) {
      throw new Error(`PERMISSION_MATRIX: unknown action ${key}`);
    }
  }
  for (const action of PERMISSION_ACTIONS) {
    if (!(action in PERMISSION_MATRIX)) {
      throw new Error(`PERMISSION_MATRIX: missing action ${action}`);
    }
  }
}

// ---- Fábrica pública ------------------------------------------------------

export function createPermissionPolicyMock(store: MockStore): PermissionPolicy {
  return {
    async evaluate(
      context: ServiceContext,
      request: PermissionRequest,
    ): Promise<ServiceResult<PermissionDecision>> {
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
      const allowed = isActionAllowedForRole(
        request.action,
        ctx.data.context.role,
      );
      if (allowed) return { ok: true, data: { allowed: true } };
      return { ok: true, data: { allowed: false, reason: "role_not_allowed" } };
    },
  };
}
