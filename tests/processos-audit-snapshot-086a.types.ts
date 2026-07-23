/**
 * LV-08.6A — provas de tipo estritas para Auditoria e Snapshot.
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
} from "@/domain/core/ids";
import type { EntityMetadata } from "@/domain/core/common";
import type { AuditEventService } from "@/domain/services/audit-service";
import type { CaseSnapshotService } from "@/domain/services/case-snapshot-service";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";
import type { MockDomainServices } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import type { PageResult } from "@/domain/services/pagination";

declare const caseId: CaseId;
declare const organizationId: OrganizationId;
declare const auditEventId: AuditEventId;
declare const caseSnapshotId: CaseSnapshotId;
declare const planItemId: CasePlanItemId;
declare const meta: EntityMetadata;
declare const services: MockDomainServices;
declare const ctx: ServiceContext;

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
// @ts-expect-error caseId obrigatório.
const _snap_no_case: CreateCaseSnapshotInput = { label: "L" };
void _snap_no_case;
// @ts-expect-error label obrigatório.
const _snap_no_label: CreateCaseSnapshotInput = { caseId };
void _snap_no_label;
// @ts-expect-error CasePlanItemId não é CaseId.
const _snap_bad_case: CreateCaseSnapshotInput = { caseId: planItemId, label: "L" };
void _snap_bad_case;
// @ts-expect-error payload é montado pelo serviço, nunca vem do input.
const _snap_payload: CreateCaseSnapshotInput = {
  caseId,
  label: "L",
  payload: {},
};
void _snap_payload;

// ---- Entidades expõem metadata --------------------------------------------

declare const evt: AuditEvent;
declare const snap: CaseSnapshot;

const _em: EntityMetadata = evt.metadata;
const _sm: EntityMetadata = snap.metadata;
void _em;
void _sm;

// ---- Contratos dos serviços -----------------------------------------------

const auditService: AuditEventService = services.auditEvents;
const snapshotService: CaseSnapshotService = services.caseSnapshots;
void auditService;
void snapshotService;

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
