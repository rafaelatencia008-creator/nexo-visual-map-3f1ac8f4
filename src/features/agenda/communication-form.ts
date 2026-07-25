/**
 * LV-09.2B2 — Helpers puros para o formulário de Comunicações e presença.
 *
 * Sem React, sem I/O, sem `Date.now()`. Traduzem o estado do formulário
 * para o DTO oficial `CreateCommunicationInput` e expõem presets estáveis
 * para as cinco ações rápidas (contact, confirm, absence, cancellation,
 * reschedule_request).
 */

import {
  COMMUNICATION_NOTE_MAX,
  COMMUNICATION_RECIPIENT_MAX,
  COMMUNICATION_SUBJECT_MAX,
  isCommunicationChannel,
  isCommunicationDirection,
  isCommunicationKind,
  isCommunicationOutcome,
  isCoherentCommunication,
  kindRequiresChannel,
} from "@/domain/core/communication";
import { isAppointmentId, isCaseId } from "@/domain/core/ids";
import type { AppointmentId, CaseId } from "@/domain/core/ids";
import type { CreateCommunicationInput } from "@/domain/services/inputs";

import { datetimeLocalToIso } from "./create-form";

// ---- Tipos ---------------------------------------------------------------

export type CommunicationQuickAction =
  | "contact"
  | "confirm"
  | "absence"
  | "cancellation"
  | "reschedule_request";

export const COMMUNICATION_QUICK_ACTIONS: readonly CommunicationQuickAction[] =
  Object.freeze([
    "contact",
    "confirm",
    "absence",
    "cancellation",
    "reschedule_request",
  ] as const);

export type CommunicationFormState = Readonly<{
  kind: string;
  channel: string;
  outcome: string;
  direction: string;
  occurredAtLocal: string;
  summary: string;
  notes: string;
  recipientLabel: string;
}>;

export type CommunicationFormField =
  | "kind"
  | "channel"
  | "outcome"
  | "direction"
  | "occurredAt"
  | "summary"
  | "notes"
  | "recipientLabel";

export type BuildCommunicationResult =
  | Readonly<{ ok: true; input: CreateCommunicationInput }>
  | Readonly<{
      ok: false;
      errors: Readonly<Partial<Record<CommunicationFormField, string>>>;
    }>;

// ---- Estado vazio --------------------------------------------------------

export const EMPTY_COMMUNICATION_FORM: CommunicationFormState = Object.freeze({
  kind: "",
  channel: "",
  outcome: "",
  direction: "",
  occurredAtLocal: "",
  summary: "",
  notes: "",
  recipientLabel: "",
});

// ---- Presets -------------------------------------------------------------

/**
 * Combinações fixas por ação. `channel` sempre inicia vazio: quando o tipo
 * exige canal, o usuário escolhe; quando é opcional, pode permanecer vazio.
 */
const PRESETS: Readonly<
  Record<
    CommunicationQuickAction,
    Readonly<{ kind: string; direction: string; outcome: string }>
  >
> = Object.freeze({
  contact: {
    kind: "contact_attempt",
    direction: "outbound",
    outcome: "completed",
  },
  confirm: {
    kind: "confirmation_response",
    direction: "inbound",
    outcome: "confirmed",
  },
  absence: {
    kind: "absence",
    direction: "internal",
    outcome: "absent",
  },
  cancellation: {
    kind: "cancellation",
    direction: "internal",
    outcome: "cancelled",
  },
  reschedule_request: {
    kind: "reschedule_request",
    direction: "internal",
    outcome: "reschedule_requested",
  },
});

export function createCommunicationFormForAction(
  action: CommunicationQuickAction,
): CommunicationFormState {
  const p = PRESETS[action];
  return Object.freeze({
    kind: p.kind,
    channel: "",
    outcome: p.outcome,
    direction: p.direction,
    occurredAtLocal: "",
    summary: "",
    notes: "",
    recipientLabel: "",
  });
}

/**
 * Resultados aceitos por ação. Para `contact`, o usuário pode alternar
 * entre completed / no_response / message_left. Para as demais, o resultado
 * é fixo — a UI não deve permitir alteração.
 */
export function getAllowedOutcomesForAction(
  action: CommunicationQuickAction,
): readonly string[] {
  if (action === "contact") return ["completed", "no_response", "message_left"];
  return [PRESETS[action].outcome];
}

// ---- Builder -------------------------------------------------------------

