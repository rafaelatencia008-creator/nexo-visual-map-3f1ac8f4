/**
 * Política mock de permissões — LV-07.4.
 *
 * Fonte única da matriz provisória. Não representa RLS, autenticação real
 * nem regras finais por profissão; existe apenas para validar fluxos locais
 * e impedir escrita por perfis somente-leitura.
 *
 * A matriz é privada a este módulo; nenhum consumidor pode mutá-la.
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

// ---- Grupos de papéis ------------------------------------------------------

const ALL_ROLES: readonly Role[] = ROLES;
const ADMIN_ROLES: readonly Role[] = ["proprietario", "administrador"];
const WRITE_ROLES: readonly Role[] = [
  "proprietario",
  "administrador",
  "profissional",
  "revisor",
  "colaborador",
];

// ---- Matriz --------------------------------------------------------------
// `satisfies` garante em compilação:
//   - todas as ações de PERMISSION_ACTIONS estão presentes;
//   - nenhuma chave desconhecida;
//   - arrays de Role[] readonly.

const PERMISSION_MATRIX = {
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
} as const satisfies Readonly<Record<PermissionAction, readonly Role[]>>;

// ---- Consulta pura (não expõe a matriz) ------------------------------------

export function isActionAllowedForRole(
  action: PermissionAction,
  role: Role,
): boolean {
  const list = (PERMISSION_MATRIX as Readonly<Record<PermissionAction, readonly Role[]>>)[
    action
  ];
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

// ---- Fábrica pública -------------------------------------------------------

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
