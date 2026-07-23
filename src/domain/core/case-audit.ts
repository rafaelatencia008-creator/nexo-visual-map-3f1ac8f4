/**
 * Auditoria e Snapshot do processo — LV-08.6A.
 *
 * Entidades imutáveis. Nenhum acesso a storage, rede ou React.
 * Nenhum dado sigiloso completo aparece em summary/label/reason.
 */

import {
  isAuditEventId,
  isCaseId,
  isCaseSnapshotId,
  isMembershipId,
  isOrganizationId,
  isUserId,
  type AuditEventId,
  type CaseId,
  type CaseSnapshotId,
  type MembershipId,
  type OrganizationId,
  type UserId,
} from "./ids";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isEntityMetadata,
  isIsoDateTime,
  type EntityMetadata,
  type IsoDateTime,
} from "./common";
import type { Case } from "./case";
import { isCase } from "./case";
import type { Person } from "./person";
import { isPerson } from "./person";
import type {
  Assignment,
  CasePerson,
  Relationship,
} from "./assignment";
import { isAssignment, isCasePerson, isRelationship } from "./assignment";
import type { CasePlanItem, CaseTimelineEntry } from "./case-plan";
import { isCasePlanItem, isCaseTimelineEntry } from "./case-plan";

// ---- Catálogo AuditAction --------------------------------------------------

export const AUDIT_ACTIONS = [
  "case.created",
  "case.updated",
  "casePlanItem.created",
  "casePlanItem.updated",
  "casePlanItem.statusChanged",
  "casePlanItem.removed",
  "caseTimelineEntry.created",
  "caseTimelineEntry.updated",
  "caseTimelineEntry.removed",
  "casePerson.created",
  "casePerson.updated",
  "casePerson.removed",
  "relationship.created",
  "relationship.updated",
  "relationship.removed",
  "assignment.created",
  "assignment.updated",
  "assignment.removed",
  "caseSnapshot.created",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const AUDIT_ACTION_SET = new Set<string>(AUDIT_ACTIONS);

export function isAuditAction(v: unknown): v is AuditAction {
  return typeof v === "string" && AUDIT_ACTION_SET.has(v);
}

// ---- Catálogo AuditTargetType ---------------------------------------------

export const AUDIT_TARGET_TYPES = [
  "case",
  "casePlanItem",
  "caseTimelineEntry",
  "casePerson",
  "relationship",
  "assignment",
  "caseSnapshot",
] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

const AUDIT_TARGET_TYPE_SET = new Set<string>(AUDIT_TARGET_TYPES);

export function isAuditTargetType(v: unknown): v is AuditTargetType {
  return typeof v === "string" && AUDIT_TARGET_TYPE_SET.has(v);
}

// ---- Summaries oficiais estáveis ------------------------------------------

export const AUDIT_SUMMARY: Readonly<Record<AuditAction, string>> = Object.freeze({
  "case.created": "Processo criado.",
  "case.updated": "Dados do processo atualizados.",
  "casePerson.created": "Pessoa vinculada ao processo.",
  "casePerson.updated": "Vínculo de pessoa atualizado.",
  "casePerson.removed": "Pessoa removida do processo.",
  "relationship.created": "Relação adicionada.",
  "relationship.updated": "Relação atualizada.",
  "relationship.removed": "Relação removida.",
  "assignment.created": "Profissional vinculado ao processo.",
  "assignment.updated": "Vínculo profissional atualizado.",
  "assignment.removed": "Profissional removido do processo.",
  "casePlanItem.created": "Item adicionado ao plano de trabalho.",
  "casePlanItem.updated": "Item do plano atualizado.",
  "casePlanItem.statusChanged": "Andamento do item do plano atualizado.",
  "casePlanItem.removed": "Item removido do plano de trabalho.",
  "caseTimelineEntry.created": "Registro adicionado à cronologia.",
  "caseTimelineEntry.updated": "Registro da cronologia atualizado.",
  "caseTimelineEntry.removed": "Registro removido da cronologia.",
  "caseSnapshot.created": "Snapshot do processo criado.",
});

// ---- Entidade AuditEvent ---------------------------------------------------

export type AuditEvent = Readonly<{
  id: AuditEventId;
  organizationId: OrganizationId;
  caseId: CaseId;
  actorUserId: UserId;
  actorMembershipId: MembershipId;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  summary: string;
  occurredAt: IsoDateTime;
  metadata: EntityMetadata;
}>;

export const AUDIT_EVENT_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "actorUserId",
  "actorMembershipId",
  "action",
  "targetType",
  "targetId",
  "summary",
  "occurredAt",
  "metadata",
]);

export const AUDIT_SUMMARY_MAX = 160;

