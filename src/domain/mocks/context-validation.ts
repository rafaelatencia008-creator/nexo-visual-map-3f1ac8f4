/**
 * Validação de `ServiceContext` contra o store: existência, coerência
 * organizacional/usuário/papel e utilizabilidade do membership.
 *
 * Nesta etapa, a política de permissões se resume à validação estrutural
 * do contexto. A matriz por ação/papel virá em LV-07.4.
 */

import { isServiceContext, type ServiceContext } from "../services/context";
import type { ServiceError, ServiceResult } from "../services/result";
import type { Organization } from "../core/organization";
import type { User, Membership } from "../core/access";
import type { MockStore } from "./store";

export type ValidatedContext = Readonly<{
  context: ServiceContext;
  organization: Organization;
  user: User;
  membership: Membership;
}>;

const err = (code: ServiceError["code"], message: string): ServiceError => {
  if (code === "unauthorized") return { code, message };
  if (code === "forbidden") return { code, message };
  return { code: "unauthorized", message };
};

export function requireContext(
  store: MockStore,
  context: unknown,
): ServiceResult<ValidatedContext> {
  if (!isServiceContext(context)) {
    return { ok: false, error: err("unauthorized", "invalid_context") };
  }
  const membership = store.memberships.get(context.membershipId);
  if (!membership) {
    return { ok: false, error: err("unauthorized", "membership_not_found") };
  }
  if (membership.organizationId !== context.organizationId) {
    return { ok: false, error: err("forbidden", "organization_mismatch") };
  }
  if (membership.userId !== context.userId) {
    return { ok: false, error: err("forbidden", "user_mismatch") };
  }
  if (membership.role !== context.role) {
    return { ok: false, error: err("forbidden", "role_mismatch") };
  }
  if (membership.status !== "active") {
    return { ok: false, error: err("forbidden", "membership_not_active") };
  }
  const organization = store.organizations.get(context.organizationId);
  if (!organization) {
    return { ok: false, error: err("unauthorized", "organization_not_found") };
  }
  const user = store.users.get(context.userId);
  if (!user) {
    return { ok: false, error: err("unauthorized", "user_not_found") };
  }
  return { ok: true, data: { context, organization, user, membership } };
}
