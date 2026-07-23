/**
 * LV-08.6B.1 — provas de tipo. Nunca importadas em runtime, existem apenas
 * para forçar o compilador a validar contratos.
 *
 * Não usa `as any`, `as never` ou `as unknown as`.
 */

import type { Case } from "@/domain/core/case";
import type {
  AuditEventId,
  CaseId,
  CaseSnapshotId,
} from "@/domain/core/ids";
import type {
  AuditAction,
  AuditEvent,
  CaseSnapshot,
} from "@/domain/core/case-audit";
import type { AuditEventListOptions } from "@/domain/services/audit-service";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";
import type { IsoDateTime } from "@/domain/core/common";
import type {
  AuditCategory,
  AuditSnapshotPermissions,
  AuditSnapshotPublicError,
  ProcessAuditSnapshotState,
} from "@/features/processos/process-audit-snapshot-model";
import {
  AUDIT_ACTION_LABELS_PT,
  AUDIT_ACTION_TO_CATEGORY,
  AUDIT_CATEGORY_LABELS_PT,
  buildAuditFilter,
  buildCreateCaseSnapshotInput,
  isAuditCategory,
} from "@/features/processos/process-audit-snapshot-model";
import type { ProcessAuditSnapshotsProps } from "@/features/processos/ProcessAuditSnapshots";
import type { ProcessSnapshotsCardProps } from "@/features/processos/ProcessSnapshotsCard";

// ---- Mapas de rótulos: Record completo -----------------------------------

type ExpectRecordAction<T> = T extends Readonly<Record<AuditAction, string>>
  ? true
  : false;

type ExpectRecordCategory<T> = T extends Readonly<Record<AuditCategory, string>>
  ? true
  : false;

type ExpectRecordActionToCategory<T> = T extends Readonly<
  Record<AuditAction, AuditCategory>
>
  ? true
  : false;

const _labelsAreCompleteAction: ExpectRecordAction<
  typeof AUDIT_ACTION_LABELS_PT
> = true;
const _categoryLabelsCompleteRecord: ExpectRecordCategory<
  typeof AUDIT_CATEGORY_LABELS_PT
> = true;
const _actionToCategoryCompleteRecord: ExpectRecordActionToCategory<
  typeof AUDIT_ACTION_TO_CATEGORY
> = true;

void _labelsAreCompleteAction;
void _categoryLabelsCompleteRecord;
void _actionToCategoryCompleteRecord;

// isAuditCategory refina string
declare const anyString: string;
if (isAuditCategory(anyString)) {
  const _c: AuditCategory = anyString;
  void _c;
}

// string arbitrária não é AuditCategory
type NotCategory = "definitivamente-nao-existe" extends AuditCategory
  ? false
  : true;
const _stringIsNotCategory: NotCategory = true;
void _stringIsNotCategory;

// ---- Builder e filtros ---------------------------------------------------

declare const caseIdSample: CaseId;
const _builtInput = buildCreateCaseSnapshotInput(caseIdSample, {
  label: "x",
  reason: "y",
});
if (_builtInput.ok) {
  const _ci: CreateCaseSnapshotInput = _builtInput.input;
  void _ci;
}

// CreateCaseSnapshotInput não aceita payload
type NoPayload = "payload" extends keyof CreateCaseSnapshotInput ? false : true;
const _noPayload: NoPayload = true;
void _noPayload;

// CreateCaseSnapshotInput não aceita metadata
type NoMetadata = "metadata" extends keyof CreateCaseSnapshotInput
  ? false
  : true;
const _noMetadata: NoMetadata = true;
void _noMetadata;

// AuditEventListOptions usa AuditAction oficial
declare const opts: AuditEventListOptions;
type ActionsElem = NonNullable<typeof opts.actions>[number];
const _actionsElemIsAction: ActionsElem extends AuditAction ? true : false = true;
void _actionsElemIsAction;

// occurredFrom / occurredTo são IsoDateTime
type FromIsIso = NonNullable<typeof opts.occurredFrom> extends IsoDateTime
  ? true
  : false;
type ToIsIso = NonNullable<typeof opts.occurredTo> extends IsoDateTime
  ? true
  : false;
const _fromIsIso: FromIsIso = true;
const _toIsIso: ToIsIso = true;
void _fromIsIso;
void _toIsIso;

// string comum não é IsoDateTime
type StringNotIso = string extends IsoDateTime ? false : true;
const _stringNotIso: StringNotIso = true;
void _stringNotIso;

// page.limit é number
type LimitIsNumber = NonNullable<typeof opts.page>["limit"] extends number
  ? true
  : false;
const _limitIsNumber: LimitIsNumber = true;
void _limitIsNumber;

// buildAuditFilter retorna options tipadas
declare const filterValues: {
  category: AuditCategory | "";
  dateFrom: string;
  dateTo: string;
};
const _filterResult = buildAuditFilter(filterValues);
if (_filterResult.ok) {
  const _o: AuditEventListOptions = _filterResult.options;
  void _o;
}

// ---- IDs ------------------------------------------------------------------

