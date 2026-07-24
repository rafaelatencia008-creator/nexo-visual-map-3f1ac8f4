/**
 * LV-09.1B.6 — Helpers puros de mudança de status e exclusão.
 *
 * Sem React, sem I/O, sem `Date.now()`. Recebem entidades oficiais
 * e devolvem estritamente os DTOs oficiais definidos em
 * `@/domain/services/inputs` (`ChangeDeadlineStatusInput`,
 * `ChangeAppointmentStatusInput`), incluindo `expectedVersion`.
 */

import type {
  Appointment,
  AppointmentStatus,
  Deadline,
  DeadlineStatus,
} from "@/domain/core/agenda";
import {
  APPOINTMENT_STATUSES,
  DEADLINE_STATUSES,
} from "@/domain/core/agenda";
import type {
  ChangeAppointmentStatusInput,
  ChangeDeadlineStatusInput,
} from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";
import {
  resolveCreatedItemVisibility,
  type AgendaLoadStateSnapshot,
  type PendingCreatedItem,
} from "./created-visibility";

// ---- Rótulos oficiais ---------------------------------------------------

export const DEADLINE_STATUS_LABEL: Readonly<Record<DeadlineStatus, string>> =
  Object.freeze({
    pending: "Pendente",
    completed: "Cumprido",
    cancelled: "Cancelado",
  });

export const APPOINTMENT_STATUS_LABEL: Readonly<
  Record<AppointmentStatus, string>
> = Object.freeze({
  scheduled: "Agendado",
  completed: "Realizado",
  cancelled: "Cancelado",
});

// ---- Ações oferecidas ---------------------------------------------------

export type DeadlineStatusAction = Readonly<{
  status: DeadlineStatus;
  actionLabel: string;
  confirmTitle: string;
  targetLabel: string;
  currentLabel: string;
}>;

export type AppointmentStatusAction = Readonly<{
  status: AppointmentStatus;
  actionLabel: string;
  confirmTitle: string;
  targetLabel: string;
  currentLabel: string;
}>;

const DEADLINE_ACTION_LABEL: Readonly<Record<DeadlineStatus, string>> =
  Object.freeze({
    pending: "Reabrir prazo",
    completed: "Marcar como cumprido",
    cancelled: "Cancelar prazo",
  });
const DEADLINE_CONFIRM_TITLE: Readonly<Record<DeadlineStatus, string>> =
  Object.freeze({
    pending: "Reabrir este prazo?",
    completed: "Marcar prazo como cumprido?",
    cancelled: "Cancelar este prazo?",
  });

const APPOINTMENT_ACTION_LABEL: Readonly<Record<AppointmentStatus, string>> =
  Object.freeze({
    scheduled: "Reabrir compromisso",
    completed: "Marcar como realizado",
    cancelled: "Cancelar compromisso",
  });
const APPOINTMENT_CONFIRM_TITLE: Readonly<Record<AppointmentStatus, string>> =
  Object.freeze({
    scheduled: "Reabrir este compromisso?",
    completed: "Marcar compromisso como realizado?",
    cancelled: "Cancelar este compromisso?",
  });

/**
 * Devolve as ações oficialmente oferecidas para o estado atual do prazo.
 * Nunca oferece o mesmo estado, nunca oferece estados fora do catálogo,
 * ordem determinística por `DEADLINE_STATUSES`.
 */
export function getDeadlineStatusActions(
  current: DeadlineStatus,
): readonly DeadlineStatusAction[] {
  const currentLabel = DEADLINE_STATUS_LABEL[current];
  return DEADLINE_STATUSES.filter((s) => s !== current).map((status) =>
    Object.freeze({
      status,
      actionLabel: DEADLINE_ACTION_LABEL[status],
      confirmTitle: DEADLINE_CONFIRM_TITLE[status],
      targetLabel: DEADLINE_STATUS_LABEL[status],
      currentLabel,
    }),
  );
}

export function getAppointmentStatusActions(
  current: AppointmentStatus,
): readonly AppointmentStatusAction[] {
  const currentLabel = APPOINTMENT_STATUS_LABEL[current];
  return APPOINTMENT_STATUSES.filter((s) => s !== current).map((status) =>
    Object.freeze({
      status,
      actionLabel: APPOINTMENT_ACTION_LABEL[status],
      confirmTitle: APPOINTMENT_CONFIRM_TITLE[status],
      targetLabel: APPOINTMENT_STATUS_LABEL[status],
      currentLabel,
    }),
  );
}

// ---- Builders de DTO oficial --------------------------------------------

export function buildChangeDeadlineStatusInput(
  original: Deadline,
  status: DeadlineStatus,
  expectedVersion: number,
): ChangeDeadlineStatusInput {
  return Object.freeze({
    caseId: original.caseId,
    deadlineId: original.id,
    status,
    expectedVersion,
  });
}

