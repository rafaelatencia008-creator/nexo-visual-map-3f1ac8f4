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
