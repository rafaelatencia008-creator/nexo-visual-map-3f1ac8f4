/**
 * Entidades oficiais de Plano de trabalho e Cronologia do processo — LV-08.5A.
 *
 * Puro TypeScript. Sem armazenamento, sem rede, sem React.
 */

import {
  isAssignmentId,
  isCaseId,
  isCasePlanItemId,
  isCaseTimelineEntryId,
  isOrganizationId,
  type AssignmentId,
  type CaseId,
  type CasePlanItemId,
  type CaseTimelineEntryId,
  type OrganizationId,
} from "./ids";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isEntityMetadata,
  isIsoDate,
  type EntityMetadata,
  type IsoDate,
} from "./common";

// ---- Catálogos: Plano ------------------------------------------------------

export const CASE_PLAN_ITEM_KINDS = ["activity", "pending"] as const;
export type CasePlanItemKind = (typeof CASE_PLAN_ITEM_KINDS)[number];

export const CASE_PLAN_ITEM_STATUSES = [
  "planned",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const;
export type CasePlanItemStatus = (typeof CASE_PLAN_ITEM_STATUSES)[number];

export const CASE_PLAN_ITEM_PRIORITIES = ["low", "normal", "high"] as const;
export type CasePlanItemPriority = (typeof CASE_PLAN_ITEM_PRIORITIES)[number];

const KIND_SET = new Set<string>(CASE_PLAN_ITEM_KINDS);
const STATUS_SET = new Set<string>(CASE_PLAN_ITEM_STATUSES);
const PRIORITY_SET = new Set<string>(CASE_PLAN_ITEM_PRIORITIES);

export const isCasePlanItemKind = (v: unknown): v is CasePlanItemKind =>
  typeof v === "string" && KIND_SET.has(v);
export const isCasePlanItemStatus = (v: unknown): v is CasePlanItemStatus =>
  typeof v === "string" && STATUS_SET.has(v);
export const isCasePlanItemPriority = (v: unknown): v is CasePlanItemPriority =>
  typeof v === "string" && PRIORITY_SET.has(v);

// ---- Limites ---------------------------------------------------------------

export const CASE_PLAN_ITEM_TITLE_MAX = 160;
export const CASE_PLAN_ITEM_DESCRIPTION_MAX = 2000;
export const CASE_TIMELINE_ENTRY_TITLE_MAX = 160;
export const CASE_TIMELINE_ENTRY_DESCRIPTION_MAX = 2000;

function isValidTitle(v: unknown, max: number): v is string {
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t.length < 1) return false;
  if (v.length > max) return false;
  return true;
}

function isValidOptionalDescription(v: unknown, max: number): boolean {
  if (v === undefined) return true;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t.length < 1) return false;
  if (v.length > max) return false;
  return true;
}

// ---- Entidade CasePlanItem -------------------------------------------------

export type CasePlanItem = Readonly<{
  id: CasePlanItemId;
  organizationId: OrganizationId;
  caseId: CaseId;
  kind: CasePlanItemKind;
  title: string;
  description?: string;
  status: CasePlanItemStatus;
  priority: CasePlanItemPriority;
  dueOn?: IsoDate;
  assignmentId?: AssignmentId;
  metadata: EntityMetadata;
}>;

export const CASE_PLAN_ITEM_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "kind",
  "title",
  "description",
  "status",
  "priority",
  "dueOn",
  "assignmentId",
  "metadata",
]);

export function isCasePlanItem(v: unknown): v is CasePlanItem {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, CASE_PLAN_ITEM_ALLOWED_KEYS)) return false;
  const p = v as Record<string, unknown>;
  if (!isCasePlanItemId(p.id)) return false;
  if (!isOrganizationId(p.organizationId)) return false;
  if (!isCaseId(p.caseId)) return false;
  if (!isCasePlanItemKind(p.kind)) return false;
  if (!isValidTitle(p.title, CASE_PLAN_ITEM_TITLE_MAX)) return false;
  if (!isValidOptionalDescription(p.description, CASE_PLAN_ITEM_DESCRIPTION_MAX))
    return false;
  if (!isCasePlanItemStatus(p.status)) return false;
  if (!isCasePlanItemPriority(p.priority)) return false;
  if (p.dueOn !== undefined && !isIsoDate(p.dueOn)) return false;
  if (p.assignmentId !== undefined && !isAssignmentId(p.assignmentId)) return false;
  if (!isEntityMetadata(p.metadata)) return false;
  return true;
}

// ---- Catálogo: Cronologia --------------------------------------------------

export const CASE_TIMELINE_ENTRY_KINDS = ["milestone", "note"] as const;
export type CaseTimelineEntryKind = (typeof CASE_TIMELINE_ENTRY_KINDS)[number];

const TL_KIND_SET = new Set<string>(CASE_TIMELINE_ENTRY_KINDS);

export const isCaseTimelineEntryKind = (v: unknown): v is CaseTimelineEntryKind =>
  typeof v === "string" && TL_KIND_SET.has(v);

// ---- Entidade CaseTimelineEntry --------------------------------------------

export type CaseTimelineEntry = Readonly<{
  id: CaseTimelineEntryId;
  organizationId: OrganizationId;
  caseId: CaseId;
  kind: CaseTimelineEntryKind;
  occurredOn: IsoDate;
  title: string;
  description?: string;
  metadata: EntityMetadata;
}>;

export const CASE_TIMELINE_ENTRY_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "kind",
  "occurredOn",
  "title",
  "description",
  "metadata",
]);

export function isCaseTimelineEntry(v: unknown): v is CaseTimelineEntry {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, CASE_TIMELINE_ENTRY_ALLOWED_KEYS)) return false;
  const t = v as Record<string, unknown>;
  if (!isCaseTimelineEntryId(t.id)) return false;
  if (!isOrganizationId(t.organizationId)) return false;
  if (!isCaseId(t.caseId)) return false;
  if (!isCaseTimelineEntryKind(t.kind)) return false;
  if (!isIsoDate(t.occurredOn)) return false;
  if (!isValidTitle(t.title, CASE_TIMELINE_ENTRY_TITLE_MAX)) return false;
  if (
    !isValidOptionalDescription(t.description, CASE_TIMELINE_ENTRY_DESCRIPTION_MAX)
  )
    return false;
  if (!isEntityMetadata(t.metadata)) return false;
  return true;
}
