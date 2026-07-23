/**
 * LV-08.5A.1 + LV-08.5A.2 — provas de tipo estritas para Plano e Cronologia.
 *
 * Sem casts (`as unknown`, `as any`, `as never`). Todas as rejeições esperadas
 * usam `@ts-expect-error` seguido de uma linha que violaria o contrato.
 */

import type {
  CasePlanItem,
  CaseTimelineEntry,
  CasePlanItemKind,
  CasePlanItemPriority,
  CasePlanItemStatus,
  CaseTimelineEntryKind,
} from "@/domain/core/case-plan";
import type {
  CreateCasePlanItemInput,
  UpdateCasePlanItemInput,
  ChangeCasePlanItemStatusInput,
  CreateCaseTimelineEntryInput,
  UpdateCaseTimelineEntryInput,
} from "@/domain/services/inputs";
import type {
  CaseId,
  CasePlanItemId,
  CaseTimelineEntryId,
  AssignmentId,
  OrganizationId,
} from "@/domain/core/ids";
import type { IsoDate, EntityMetadata } from "@/domain/core/common";
import type { CasePlanService } from "@/domain/services/case-plan-service";
import type { CaseTimelineService } from "@/domain/services/case-timeline-service";
import type { MockDomainServices } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import type { PageRequest, PageResult } from "@/domain/services/pagination";

declare const caseId: CaseId;
declare const orgId: OrganizationId;
declare const organizationId: OrganizationId;
declare const planItemId: CasePlanItemId;
declare const timelineEntryId: CaseTimelineEntryId;
declare const assignmentId: AssignmentId;
declare const iso: IsoDate;
declare const regularDateString: string;
declare const meta: EntityMetadata;

// ---------------------------------------------------------------------------
// Positivo: DTOs de criação mínimos e completos.
// ---------------------------------------------------------------------------

const _createPlanMinimal: CreateCasePlanItemInput = {
  caseId,
  kind: "activity",
  title: "T",
  priority: "normal",
};
void _createPlanMinimal;

const _createPlanFull: CreateCasePlanItemInput = {
  caseId,
  kind: "pending",
  title: "T",
  description: "D",
  priority: "high",
  dueOn: iso,
  assignmentId,
};
void _createPlanFull;

const _updatePlanMinimal: UpdateCasePlanItemInput = {
  planItemId,
  expectedVersion: 1,
};
void _updatePlanMinimal;

const _updatePlanNullables: UpdateCasePlanItemInput = {
  planItemId,
  description: null,
  dueOn: null,
  assignmentId: null,
  expectedVersion: 2,
};
void _updatePlanNullables;

const _changeStatusOk: ChangeCasePlanItemStatusInput = {
  planItemId,
  status: "in_progress",
  expectedVersion: 1,
};
void _changeStatusOk;

const _createTimelineOk: CreateCaseTimelineEntryInput = {
  caseId,
  kind: "milestone",
  occurredOn: iso,
  title: "T",
};
void _createTimelineOk;

const _updateTimelineNull: UpdateCaseTimelineEntryInput = {
  timelineEntryId,
  description: null,
  expectedVersion: 3,
};
void _updateTimelineNull;

// ---------------------------------------------------------------------------
// Provas negativas — CreateCasePlanItemInput.
// ---------------------------------------------------------------------------

// @ts-expect-error status é atribuído pelo serviço.
const _cp_status: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T", priority: "normal", status: "planned" };
void _cp_status;
// @ts-expect-error metadata não pode ser fornecida no DTO.
const _cp_meta: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T", priority: "normal", metadata: meta };
void _cp_meta;
// @ts-expect-error id é gerado pelo serviço.
const _cp_id: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T", priority: "normal", id: planItemId };
void _cp_id;
// @ts-expect-error organizationId vem do contexto.
const _cp_org: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T", priority: "normal", organizationId: orgId };
void _cp_org;
// @ts-expect-error caseId obrigatório.
const _cp_no_case: CreateCasePlanItemInput = { kind: "activity", title: "T", priority: "normal" };
void _cp_no_case;
// @ts-expect-error kind obrigatório.
const _cp_no_kind: CreateCasePlanItemInput = { caseId, title: "T", priority: "normal" };
void _cp_no_kind;
// @ts-expect-error priority obrigatório.
const _cp_no_prio: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T" };
void _cp_no_prio;
// @ts-expect-error priority inválido.
const _cp_bad_prio: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T", priority: "urgente" };
void _cp_bad_prio;

