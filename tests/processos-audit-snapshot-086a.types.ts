/**
 * LV-08.6A / LV-08.6A.2 — provas de tipo estritas para Auditoria e Snapshot.
 *
 * Nenhum `as any`, `as never` ou `as unknown as` neste arquivo.
 */

import type {
  AuditEvent,
  AuditAction,
  AuditTargetType,
  CaseSnapshot,
  CaseSnapshotPayload,
} from "@/domain/core/case-audit";
import type {
  AuditEventId,
  CaseSnapshotId,
  CaseId,
  CasePlanItemId,
  OrganizationId,
  UserId,
  MembershipId,
} from "@/domain/core/ids";
import type { EntityMetadata, IsoDateTime } from "@/domain/core/common";
import type {
  AuditEventService,
  AuditEventListOptions,
} from "@/domain/services/audit-service";
import type { CaseSnapshotService } from "@/domain/services/case-snapshot-service";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";
import type {
  MockDomainServices,
  MockDomainSnapshot,
} from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import type { PageResult } from "@/domain/services/pagination";

declare const caseId: CaseId;
declare const organizationId: OrganizationId;
declare const userId: UserId;
declare const membershipId: MembershipId;
declare const auditEventId: AuditEventId;
declare const caseSnapshotId: CaseSnapshotId;
declare const planItemId: CasePlanItemId;
declare const meta: EntityMetadata;
declare const services: MockDomainServices;
declare const ctx: ServiceContext;
declare const isoDateTime: IsoDateTime;

// ---- IDs branded não intercambiáveis --------------------------------------

// @ts-expect-error AuditEventId não é CaseSnapshotId.
const _idA: CaseSnapshotId = auditEventId;
void _idA;
// @ts-expect-error CaseSnapshotId não é AuditEventId.
const _idB: AuditEventId = caseSnapshotId;
void _idB;
// @ts-expect-error CasePlanItemId não é AuditEventId.
const _idC: AuditEventId = planItemId;
void _idC;
// @ts-expect-error AuditEventId não é CaseId.
const _idD: CaseId = auditEventId;
void _idD;
// @ts-expect-error CaseSnapshotId não é CaseId.
const _idE: CaseId = caseSnapshotId;
void _idE;
// @ts-expect-error CaseId não é AuditEventId.
const _idF: AuditEventId = caseId;
void _idF;
// @ts-expect-error CaseId não é CaseSnapshotId.
const _idG: CaseSnapshotId = caseId;
void _idG;

// ---- Catálogos ------------------------------------------------------------

const _act: AuditAction = "case.created";
void _act;
// @ts-expect-error valor fora do catálogo.
const _actBad: AuditAction = "case.deleted";
void _actBad;

const _tt: AuditTargetType = "case";
void _tt;
// @ts-expect-error valor fora do catálogo.
const _ttBad: AuditTargetType = "user";
void _ttBad;

// ---- CreateCaseSnapshotInput ----------------------------------------------

const _minimal: CreateCaseSnapshotInput = { caseId, label: "L" };
void _minimal;

const _full: CreateCaseSnapshotInput = {
  caseId,
  label: "L",
  reason: "porque sim",
};
void _full;

// @ts-expect-error id proibido no DTO.
const _snap_id: CreateCaseSnapshotInput = { caseId, label: "L", id: caseSnapshotId };
void _snap_id;
// @ts-expect-error organizationId vem do contexto.
const _snap_org: CreateCaseSnapshotInput = { caseId, label: "L", organizationId };
void _snap_org;
// @ts-expect-error metadata proibida.
const _snap_meta: CreateCaseSnapshotInput = { caseId, label: "L", metadata: meta };
void _snap_meta;
// @ts-expect-error createdAt proibido.
const _snap_createdAt: CreateCaseSnapshotInput = { caseId, label: "L", createdAt: isoDateTime };
void _snap_createdAt;
// @ts-expect-error createdByUserId proibido.
const _snap_cbUser: CreateCaseSnapshotInput = { caseId, label: "L", createdByUserId: userId };
void _snap_cbUser;
// @ts-expect-error createdByMembershipId proibido.
const _snap_cbMem: CreateCaseSnapshotInput = {
  caseId,
  label: "L",
  createdByMembershipId: membershipId,
};
void _snap_cbMem;
// @ts-expect-error caseId obrigatório.
const _snap_no_case: CreateCaseSnapshotInput = { label: "L" };
void _snap_no_case;
// @ts-expect-error label obrigatório.
const _snap_no_label: CreateCaseSnapshotInput = { caseId };
void _snap_no_label;
// @ts-expect-error CasePlanItemId não é CaseId.
const _snap_bad_case: CreateCaseSnapshotInput = { caseId: planItemId, label: "L" };
void _snap_bad_case;
const _snap_payload: CreateCaseSnapshotInput = {
  caseId,
  label: "L",
  // @ts-expect-error payload é montado pelo serviço, nunca vem do input.
  payload: {},
};
void _snap_payload;

