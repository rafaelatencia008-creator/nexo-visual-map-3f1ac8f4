/**
 * Contexto de execução obrigatório em toda operação de serviço.
 *
 * Puro TypeScript. Não guarda autenticação, e-mail ou dados de sessão visual.
 * Não acessa storage nem window.
 */

import {
  isMembershipId,
  isOrganizationId,
  isUserId,
  type MembershipId,
  type OrganizationId,
  type UserId,
} from "../core/ids";
import { containsForbiddenKey, hasOnlyAllowedKeys } from "../core/common";
import { isRole, type Role } from "../shared/work-context";

export type ServiceContext = Readonly<{
  organizationId: OrganizationId;
  userId: UserId;
  membershipId: MembershipId;
  role: Role;
}>;

export const SERVICE_CONTEXT_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "organizationId",
  "userId",
  "membershipId",
  "role",
]);

export function isServiceContext(v: unknown): v is ServiceContext {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, SERVICE_CONTEXT_ALLOWED_KEYS)) return false;
  const c = v as Record<string, unknown>;
  return (
    isOrganizationId(c.organizationId) &&
    isUserId(c.userId) &&
    isMembershipId(c.membershipId) &&
    isRole(c.role)
  );
}
