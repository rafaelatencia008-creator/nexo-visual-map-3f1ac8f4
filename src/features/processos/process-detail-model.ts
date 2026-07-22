/**
 * LV-08.3 — modelo funcional puro do resumo e checklist de Processo.
 *
 * Somente TypeScript. Nenhum React, storage ou rede. Concentra rótulos,
 * cálculo de progresso, conversão para valores do formulário, construção
 * do input restrito e mapeamento público de erros de serviço.
 */

import type { Case, ConfidentialityLevel, ConflictCheckStatus, DeadlineStatus } from "@/domain/core/case";
import {
  CASE_READINESS_ISSUES,
  type CaseReadinessIssue,
  type CaseReadinessView,
} from "@/domain/services/case-service";
import type { UpdateCaseInput } from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";
import {
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
} from "@/features/processos/process-list-model";

// ---- Reexports úteis (evita imports duplicados em componentes) ------------

export { CASE_STATUS_LABELS_PT, CONFIDENTIALITY_LABELS_PT };
export type { ConfidentialityLevel };

// ---- Rótulos oficiais do checklist ----------------------------------------

export const CASE_READINESS_LABELS_PT: Readonly<Record<CaseReadinessIssue, string>> = {
  professionalRoleDefined: "Responsável profissional definido",
  objectDefined: "Objeto do trabalho definido",
  deadlineReviewed: "Prazo revisado",
  confidentialityReviewed: "Confidencialidade revisada",
  conflictOfInterestReviewed: "Conflito de interesse revisado",
};

export const CASE_READINESS_DESCRIPTIONS_PT: Readonly<Record<CaseReadinessIssue, string>> = {
  professionalRoleDefined:
    "Existe uma atribuição profissional ativa para este processo.",
  objectDefined: "O alcance inicial do trabalho foi delimitado.",
  deadlineReviewed: "A situação do prazo foi analisada.",
  confidentialityReviewed:
    "O nível de confidencialidade foi definido para o processo.",
  conflictOfInterestReviewed:
    "A verificação inicial de conflito foi registrada.",
};

// ---- Rótulos das opções editáveis -----------------------------------------

export const DEADLINE_STATUS_LABELS_PT: Readonly<Record<DeadlineStatus, string>> = {
  not_reviewed: "Não revisado",
  reviewed: "Revisado",
  extended: "Prazo prorrogado",
  expired: "Prazo expirado",
};

export const CONFLICT_CHECK_LABELS_PT: Readonly<Record<ConflictCheckStatus, string>> = {
  not_reviewed: "Não revisado",
  no_conflict: "Sem conflito identificado",
  conflict_detected: "Conflito identificado",
};

export const OBJECT_DEFINED_LABELS_PT: Readonly<Record<"false" | "true", string>> = {
  false: "A definir",
  true: "Definido",
};

// ---- Progresso do checklist -----------------------------------------------

export type CaseReadinessProgress = Readonly<{
  complete: number;
  total: number;
  pending: number;
  isReady: boolean;
}>;

export function getCaseReadinessProgress(view: CaseReadinessView): CaseReadinessProgress {
  const total = CASE_READINESS_ISSUES.length;
  const pending = view.issues.length;
  const complete = total - pending;
  return { complete, total, pending, isReady: pending === 0 };
}

// ---- Valores do formulário do checklist -----------------------------------

export type CaseChecklistFormValues = Readonly<{
  objectDefined: boolean;
  deadlineStatus: DeadlineStatus;
  conflictCheck: ConflictCheckStatus;
}>;

export function caseToChecklistFormValues(c: Case): CaseChecklistFormValues {
  return {
    objectDefined: c.objectDefined,
    deadlineStatus: c.deadlineStatus,
    conflictCheck: c.conflictCheck,
  };
}

// ---- Input restrito -------------------------------------------------------

export type CaseChecklistUpdateInput = Readonly<{
  objectDefined?: boolean;
  deadlineStatus?: DeadlineStatus;
  conflictCheck?: ConflictCheckStatus;
  expectedVersion: number;
}>;

/**
 * Constrói o input somente com os campos alterados. Retorna `null` quando
 * nada mudou. Nunca inclui `id`, `organizationId`, `reference`, `title`,
 * `status`, `confidentiality` ou `metadata`.
 */
export function buildCaseChecklistUpdateInput(
  current: Case,
  values: CaseChecklistFormValues,
): CaseChecklistUpdateInput | null {
  const patch: {
    objectDefined?: boolean;
    deadlineStatus?: DeadlineStatus;
    conflictCheck?: ConflictCheckStatus;
  } = {};
  if (values.objectDefined !== current.objectDefined) {
    patch.objectDefined = values.objectDefined;
  }
  if (values.deadlineStatus !== current.deadlineStatus) {
    patch.deadlineStatus = values.deadlineStatus;
  }
  if (values.conflictCheck !== current.conflictCheck) {
    patch.conflictCheck = values.conflictCheck;
  }
  if (Object.keys(patch).length === 0) return null;
  return { ...patch, expectedVersion: current.metadata.version };
}

// ---- Mapeamento público de erros ------------------------------------------

export type CaseDetailErrorKind =
  | "not_found"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "offline"
  | "unavailable"
  | "validation"
  | "generic";

export type CaseDetailPublicError = Readonly<{
  kind: CaseDetailErrorKind;
  message: string;
}>;

const GENERIC = "Não foi possível concluír esta operação. Tente novamente.";
const GENERIC_FIXED = "Não foi possível concluir esta operação. Tente novamente.";

export function mapCaseDetailError(error: ServiceError): CaseDetailPublicError {
  switch (error.code) {
    case "not_found":
      return { kind: "not_found", message: "Processo não encontrado." };
    case "conflict":
      return {
        kind: "conflict",
        message:
          "Este processo foi alterado em outra ação. Recarregue os dados antes de tentar novamente.",
      };
    case "unauthorized":
      return {
        kind: "unauthorized",
        message:
          "Sua sessão não está disponível. Entre novamente para continuar.",
      };
    case "forbidden":
      return {
        kind: "forbidden",
        message: "Você não tem permissão para atualizar este processo.",
      };
    case "offline":
      return {
        kind: "offline",
        message:
          "Você está sem conexão no momento. Tente novamente quando a conexão for restabelecida.",
      };
    case "unavailable":
      return {
        kind: "unavailable",
        message: "O serviço está temporariamente indisponível. Tente novamente.",
      };
    case "validation_error":
      return {
        kind: "validation",
        message: "Não foi possível salvar as informações do checklist.",
      };
    case "internal_error":
    default:
      return { kind: "generic", message: GENERIC_FIXED };
  }
}

// Evita "variável não usada" caso a mensagem antiga tenha ficado no bundle.
void GENERIC;

// ---- Guardas em tempo de módulo -------------------------------------------

{
  for (const key of CASE_READINESS_ISSUES) {
    if (!(key in CASE_READINESS_LABELS_PT)) {
      throw new Error(`CASE_READINESS_LABELS_PT: falta ${key}`);
    }
    if (!(key in CASE_READINESS_DESCRIPTIONS_PT)) {
      throw new Error(`CASE_READINESS_DESCRIPTIONS_PT: falta ${key}`);
    }
  }
}