type SnapshotIdNotAudit = CaseSnapshotId extends AuditEventId ? false : true;
type AuditIdNotSnapshot = AuditEventId extends CaseSnapshotId ? false : true;
type CaseIdNotSnapshot = CaseId extends CaseSnapshotId ? false : true;
const _snapshotIdNotAudit: SnapshotIdNotAudit = true;
const _auditIdNotSnapshot: AuditIdNotSnapshot = true;
const _caseIdNotSnapshot: CaseIdNotSnapshot = true;
void _snapshotIdNotAudit;
void _auditIdNotSnapshot;
void _caseIdNotSnapshot;

// ---- Estado discriminado --------------------------------------------------

declare const st: ProcessAuditSnapshotState;
if (st.kind === "ready") {
  const _e: readonly AuditEvent[] = st.events;
  const _s: readonly CaseSnapshot[] = st.snapshots;
  const _p: AuditSnapshotPermissions = st.permissions;
  const _r: boolean = st.refreshing;
  const _f: boolean = st.filtered;
  void _e;
  void _s;
  void _p;
  void _r;
  void _f;
}
if (st.kind === "error") {
  const _err: AuditSnapshotPublicError = st.error;
  void _err;
}

// loading não aceita events
type LoadingHasEvents = Extract<
  ProcessAuditSnapshotState,
  { kind: "loading" }
> extends { events: unknown }
  ? false
  : true;
const _loadingHasNoEvents: LoadingHasEvents = true;
void _loadingHasNoEvents;

// error exige AuditSnapshotPublicError
type ErrorArm = Extract<ProcessAuditSnapshotState, { kind: "error" }>;
const _errArmHasError: ErrorArm["error"] extends AuditSnapshotPublicError
  ? true
  : false = true;
void _errArmHasError;

// ready exige refreshing/filtered/permissões
type ReadyArm = Extract<ProcessAuditSnapshotState, { kind: "ready" }>;
const _readyHasRefreshing: ReadyArm["refreshing"] extends boolean
  ? true
  : false = true;
const _readyHasFiltered: ReadyArm["filtered"] extends boolean ? true : false = true;
const _readyHasPerms: ReadyArm["permissions"] extends AuditSnapshotPermissions
  ? true
  : false = true;
void _readyHasRefreshing;
void _readyHasFiltered;
void _readyHasPerms;

// ---- Componente -----------------------------------------------------------

type PropsHasCase = ProcessAuditSnapshotsProps["case"] extends Case
  ? true
  : false;
const _propsHasCase: PropsHasCase = true;
void _propsHasCase;

// Rejeita props com apenas CaseId (chave 'caseId' inexistente)
type PropsHasCaseId = "caseId" extends keyof ProcessAuditSnapshotsProps
  ? false
  : true;
const _propsHasNoCaseId: PropsHasCaseId = true;
void _propsHasNoCaseId;

// Callback de visualização usa CaseSnapshotId
declare const cardProps: ProcessSnapshotsCardProps;
type OnViewArg = Parameters<typeof cardProps.onViewSnapshot>[0];
const _onViewIsSnapshotId: OnViewArg extends CaseSnapshotId ? true : false = true;
const _snapshotIdIsOnView: CaseSnapshotId extends OnViewArg ? true : false = true;
void _onViewIsSnapshotId;
void _snapshotIdIsOnView;

// ---- Permissões -----------------------------------------------------------

const _perms: AuditSnapshotPermissions = {
  canReadAudit: true,
  canReadSnapshots: false,
  canCreateSnapshot: false,
};
void _perms;

// União exata de AuditSnapshotAction ---------------------------------------

import {
  AUDIT_SNAPSHOT_ACTIONS,
  type AuditSnapshotAction,
} from "@/features/processos/process-audit-snapshot-model";

type ExpectedAuditSnapshotAction =
  | "auditEvent.read"
  | "caseSnapshot.read"
  | "caseSnapshot.create";

const _asaExtendsExpected: AuditSnapshotAction extends ExpectedAuditSnapshotAction
  ? true
  : false = true;
const _expectedExtendsAsa: ExpectedAuditSnapshotAction extends AuditSnapshotAction
  ? true
  : false = true;
void _asaExtendsExpected;
void _expectedExtendsAsa;

type ArrayElem = (typeof AUDIT_SNAPSHOT_ACTIONS)[number];
const _arrayElemIsAsa: ArrayElem extends AuditSnapshotAction ? true : false = true;
const _asaIsArrayElem: AuditSnapshotAction extends ArrayElem ? true : false = true;
void _arrayElemIsAsa;
void _asaIsArrayElem;

// Provas negativas ---------------------------------------------------------

// @ts-expect-error "case.update" não é AuditSnapshotAction
const _notCaseUpdate: AuditSnapshotAction = "case.update";
// @ts-expect-error "caseSnapshot.remove" não é AuditSnapshotAction
const _notSnapRemove: AuditSnapshotAction = "caseSnapshot.remove";
// @ts-expect-error "auditEvent.create" não é AuditSnapshotAction
const _notAuditCreate: AuditSnapshotAction = "auditEvent.create";
void _notCaseUpdate;
void _notSnapRemove;
void _notAuditCreate;

