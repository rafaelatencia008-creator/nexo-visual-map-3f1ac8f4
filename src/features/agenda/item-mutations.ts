/**
 * LV-09.1B.6 — Helpers puros de mudança de status e exclusão.
 * LV-09.1B.6.1 — Fechamento técnico: marcador dedicado de exclusão,
 * builder puro para a próxima geração, tipagem discriminada do conflito
 * de mutação, máquina de estado de permissão e guardas puras.
 *
 * Sem React, sem I/O, sem `Date.now()`. Recebem entidades oficiais e
 * devolvem estritamente os DTOs oficiais definidos em
 * `@/domain/services/inputs` (`ChangeDeadlineStatusInput`,
 * `ChangeAppointmentStatusInput`).
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
import { resolveAgendaItemVisibility } from "./item-visibility";
import type { AgendaLoadStateSnapshot } from "./created-visibility";

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

// ---- Estado unificado de conflito de mutação ----------------------------

export type MutationOperation = "change_status" | "remove";

export type MutationConflict =
  | Readonly<{
      operation: "change_status";
      expected?: number;
      actual?: number;
    }>
  | Readonly<{
      operation: "remove";
      expected?: number;
      actual?: number;
    }>
  | null;

export function buildMutationConflict(
  operation: MutationOperation,
  err: TranslatedMutationError,
): MutationConflict {
  if (err.kind !== "conflict") return null;
  if (operation === "remove") {
    return Object.freeze({
      operation: "remove" as const,
      ...(err.expectedVersion !== undefined
        ? { expected: err.expectedVersion }
        : {}),
      ...(err.actualVersion !== undefined ? { actual: err.actualVersion } : {}),
    });
  }
  return Object.freeze({
    operation: "change_status" as const,
    ...(err.expectedVersion !== undefined
      ? { expected: err.expectedVersion }
      : {}),
    ...(err.actualVersion !== undefined ? { actual: err.actualVersion } : {}),
  });
}

// ---- Estado de permissão com erro técnico separado ----------------------

export type PermissionEvalState =
  | "unknown"
  | "loading"
  | "allowed"
  | "denied"
  | "error";

export function permissionAllowsAction(state: PermissionEvalState): boolean {
  return state === "allowed";
}

// ---- Marcador de remoção pendente (integração com gerações) -------------

export type PendingRemovalItem = Readonly<{
  id: string;
  type: "deadline" | "appointment";
  requiredGeneration: number;
}>;

/**
 * Reserva a próxima geração da Agenda após uma exclusão. Só uma consulta
 * iniciada *depois* desta chamada poderá confirmar a remoção.
 */
export function buildPendingRemovalMarker(
  currentGeneration: number,
  deletedItem: Readonly<{ id: string; type: "deadline" | "appointment" }>,
): PendingRemovalItem {
  return Object.freeze({
    id: deletedItem.id,
    type: deletedItem.type,
    requiredGeneration: currentGeneration + 1,
  });
}

export type PendingRemovalAction =
  | Readonly<{ kind: "wait" }>
  | Readonly<{ kind: "confirmed_removed" }>;

/**
 * Decide, sem side effects, se uma remoção pode ser confirmada. Baseia-se
 * na mesma máquina de gerações usada para itens recém-criados.
 *
 *  - "wait" enquanto a geração exigida ainda não terminou ou está em erro;
 *  - "confirmed_removed" quando a geração adequada foi processada e o ID
 *    NÃO está presente na lista visível;
 *  - Se o ID reaparecer numa geração posterior à exclusão, isso indica
 *    resposta obsoleta anterior à exclusão — trate como wait para
 *    permitir retry externo.
 */
export function resolvePendingRemovalAction(
  pending: PendingRemovalItem,
  loadState: AgendaLoadStateSnapshot,
  visibleDeadlineIds: ReadonlySet<string>,
  visibleAppointmentIds: ReadonlySet<string>,
): PendingRemovalAction {
  const decision = resolveAgendaItemVisibility(
    { id: pending.id, type: pending.type, requiredGeneration: pending.requiredGeneration },
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
