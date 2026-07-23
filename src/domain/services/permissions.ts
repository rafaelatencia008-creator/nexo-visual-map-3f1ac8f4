/**
 * Catálogo central de ações de permissão, contratos de política e
 * validação estrita de `PermissionRequest`.
 *
 * Sem matriz real de permissões.
 */

import { containsForbiddenKey, hasOnlyAllowedKeys } from "../core/common";
import { isCaseId, type CaseId } from "../core/ids";
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

  "casePlanItem.read",
  "casePlanItem.list",
  "casePlanItem.create",
  "casePlanItem.update",
  "casePlanItem.changeStatus",
  "casePlanItem.remove",

  "caseTimelineEntry.read",
  "caseTimelineEntry.list",
  "caseTimelineEntry.create",
  "caseTimelineEntry.update",
  "caseTimelineEntry.remove",
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

export const PERMISSION_REQUEST_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "action",
  "caseId",
  "resourceId",
]);

/**
 * Type guard estrito de `PermissionRequest`. Rejeita:
 * - `null`, primitivos, arrays;
 * - qualquer chave fora do allow-list;
 * - qualquer chave proibida em qualquer nível de aninhamento;
 * - `action` fora do catálogo `PERMISSION_ACTIONS`;
 * - `caseId` sem prefixo `case_` ou não branded;
 * - `resourceId` que não seja string, ou seja string vazia.
 */
export function isPermissionRequest(value: unknown): value is PermissionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (containsForbiddenKey(value)) return false;
  if (!hasOnlyAllowedKeys(value, PERMISSION_REQUEST_ALLOWED_KEYS)) return false;
  const r = value as Record<string, unknown>;
  if (!isPermissionAction(r.action)) return false;
  if (r.caseId !== undefined && !isCaseId(r.caseId)) return false;
  if (r.resourceId !== undefined) {
    if (typeof r.resourceId !== "string" || r.resourceId.length === 0) {
      return false;
    }
  }
  return true;
}

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