// ---- Entidades expõem metadata e são readonly ------------------------------

declare const evt: AuditEvent;
declare const snap: CaseSnapshot;

const _em: EntityMetadata = evt.metadata;
const _sm: EntityMetadata = snap.metadata;
void _em;
void _sm;

// Imutabilidade estrutural do CaseSnapshot.
// @ts-expect-error snap.id é readonly.
snap.id = caseSnapshotId;
// @ts-expect-error snap.label é readonly.
snap.label = "outra";
// @ts-expect-error snap.payload é readonly.
snap.payload = snap.payload;

// Imutabilidade estrutural do AuditEvent.
// @ts-expect-error evt.id é readonly.
evt.id = auditEventId;
// @ts-expect-error evt.summary é readonly.
evt.summary = "x";
// @ts-expect-error evt.action é readonly.
evt.action = "case.created";

// Imutabilidade estrutural do payload: arrays são readonly, sem push.
declare const payload: CaseSnapshotPayload;
// @ts-expect-error casePersons é readonly, push não existe.
payload.casePersons.push(payload.casePersons[0]!);
// @ts-expect-error persons é readonly, push não existe.
payload.persons.push(payload.persons[0]!);
// @ts-expect-error relationships é readonly, push não existe.
payload.relationships.push(payload.relationships[0]!);
// @ts-expect-error assignments é readonly, push não existe.
payload.assignments.push(payload.assignments[0]!);
// @ts-expect-error casePlanItems é readonly, push não existe.
payload.casePlanItems.push(payload.casePlanItems[0]!);
// @ts-expect-error caseTimelineEntries é readonly, push não existe.
payload.caseTimelineEntries.push(payload.caseTimelineEntries[0]!);

// ---- Filtros AuditEventListOptions ----------------------------------------

const _optActionsOk: AuditEventListOptions = {
  actions: ["case.created", "caseSnapshot.created"],
};
void _optActionsOk;
const _optTargetsOk: AuditEventListOptions = {
  targetTypes: ["case", "caseSnapshot"],
};
void _optTargetsOk;
const _optDatesOk: AuditEventListOptions = {
  occurredFrom: isoDateTime,
  occurredTo: isoDateTime,
};
void _optDatesOk;

const _optBadAction: AuditEventListOptions = {
  // @ts-expect-error action fora do catálogo.
  actions: ["case.deleted"],
};
void _optBadAction;
const _optBadTarget: AuditEventListOptions = {
  // @ts-expect-error targetType fora do catálogo.
  targetTypes: ["user"],
};
void _optBadTarget;
const _optBadFrom: AuditEventListOptions = {
  // @ts-expect-error string comum não é IsoDateTime branded.
  occurredFrom: "2026-01-01",
};
void _optBadFrom;
const _optBadTo: AuditEventListOptions = {
  // @ts-expect-error string comum não é IsoDateTime branded.
  occurredTo: "hoje",
};
void _optBadTo;

// ---- Contratos dos serviços -----------------------------------------------

const auditEvents: AuditEventService = services.auditEvents;
const caseSnapshots: CaseSnapshotService = services.caseSnapshots;
void auditEvents;
void caseSnapshots;

// AuditEventService é somente-leitura: não há create/update/remove.
// @ts-expect-error create não pertence ao AuditEventService.
services.auditEvents.create;
// @ts-expect-error update não pertence ao AuditEventService.
services.auditEvents.update;
// @ts-expect-error remove não pertence ao AuditEventService.
services.auditEvents.remove;

// CaseSnapshotService: sem update/remove.
// @ts-expect-error update não pertence ao CaseSnapshotService.
services.caseSnapshots.update;
// @ts-expect-error remove não pertence ao CaseSnapshotService.
services.caseSnapshots.remove;

// Retornos assinados.
const _list: Promise<ServiceResult<PageResult<AuditEvent>>> =
  services.auditEvents.listByCase(ctx, caseId);
const _get: Promise<ServiceResult<CaseSnapshot>> =
  services.caseSnapshots.getById(ctx, caseId, caseSnapshotId);
const _createSnap: Promise<ServiceResult<CaseSnapshot>> =
  services.caseSnapshots.create(ctx, _minimal);
const _listSnap: Promise<ServiceResult<PageResult<CaseSnapshot>>> =
  services.caseSnapshots.listByCase(ctx, caseId);
void _list;
void _get;
void _createSnap;
void _listSnap;

// ---- MockDomainSnapshot expõe auditEvents e caseSnapshots -----------------

declare const technicalSnapshot: MockDomainSnapshot;
const technicalAuditEvents: readonly AuditEvent[] = technicalSnapshot.auditEvents;
const technicalCaseSnapshots: readonly CaseSnapshot[] = technicalSnapshot.caseSnapshots;
void technicalAuditEvents;
void technicalCaseSnapshots;