// @ts-expect-error CaseTimelineEntryId não é CaseId
const createPlanBadCase: CreateCasePlanItemInput = { caseId: timelineEntryId, kind: "activity", title: "T", priority: "normal" };
void createPlanBadCase;

// @ts-expect-error CasePlanItemId não é AssignmentId
const createPlanBadAssignment: CreateCasePlanItemInput = { caseId, kind: "activity", title: "T", priority: "normal", assignmentId: planItemId };
void createPlanBadAssignment;

// @ts-expect-error kind fora do catálogo (event).
const createPlanBadKindEvent: CreateCasePlanItemInput = { caseId, kind: "event", title: "T", priority: "normal" };
void createPlanBadKindEvent;

// ---------------------------------------------------------------------------
// Provas negativas — UpdateCasePlanItemInput.
// ---------------------------------------------------------------------------

// @ts-expect-error status muda apenas via changeStatus.
const _up_status: UpdateCasePlanItemInput = { planItemId, status: "completed", expectedVersion: 1 };
void _up_status;
// @ts-expect-error metadata proibida.
const _up_meta: UpdateCasePlanItemInput = { planItemId, expectedVersion: 1, metadata: meta };
void _up_meta;
// @ts-expect-error id proibido.
const _up_id: UpdateCasePlanItemInput = { planItemId, expectedVersion: 1, id: planItemId };
void _up_id;
// @ts-expect-error organizationId proibido.
const _up_org: UpdateCasePlanItemInput = { planItemId, expectedVersion: 1, organizationId: orgId };
void _up_org;
// @ts-expect-error caseId não pode migrar entre processos.
const _up_case: UpdateCasePlanItemInput = { planItemId, expectedVersion: 1, caseId };
void _up_case;
// @ts-expect-error expectedVersion obrigatório.
const _up_no_ver: UpdateCasePlanItemInput = { planItemId };
void _up_no_ver;
// @ts-expect-error planItemId obrigatório.
const _up_no_id: UpdateCasePlanItemInput = { expectedVersion: 1 };
void _up_no_id;
// @ts-expect-error kind fora do catálogo (event).
const _up_bad_kind_event: UpdateCasePlanItemInput = { planItemId, expectedVersion: 1, kind: "event" };
void _up_bad_kind_event;
// @ts-expect-error priority fora do catálogo (urgent).
const _up_bad_prio_urgent: UpdateCasePlanItemInput = { planItemId, expectedVersion: 1, priority: "urgent" };
void _up_bad_prio_urgent;

// ---------------------------------------------------------------------------
// Provas negativas — ChangeCasePlanItemStatusInput.
// ---------------------------------------------------------------------------

// @ts-expect-error title fora do escopo.
const _cs_title: ChangeCasePlanItemStatusInput = { planItemId, status: "planned", expectedVersion: 1, title: "T" };
void _cs_title;
// @ts-expect-error metadata proibida.
const _cs_meta: ChangeCasePlanItemStatusInput = { planItemId, status: "planned", expectedVersion: 1, metadata: meta };
void _cs_meta;
// @ts-expect-error expectedVersion obrigatório.
const _cs_no_ver: ChangeCasePlanItemStatusInput = { planItemId, status: "planned" };
void _cs_no_ver;
// @ts-expect-error caseId proibido em changeStatus.
const _cs_case: ChangeCasePlanItemStatusInput = { planItemId, status: "planned", expectedVersion: 1, caseId };
void _cs_case;
// @ts-expect-error organizationId proibido em changeStatus.
const _cs_org: ChangeCasePlanItemStatusInput = { planItemId, status: "planned", expectedVersion: 1, organizationId };
void _cs_org;
// @ts-expect-error planItemId obrigatório.
const _cs_no_id: ChangeCasePlanItemStatusInput = { status: "planned", expectedVersion: 1 };
void _cs_no_id;
// @ts-expect-error status fora do catálogo (done).
const _cs_bad_status: ChangeCasePlanItemStatusInput = { planItemId, status: "done", expectedVersion: 1 };
void _cs_bad_status;

// ---------------------------------------------------------------------------
// Provas negativas — CreateCaseTimelineEntryInput.
// ---------------------------------------------------------------------------

