/**
 * LV-08.5B — provas de tipo estritas para a interface de Plano e Cronologia.
 *
 * Nenhum cast `as any`, `as unknown as`, `as never`.
 */

import type {
  CasePlanItem,
  CasePlanItemKind,
  CasePlanItemPriority,
  CasePlanItemStatus,
  CaseTimelineEntry,
  CaseTimelineEntryKind,
} from "@/domain/core/case-plan";
import type { AssignmentRole } from "@/domain/core/assignment";
import type { Perfil } from "@/domain/shared/work-context";
import type {
  AssignmentId,
  CasePlanItemId,
  CaseTimelineEntryId,
} from "@/domain/core/ids";
import type { IsoDate } from "@/domain/core/common";
import type {
  ChangeCasePlanItemStatusInput,
  CreateCasePlanItemInput,
  CreateCaseTimelineEntryInput,
  UpdateCasePlanItemInput,
  UpdateCaseTimelineEntryInput,
} from "@/domain/services/inputs";
import type { PermissionAction } from "@/domain/services/permissions";
import {
  ALL_PLAN_TIMELINE_ACTIONS,
  ASSIGNMENT_ROLE_LABELS_PT,
  buildChangeCasePlanItemStatusInput,
  buildCreateCasePlanItemInput,
  buildCreateCaseTimelineEntryInput,
  buildUpdateCasePlanItemInput,
  buildUpdateCaseTimelineEntryInput,
  CASE_PLAN_ITEM_KIND_LABELS_PT,
  CASE_PLAN_ITEM_PRIORITY_LABELS_PT,
  CASE_PLAN_ITEM_STATUS_LABELS_PT,
  CASE_TIMELINE_ENTRY_KIND_LABELS_PT,
  PROFESSIONAL_AREA_LABELS_PT,
  type AssignmentOption,
} from "@/features/processos/process-plan-model";

// ---- Records completos -----------------------------------------------------

const _kindMap: Record<CasePlanItemKind, string> = CASE_PLAN_ITEM_KIND_LABELS_PT;
const _statusMap: Record<CasePlanItemStatus, string> = CASE_PLAN_ITEM_STATUS_LABELS_PT;
const _priorityMap: Record<CasePlanItemPriority, string> = CASE_PLAN_ITEM_PRIORITY_LABELS_PT;
const _tlKindMap: Record<CaseTimelineEntryKind, string> = CASE_TIMELINE_ENTRY_KIND_LABELS_PT;
const _areaMap: Record<Perfil, string> = PROFESSIONAL_AREA_LABELS_PT;
const _roleMap: Record<AssignmentRole, string> = ASSIGNMENT_ROLE_LABELS_PT;

void _kindMap;
void _statusMap;
void _priorityMap;
void _tlKindMap;
void _areaMap;
void _roleMap;

// ---- Ações são todas oficiais ---------------------------------------------

const _actions: readonly PermissionAction[] = ALL_PLAN_TIMELINE_ACTIONS;
void _actions;

// ---- Options usam AssignmentId --------------------------------------------

declare const _asgId: AssignmentId;
const _opt: AssignmentOption = {
  assignmentId: _asgId,
  area: "psicologia",
  role: "lead_professional",
  status: "active",
  label: "x",
  availableForNewAssignments: true,
};
void _opt;

// ---- Retornos dos builders --------------------------------------------------

declare const _caseId: CreateCasePlanItemInput["caseId"];
declare const _tlCaseId: CreateCaseTimelineEntryInput["caseId"];
declare const _item: CasePlanItem;
declare const _entry: CaseTimelineEntry;

const _createOut = buildCreateCasePlanItemInput(
  _caseId,
  { kind: "activity", title: "t", description: "", priority: "normal", dueOn: "", assignmentId: "" },
  [],
);
if (_createOut.ok) {
  const _typed: CreateCasePlanItemInput = _createOut.input;
  void _typed;
}

const _updateOut = buildUpdateCasePlanItemInput(
  _item,
  { kind: _item.kind, title: "n", description: "", priority: _item.priority, dueOn: "", assignmentId: "" },
  [],
);
if (_updateOut.ok) {
  const _maybe: UpdateCasePlanItemInput | null = _updateOut.input;
  void _maybe;
}

