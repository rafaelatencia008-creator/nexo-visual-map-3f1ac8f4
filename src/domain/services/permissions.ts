/**
 * Catálogo central de ações de permissão e contratos de política.
 * Nenhuma matriz real: apenas contrato.
 */

import type { CaseId } from "../core/ids";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";

export const PERMISSION_ACTIONS = [
  "organization.read",
  "organization.update",

  "membership.read",
  "membership.list",
  "membership.create",
  "membership.update",
  "membership.revoke",

  "professionalProfile.read",
  "professionalProfile.list",
  "professionalProfile.create",
  "professionalProfile.update",

  "credential.read",
  "credential.list",
  "credential.create",
  "credential.update",

  "case.read",
  "case.list",
  "case.create",
  "case.update",
  "case.changeStatus",
  "case.archive",

  "person.read",
  "person.list",
  "person.create",
  "person.update",

  "casePerson.read",
  "casePerson.list",
  "casePerson.create",
  "casePerson.update",
  "casePerson.remove",

  "relationship.read",
  "relationship.list",
  "relationship.create",
  "relationship.update",
  "relationship.remove",

  "assignment.read",
  "assignment.list",
  "assignment.create",
  "assignment.update",
  "assignment.changeStatus",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

const PERMISSION_SET = new Set<string>(PERMISSION_ACTIONS);

export function isPermissionAction(v: unknown): v is PermissionAction {
  return typeof v === "string" && PERMISSION_SET.has(v);
}

/**
 * `resourceId` é intencionalmente uma string genérica para permitir alvos
 * que não têm branded ID ainda (entidades reservadas do catálogo). Sempre
 * que o alvo tiver ID branded conhecido (por exemplo `caseId`), esse
 * campo específico deve ser usado.
 */
export type PermissionRequest = Readonly<{
  action: PermissionAction;
  caseId?: CaseId;
  resourceId?: string;
}>;

export type PermissionDecision = Readonly<{
  allowed: boolean;
  reason?: string;
}>;

export interface PermissionPolicy {
  evaluate(
    context: ServiceContext,
    request: PermissionRequest,
  ): Promise<ServiceResult<PermissionDecision>>;
}