// @ts-expect-error id gerado pelo serviço.
const _ct_id: CreateCaseTimelineEntryInput = { caseId, kind: "note", occurredOn: iso, title: "T", id: timelineEntryId };
void _ct_id;
// @ts-expect-error metadata proibida.
const _ct_meta: CreateCaseTimelineEntryInput = { caseId, kind: "note", occurredOn: iso, title: "T", metadata: meta };
void _ct_meta;
// @ts-expect-error organizationId vem do contexto.
const _ct_org: CreateCaseTimelineEntryInput = { caseId, kind: "note", occurredOn: iso, title: "T", organizationId: orgId };
void _ct_org;
// @ts-expect-error occurredOn obrigatório.
const _ct_no_date: CreateCaseTimelineEntryInput = { caseId, kind: "note", title: "T" };
void _ct_no_date;
// @ts-expect-error kind inválido.
const _ct_bad_kind: CreateCaseTimelineEntryInput = { caseId, kind: "custom", occurredOn: iso, title: "T" };
void _ct_bad_kind;
// @ts-expect-error CasePlanItemId não é CaseId.
const _ct_bad_case: CreateCaseTimelineEntryInput = { caseId: planItemId, kind: "note", occurredOn: iso, title: "T" };
void _ct_bad_case;
// @ts-expect-error string comum não é IsoDate.
const _ct_bad_date: CreateCaseTimelineEntryInput = { caseId, kind: "note", occurredOn: regularDateString, title: "T" };
void _ct_bad_date;

// ---------------------------------------------------------------------------
// Provas negativas — UpdateCaseTimelineEntryInput.
// ---------------------------------------------------------------------------

// @ts-expect-error id proibido.
const _ut_id: UpdateCaseTimelineEntryInput = { timelineEntryId, expectedVersion: 1, id: timelineEntryId };
void _ut_id;
// @ts-expect-error metadata proibida.
const _ut_meta: UpdateCaseTimelineEntryInput = { timelineEntryId, expectedVersion: 1, metadata: meta };
void _ut_meta;
// @ts-expect-error caseId proibido em update.
const _ut_case: UpdateCaseTimelineEntryInput = { timelineEntryId, expectedVersion: 1, caseId };
void _ut_case;
// @ts-expect-error expectedVersion obrigatório.
const _ut_no_ver: UpdateCaseTimelineEntryInput = { timelineEntryId };
void _ut_no_ver;
// @ts-expect-error timelineEntryId obrigatório.
const _ut_no_id: UpdateCaseTimelineEntryInput = { expectedVersion: 1 };
void _ut_no_id;
// @ts-expect-error organizationId proibido em update.
const _ut_org: UpdateCaseTimelineEntryInput = { timelineEntryId, expectedVersion: 1, organizationId };
void _ut_org;
// @ts-expect-error kind fora do catálogo (event).
const _ut_bad_kind: UpdateCaseTimelineEntryInput = { timelineEntryId, expectedVersion: 1, kind: "event" };
void _ut_bad_kind;

// ---------------------------------------------------------------------------
// IDs branded não são intercambiáveis.
// ---------------------------------------------------------------------------

// @ts-expect-error timelineEntryId não é CasePlanItemId.
const _mixA: CasePlanItemId = timelineEntryId;
void _mixA;
// @ts-expect-error planItemId não é CaseTimelineEntryId.
const _mixB: CaseTimelineEntryId = planItemId;
void _mixB;
// @ts-expect-error caseId não pode virar CasePlanItemId.
const _mixC: CasePlanItemId = caseId;
void _mixC;

// @ts-expect-error AssignmentId não é CasePlanItemId
const invalidPlanFromAssignment: CasePlanItemId = assignmentId;
void invalidPlanFromAssignment;

// @ts-expect-error OrganizationId não é CasePlanItemId
const invalidPlanFromOrganization: CasePlanItemId = organizationId;
void invalidPlanFromOrganization;

// @ts-expect-error OrganizationId não é CaseTimelineEntryId
const invalidTimelineFromOrganization: CaseTimelineEntryId = organizationId;
void invalidTimelineFromOrganization;

// @ts-expect-error CasePlanItemId não é AssignmentId
const invalidAssignmentFromPlan: AssignmentId = planItemId;
void invalidAssignmentFromPlan;

// ---------------------------------------------------------------------------
// Catálogos oficiais como uniões literais.
// ---------------------------------------------------------------------------

const _kind: CasePlanItemKind = "activity";
void _kind;
// @ts-expect-error valor fora do catálogo.
const _kindBad: CasePlanItemKind = "atividade";
void _kindBad;

const _prio: CasePlanItemPriority = "high";
void _prio;
// @ts-expect-error valor fora do catálogo.
const _prioBad: CasePlanItemPriority = "urgent";
void _prioBad;

const _stat: CasePlanItemStatus = "in_progress";
void _stat;
// @ts-expect-error valor fora do catálogo.
const _statBad: CasePlanItemStatus = "doing";
void _statBad;

