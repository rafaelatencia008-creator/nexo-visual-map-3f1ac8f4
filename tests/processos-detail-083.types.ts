/**
 * LV-08.3 — provas de tipo estáticas do modelo de detalhe/checklist.
 * Se algum contrato deste arquivo mudar, o typecheck falha.
 */

import type {
  CaseChecklistFormValues,
  CaseChecklistUpdateInput,
  CaseDetailErrorKind,
  CaseDetailPublicError,
  CaseReadinessProgress,
} from "../src/features/processos/process-detail-model";
import type {
  ConflictCheckStatus,
  DeadlineStatus,
} from "../src/domain/core/case";

// Helper — falha em compilação se X !== Y.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// Form values têm exatamente três campos, todos requeridos.
type _FormShape = Expect<
  Equal<
    CaseChecklistFormValues,
    Readonly<{
      objectDefined: boolean;
      deadlineStatus: DeadlineStatus;
      conflictCheck: ConflictCheckStatus;
    }>
  >
>;

// Update input traz sempre expectedVersion; demais campos são opcionais.
type _UpdateShape = Expect<
  Equal<
    CaseChecklistUpdateInput,
    Readonly<{
      objectDefined?: boolean;
      deadlineStatus?: DeadlineStatus;
      conflictCheck?: ConflictCheckStatus;
      expectedVersion: number;
    }>
  >
>;

// Progresso do checklist é somente-leitura.
type _ProgressShape = Expect<
  Equal<
    CaseReadinessProgress,
    Readonly<{
      complete: number;
      total: number;
      pending: number;
      isReady: boolean;
    }>
  >
>;

// União fechada de kinds de erro público.
type _ErrorKinds = Expect<
  Equal<
    CaseDetailErrorKind,
    | "not_found"
    | "conflict"
    | "unauthorized"
    | "forbidden"
    | "offline"
    | "unavailable"
    | "validation"
    | "generic"
  >
>;

type _PublicErrorShape = Expect<
  Equal<CaseDetailPublicError, Readonly<{ kind: CaseDetailErrorKind; message: string }>>
>;

// ------------------------------------------------------------------
// LV-08.3.1 — provas adicionais
// ------------------------------------------------------------------

import type { UpdateCaseInput } from "../src/domain/services/inputs";
import type { CaseReadinessView } from "../src/domain/services/case-service";
import { isCaseId } from "../src/domain/core/ids";
import type { CaseId } from "../src/domain/core/ids";

// CaseChecklistUpdateInput deve ser atribuível a UpdateCaseInput.
declare const _checklistInput: CaseChecklistUpdateInput;
const _assignable: UpdateCaseInput = _checklistInput;
void _assignable;

// CaseReadinessView.issues é readonly.
type _IssuesReadonly = Expect<
  Equal<CaseReadinessView["issues"], Readonly<CaseReadinessView["issues"]>>
>;

// isCaseId é um type guard que estreita para CaseId.
declare const _unknown: unknown;
if (isCaseId(_unknown)) {
  const _id: CaseId = _unknown;
  void _id;
}

// @ts-expect-error — checklist não aceita `reference`.
const _rej1: CaseChecklistUpdateInput = { expectedVersion: 1, reference: "x" };
// @ts-expect-error — checklist não aceita `title`.
const _rej2: CaseChecklistUpdateInput = { expectedVersion: 1, title: "x" };
// @ts-expect-error — checklist não aceita `status`.
const _rej3: CaseChecklistUpdateInput = { expectedVersion: 1, status: "active" };
// @ts-expect-error — checklist não aceita `confidentiality`.
const _rej4: CaseChecklistUpdateInput = { expectedVersion: 1, confidentiality: "standard" };
// @ts-expect-error — checklist não aceita `id`.
const _rej5: CaseChecklistUpdateInput = { expectedVersion: 1, id: "x" };
// @ts-expect-error — checklist não aceita `organizationId`.
const _rej6: CaseChecklistUpdateInput = { expectedVersion: 1, organizationId: "x" };
// @ts-expect-error — checklist não aceita `metadata`.
const _rej7: CaseChecklistUpdateInput = { expectedVersion: 1, metadata: {} };
// @ts-expect-error — deadlineStatus não aceita "pending".
const _rej8: CaseChecklistUpdateInput = { expectedVersion: 1, deadlineStatus: "pending" };
// @ts-expect-error — conflictCheck não aceita "unknown".
const _rej9: CaseChecklistUpdateInput = { expectedVersion: 1, conflictCheck: "unknown" };

type __use_IssuesReadonly = _IssuesReadonly;
type __use_FormShape = _FormShape;
type __use_UpdateShape = _UpdateShape;
type __use_ProgressShape = _ProgressShape;
type __use_ErrorKinds = _ErrorKinds;
type __use_PublicErrorShape = _PublicErrorShape;
export type {
  __use_IssuesReadonly,
  __use_FormShape,
  __use_UpdateShape,
  __use_ProgressShape,
  __use_ErrorKinds,
  __use_PublicErrorShape,
};
void _rej1;
void _rej2;
void _rej3;
void _rej4;
void _rej5;
void _rej6;
void _rej7;
void _rej8;
void _rej9;