/**
 * Valida e converte o estado do formulário no DTO oficial `CreateCommunicationInput`.
 * Não escreve chaves opcionais quando o campo é vazio.
 */
export function buildCommunicationCreateInput(
  caseId: CaseId,
  appointmentId: AppointmentId,
  state: CommunicationFormState,
): BuildCommunicationResult {
  const errors: Partial<Record<CommunicationFormField, string>> = {};

  if (!isCaseId(caseId)) errors.kind = "Processo inválido.";
  if (!isAppointmentId(appointmentId))
    errors.kind = errors.kind ?? "Compromisso inválido.";

  const kindStr = state.kind;
  if (!isCommunicationKind(kindStr)) {
    errors.kind = "Tipo de registro inválido.";
  }
  const directionStr = state.direction;
  if (!isCommunicationDirection(directionStr)) {
    errors.direction = "Direção inválida.";
  }
  const outcomeStr = state.outcome;
  if (!isCommunicationOutcome(outcomeStr)) {
    errors.outcome = "Resultado inválido.";
  }

  // Coerência semântica só quando os três valores são catálogo válido.
  if (
    isCommunicationKind(kindStr) &&
    isCommunicationDirection(directionStr) &&
    isCommunicationOutcome(outcomeStr) &&
    !isCoherentCommunication(kindStr, directionStr, outcomeStr)
  ) {
    errors.outcome =
      "Combinação de tipo, direção e resultado não é permitida.";
  }

  // Canal: obrigatório para alguns tipos; opcional para os demais.
  let channelKey: string | undefined;
  const channelRaw = state.channel.trim();
  if (channelRaw === "") {
    if (isCommunicationKind(kindStr) && kindRequiresChannel(kindStr)) {
      errors.channel = "Selecione um canal.";
    }
  } else if (!isCommunicationChannel(channelRaw)) {
    errors.channel = "Canal inválido.";
  } else {
    channelKey = channelRaw;
  }

  // Data e hora.
  const dt = datetimeLocalToIso(state.occurredAtLocal);
  if (!dt.ok) {
    errors.occurredAt =
      dt.reason === "empty"
        ? "Informe a data e a hora."
        : "Data e hora inválidas.";
  }

  // Resumo (obrigatório) → subject.
  const summaryTrim = state.summary.trim();
  if (summaryTrim.length === 0) {
    errors.summary = "Informe um resumo.";
  } else if (summaryTrim.length > COMMUNICATION_SUBJECT_MAX) {
    errors.summary = `O resumo deve ter no máximo ${COMMUNICATION_SUBJECT_MAX} caracteres.`;
  }

  // Observações (opcional) → note.
  const notesRaw = state.notes;
  const notesTrim = notesRaw.trim();
  let noteKey: string | undefined;
  if (notesTrim.length > 0) {
    if (notesTrim.length > COMMUNICATION_NOTE_MAX) {
      errors.notes = `As observações devem ter no máximo ${COMMUNICATION_NOTE_MAX} caracteres.`;
    } else {
      noteKey = notesTrim;
    }
  }

  // Destinatário (opcional).
  const recipientTrim = state.recipientLabel.trim();
  let recipientKey: string | undefined;
  if (recipientTrim.length > 0) {
    if (recipientTrim.length > COMMUNICATION_RECIPIENT_MAX) {
      errors.recipientLabel = `A identificação do destinatário deve ter no máximo ${COMMUNICATION_RECIPIENT_MAX} caracteres.`;
    } else {
      recipientKey = recipientTrim;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: Object.freeze({ ...errors }) };
  }

  // Neste ponto, sabemos que kindStr, directionStr, outcomeStr e dt são válidos.
  if (
    !isCommunicationKind(kindStr) ||
    !isCommunicationDirection(directionStr) ||
    !isCommunicationOutcome(outcomeStr) ||
    !dt.ok
  ) {
    return {
      ok: false,
      errors: Object.freeze({ kind: "Estado inválido do formulário." }),
    };
  }

  const input: CreateCommunicationInput = {
    caseId,
    appointmentId,
    kind: kindStr,
    ...(channelKey !== undefined && isCommunicationChannel(channelKey)
      ? { channel: channelKey }
      : {}),
    outcome: outcomeStr,
    direction: directionStr,
    subject: summaryTrim,
    ...(noteKey !== undefined ? { note: noteKey } : {}),
    ...(recipientKey !== undefined ? { recipientLabel: recipientKey } : {}),
    occurredAt: dt.value,
  };

  return { ok: true, input };
}