const _tlKind: CaseTimelineEntryKind = "milestone";
void _tlKind;
// @ts-expect-error valor fora do catálogo.
const _tlKindBad: CaseTimelineEntryKind = "hito";
void _tlKindBad;

// ---------------------------------------------------------------------------
// Entidades continuam com metadata obrigatória.
// ---------------------------------------------------------------------------

declare const planItem: CasePlanItem;
declare const timelineEntry: CaseTimelineEntry;
const _planMeta: EntityMetadata = planItem.metadata;
const _tlMeta: EntityMetadata = timelineEntry.metadata;
void _planMeta;
void _tlMeta;

// ---------------------------------------------------------------------------
// LV-08.5A.2 — contratos oficiais dos serviços.
// ---------------------------------------------------------------------------

declare const services: MockDomainServices;

const planServiceContract: CasePlanService = services.casePlan;
const timelineServiceContract: CaseTimelineService = services.caseTimeline;
void planServiceContract;
void timelineServiceContract;

declare const ctx: ServiceContext;
declare const page: PageRequest;

// Retornos dos métodos principais (sem chamar código).
type PlanGet = ReturnType<CasePlanService["getById"]>;
type PlanList = ReturnType<CasePlanService["listByCase"]>;
type PlanCreate = ReturnType<CasePlanService["create"]>;
type PlanUpdate = ReturnType<CasePlanService["update"]>;
type PlanStatus = ReturnType<CasePlanService["changeStatus"]>;
type PlanRemove = ReturnType<CasePlanService["remove"]>;

const _planGet: PlanGet = services.casePlan.getById(ctx, caseId, planItemId);
const _planList: PlanList = services.casePlan.listByCase(ctx, caseId, page);
const _planCreate: PlanCreate = services.casePlan.create(ctx, _createPlanMinimal);
const _planUpdate: PlanUpdate = services.casePlan.update(ctx, caseId, _updatePlanMinimal);
const _planStatus: PlanStatus = services.casePlan.changeStatus(ctx, caseId, _changeStatusOk);
const _planRemove: PlanRemove = services.casePlan.remove(ctx, caseId, planItemId, 1);
void _planGet;
void _planList;
void _planCreate;
void _planUpdate;
void _planStatus;
void _planRemove;

const _planGetShape: Promise<ServiceResult<CasePlanItem>> = _planGet;
const _planListShape: Promise<ServiceResult<PageResult<CasePlanItem>>> = _planList;
const _planCreateShape: Promise<ServiceResult<CasePlanItem>> = _planCreate;
const _planUpdateShape: Promise<ServiceResult<CasePlanItem>> = _planUpdate;
const _planStatusShape: Promise<ServiceResult<CasePlanItem>> = _planStatus;
const _planRemoveShape: Promise<ServiceResult<void>> = _planRemove;
void _planGetShape;
void _planListShape;
void _planCreateShape;
void _planUpdateShape;
void _planStatusShape;
void _planRemoveShape;

type TimelineGet = ReturnType<CaseTimelineService["getById"]>;
type TimelineList = ReturnType<CaseTimelineService["listByCase"]>;
type TimelineCreate = ReturnType<CaseTimelineService["create"]>;
type TimelineUpdate = ReturnType<CaseTimelineService["update"]>;
type TimelineRemove = ReturnType<CaseTimelineService["remove"]>;

const _tlGet: TimelineGet = services.caseTimeline.getById(ctx, caseId, timelineEntryId);
const _tlList: TimelineList = services.caseTimeline.listByCase(ctx, caseId, page);
const _tlCreate: TimelineCreate = services.caseTimeline.create(ctx, _createTimelineOk);
const _tlUpdate: TimelineUpdate = services.caseTimeline.update(ctx, caseId, _updateTimelineNull);
const _tlRemove: TimelineRemove = services.caseTimeline.remove(ctx, caseId, timelineEntryId, 1);
void _tlGet;
void _tlList;
void _tlCreate;
void _tlUpdate;
void _tlRemove;

const _tlGetShape: Promise<ServiceResult<CaseTimelineEntry>> = _tlGet;
const _tlListShape: Promise<ServiceResult<PageResult<CaseTimelineEntry>>> = _tlList;
const _tlCreateShape: Promise<ServiceResult<CaseTimelineEntry>> = _tlCreate;
const _tlUpdateShape: Promise<ServiceResult<CaseTimelineEntry>> = _tlUpdate;
const _tlRemoveShape: Promise<ServiceResult<void>> = _tlRemove;
void _tlGetShape;
void _tlListShape;
void _tlCreateShape;
void _tlUpdateShape;
void _tlRemoveShape;