export function buildChangeAppointmentStatusInput(
  original: Appointment,
  status: AppointmentStatus,
  expectedVersion: number,
): ChangeAppointmentStatusInput {
  return Object.freeze({
    caseId: original.caseId,
    appointmentId: original.id,
    status,
    expectedVersion,
  });
}

// ---- Tradução de erros --------------------------------------------------

export type TranslatedMutationError = Readonly<{
  kind:
    | "conflict"
    | "forbidden"
    | "not_found"
    | "no_changes"
    | "invalid_status"
    | "invalid_expected_version"
    | "offline"
    | "unavailable"
    | "internal_error"
    | "generic";
  message: string;
  expectedVersion?: number;
  actualVersion?: number;
}>;

export const AGENDA_MUTATION_MESSAGES = Object.freeze({
  conflict:
    "Este item foi alterado em outra sessão. Recarregue os dados antes de continuar.",
  forbidden: "Você não tem permissão para realizar esta ação.",
  not_found: "Este item não está mais disponível.",
  no_changes: "O item já está nesse estado.",
  invalid_status: "Estado inválido para este item.",
  invalid_expected_version:
    "Versão inválida. Recarregue os dados antes de continuar.",
  offline: "Sem conexão. Tente novamente.",
  unavailable: "Serviço indisponível. Tente novamente em instantes.",
  internal_error: "Erro interno. Tente novamente em instantes.",
  generic: "Não foi possível concluir a ação. Tente novamente.",
} as const);

export function translateAgendaMutationError(
  error: ServiceError,
): TranslatedMutationError {
  if (error.code === "conflict") {
    return {
      kind: "conflict",
      message: AGENDA_MUTATION_MESSAGES.conflict,
      ...(error.expectedVersion !== undefined
        ? { expectedVersion: error.expectedVersion }
        : {}),
      ...(error.actualVersion !== undefined
        ? { actualVersion: error.actualVersion }
        : {}),
    };
  }
  if (error.code === "forbidden" || error.code === "unauthorized") {
    return { kind: "forbidden", message: AGENDA_MUTATION_MESSAGES.forbidden };
  }
  if (error.code === "not_found") {
    return { kind: "not_found", message: AGENDA_MUTATION_MESSAGES.not_found };
  }
  if (error.code === "validation_error") {
    const msg = error.message;
    if (msg === "no_changes") {
      return { kind: "no_changes", message: AGENDA_MUTATION_MESSAGES.no_changes };
    }
    if (msg === "invalid_status") {
      return {
        kind: "invalid_status",
        message: AGENDA_MUTATION_MESSAGES.invalid_status,
      };
    }
    if (msg === "invalid_expected_version") {
      return {
        kind: "invalid_expected_version",
        message: AGENDA_MUTATION_MESSAGES.invalid_expected_version,
      };
    }
    return { kind: "generic", message: AGENDA_MUTATION_MESSAGES.generic };
  }
  if (error.code === "offline")
    return { kind: "offline", message: AGENDA_MUTATION_MESSAGES.offline };
  if (error.code === "unavailable")
    return {
      kind: "unavailable",
      message: AGENDA_MUTATION_MESSAGES.unavailable,
    };
  if (error.code === "internal_error")
    return {
      kind: "internal_error",
      message: AGENDA_MUTATION_MESSAGES.internal_error,
    };
  return { kind: "generic", message: AGENDA_MUTATION_MESSAGES.generic };
}

// ---- Exclusão pendente (gerações) ---------------------------------------

export type PendingRemovalAction =
  | Readonly<{ kind: "wait" }>
  | Readonly<{ kind: "confirmed_removed" }>;

/**
 * Reaproveita a máquina de gerações (`resolveCreatedItemVisibility`) para
 * decidir quando uma remoção pode ser confirmada como concluída:
 *  - "wait" enquanto a geração exigida ainda não terminou ou está em erro;
 *  - "confirmed_removed" quando a geração adequada foi processada e o ID
 *    NÃO está presente na lista visível (o serviço confirmou a exclusão).
 *  - Se o ID reaparecer numa geração posterior à exclusão, isso indica
 *    resposta obsoleta anterior à exclusão — trate como wait para
 *    permitir retry externo.
 */
export function resolvePendingRemovalAction(
  pending: PendingCreatedItem,
  loadState: AgendaLoadStateSnapshot,
  visibleDeadlineIds: ReadonlySet<string>,
  visibleAppointmentIds: ReadonlySet<string>,
): PendingRemovalAction {
  const decision = resolveCreatedItemVisibility(
    pending,
    loadState,
    visibleDeadlineIds,
    visibleAppointmentIds,
  );
  if (decision === "hidden") return { kind: "confirmed_removed" };
  return { kind: "wait" };
}

// ---- Guardas de catálogo ------------------------------------------------

export const DEADLINE_STATUS_ORDER: readonly DeadlineStatus[] = Object.freeze([
  ...DEADLINE_STATUSES,
]);
export const APPOINTMENT_STATUS_ORDER: readonly AppointmentStatus[] =
  Object.freeze([...APPOINTMENT_STATUSES]);