export function isAuditEvent(v: unknown): v is AuditEvent {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, AUDIT_EVENT_ALLOWED_KEYS)) return false;
  const e = v as Record<string, unknown>;
  if (!isAuditEventId(e.id)) return false;
  if (!isOrganizationId(e.organizationId)) return false;
  if (!isCaseId(e.caseId)) return false;
  if (!isUserId(e.actorUserId)) return false;
  if (!isMembershipId(e.actorMembershipId)) return false;
  if (!isAuditAction(e.action)) return false;
  if (!isAuditTargetType(e.targetType)) return false;
  if (typeof e.targetId !== "string" || e.targetId.length === 0) return false;
  if (typeof e.summary !== "string") return false;
  if (e.summary.length < 1 || e.summary.length > AUDIT_SUMMARY_MAX) return false;
  if (!isIsoDateTime(e.occurredAt)) return false;
  if (!isEntityMetadata(e.metadata)) return false;
  return true;
}

// ---- Payload do snapshot ---------------------------------------------------

export type CaseSnapshotPayload = Readonly<{
  case: Case;
  casePersons: readonly CasePerson[];
  persons: readonly Person[];
  relationships: readonly Relationship[];
  assignments: readonly Assignment[];
  casePlanItems: readonly CasePlanItem[];
  caseTimelineEntries: readonly CaseTimelineEntry[];
}>;

export const CASE_SNAPSHOT_PAYLOAD_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "case",
  "casePersons",
  "persons",
  "relationships",
  "assignments",
  "casePlanItems",
  "caseTimelineEntries",
]);

function isReadonlyArrayOf<T>(v: unknown, guard: (x: unknown) => x is T): v is readonly T[] {
  if (!Array.isArray(v)) return false;
  for (const item of v) if (!guard(item)) return false;
  return true;
}

export function isCaseSnapshotPayload(v: unknown): v is CaseSnapshotPayload {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, CASE_SNAPSHOT_PAYLOAD_ALLOWED_KEYS)) return false;
  const p = v as Record<string, unknown>;
  if (!isCase(p.case)) return false;
  if (!isReadonlyArrayOf(p.casePersons, isCasePerson)) return false;
  if (!isReadonlyArrayOf(p.persons, isPerson)) return false;
  if (!isReadonlyArrayOf(p.relationships, isRelationship)) return false;
  if (!isReadonlyArrayOf(p.assignments, isAssignment)) return false;
  if (!isReadonlyArrayOf(p.casePlanItems, isCasePlanItem)) return false;
  if (!isReadonlyArrayOf(p.caseTimelineEntries, isCaseTimelineEntry)) return false;
  return true;
}

// ---- Entidade CaseSnapshot -------------------------------------------------

export const CASE_SNAPSHOT_LABEL_MAX = 120;
export const CASE_SNAPSHOT_REASON_MAX = 1000;

export type CaseSnapshot = Readonly<{
  id: CaseSnapshotId;
  organizationId: OrganizationId;
  caseId: CaseId;
  createdByUserId: UserId;
  createdByMembershipId: MembershipId;
  createdAt: IsoDateTime;
  label: string;
  reason?: string;
  payload: CaseSnapshotPayload;
  metadata: EntityMetadata;
}>;

export const CASE_SNAPSHOT_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "createdByUserId",
  "createdByMembershipId",
  "createdAt",
  "label",
  "reason",
  "payload",
  "metadata",
]);

export function isCaseSnapshot(v: unknown): v is CaseSnapshot {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, CASE_SNAPSHOT_ALLOWED_KEYS)) return false;
  const s = v as Record<string, unknown>;
  if (!isCaseSnapshotId(s.id)) return false;
  if (!isOrganizationId(s.organizationId)) return false;
  if (!isCaseId(s.caseId)) return false;
  if (!isUserId(s.createdByUserId)) return false;
  if (!isMembershipId(s.createdByMembershipId)) return false;
  if (!isIsoDateTime(s.createdAt)) return false;
  if (typeof s.label !== "string") return false;
  const labelTrim = s.label.trim();
  if (labelTrim.length < 1 || s.label.length > CASE_SNAPSHOT_LABEL_MAX) return false;
  if (s.reason !== undefined) {
    if (typeof s.reason !== "string") return false;
    if (s.reason.length < 1 || s.reason.length > CASE_SNAPSHOT_REASON_MAX) return false;
  }
  if (!isCaseSnapshotPayload(s.payload)) return false;
  if (!isEntityMetadata(s.metadata)) return false;
  // Payload coerente com organização/processo do snapshot.
  if (s.payload.case.organizationId !== s.organizationId) return false;
  if (s.payload.case.id !== s.caseId) return false;
  return true;
}