const _statusOut: ChangeCasePlanItemStatusInput | null =
  buildChangeCasePlanItemStatusInput(_item, "in_progress");
void _statusOut;

const _tlCreateOut = buildCreateCaseTimelineEntryInput(_tlCaseId, {
  kind: "milestone", occurredOn: "2026-01-01", title: "t", description: "",
});
if (_tlCreateOut.ok) {
  const _typed2: CreateCaseTimelineEntryInput = _tlCreateOut.input;
  void _typed2;
}

const _tlUpdateOut = buildUpdateCaseTimelineEntryInput(_entry, {
  kind: _entry.kind, occurredOn: _entry.occurredOn, title: "novo", description: "",
});
if (_tlUpdateOut.ok) {
  const _maybe2: UpdateCaseTimelineEntryInput | null = _tlUpdateOut.input;
  void _maybe2;
}

// ---- IDs não intercambiáveis -----------------------------------------------

declare const _planId: CasePlanItemId;
declare const _tlId: CaseTimelineEntryId;
// @ts-expect-error CasePlanItemId não é AssignmentId
const _bad1: AssignmentId = _planId;
// @ts-expect-error CaseTimelineEntryId não é CasePlanItemId
const _bad2: CasePlanItemId = _tlId;
void _bad1;
void _bad2;

// ---- IsoDate não é string qualquer ----------------------------------------

// @ts-expect-error string comum não pode virar IsoDate
const _bad3: IsoDate = "hoje";
void _bad3;

// ---- Provas negativas de builders -----------------------------------------

// @ts-expect-error status inválido em ChangeStatus
buildChangeCasePlanItemStatusInput(_item, "unknown_status");

// @ts-expect-error prioridade inválida no form
buildCreateCasePlanItemInput(_caseId, {
  kind: "activity", title: "t", description: "", priority: "urgent",
  dueOn: "", assignmentId: "",
}, []);

// @ts-expect-error tipo inválido no plano
buildCreateCasePlanItemInput(_caseId, {
  kind: "todo", title: "t", description: "", priority: "normal",
  dueOn: "", assignmentId: "",
}, []);

// @ts-expect-error tipo inválido na cronologia
buildCreateCaseTimelineEntryInput(_tlCaseId, {
  kind: "reminder", occurredOn: "2026-01-01", title: "t", description: "",
});

// ---- DTOs de update proíbem campos ilegais --------------------------------

// Um UpdateCasePlanItemInput NÃO permite `id`, `organizationId`, `metadata`, `status`, `caseId`.
type _UpdCP = UpdateCasePlanItemInput;
type _AssertNoId = _UpdCP extends { id: unknown } ? never : true;
type _AssertNoOrg = _UpdCP extends { organizationId: unknown } ? never : true;
type _AssertNoMeta = _UpdCP extends { metadata: unknown } ? never : true;
type _AssertNoStatus = _UpdCP extends { status: unknown } ? never : true;
type _AssertNoCase = _UpdCP extends { caseId: unknown } ? never : true;
const _p1: _AssertNoId = true;
const _p2: _AssertNoOrg = true;
const _p3: _AssertNoMeta = true;
const _p4: _AssertNoStatus = true;
const _p5: _AssertNoCase = true;
void _p1; void _p2; void _p3; void _p4; void _p5;

type _UpdTL = UpdateCaseTimelineEntryInput;
type _AssertTLNoId = _UpdTL extends { id: unknown } ? never : true;
type _AssertTLNoMeta = _UpdTL extends { metadata: unknown } ? never : true;
const _p6: _AssertTLNoId = true;
const _p7: _AssertTLNoMeta = true;
void _p6; void _p7;

// expectedVersion é obrigatório em updates
type _Assert1 = UpdateCasePlanItemInput["expectedVersion"] extends number ? true : never;
type _Assert2 = UpdateCaseTimelineEntryInput["expectedVersion"] extends number ? true : never;
type _Assert3 = ChangeCasePlanItemStatusInput["expectedVersion"] extends number ? true : never;
const _e1: _Assert1 = true;
const _e2: _Assert2 = true;
const _e3: _Assert3 = true;
void _e1; void _e2; void _e3;
