/**
 * LV-09.2B2 — Rótulos oficiais em português para Comunicações e presença.
 * Nenhum valor interno em inglês deve aparecer na interface.
 */

import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationKind,
  CommunicationOutcome,
} from "@/domain/core/communication";
import type { CommunicationQuickAction } from "./communication-form";

export const COMMUNICATION_KIND_LABEL: Readonly<Record<CommunicationKind, string>> =
  Object.freeze({
    confirmation_request: "Solicitação de confirmação",
    confirmation_response: "Confirmação de presença",
    absence: "Ausência",
    note: "Anotação",
    contact_attempt: "Tentativa de contato",
    cancellation: "Cancelamento",
    reschedule_request: "Pedido de reagendamento",
  });

export const COMMUNICATION_CHANNEL_LABEL: Readonly<
  Record<CommunicationChannel, string>
> = Object.freeze({
  email: "E-mail",
  phone: "Telefone",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_person: "Presencial",
  system: "Sistema",
});

export const COMMUNICATION_OUTCOME_LABEL: Readonly<
  Record<CommunicationOutcome, string>
> = Object.freeze({
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
  rescheduled: "Reagendado",
  no_response: "Sem resposta",
  informed: "Informado",
  completed: "Contato realizado",
  message_left: "Mensagem deixada",
  absent: "Ausente",
  cancelled: "Cancelado",
  reschedule_requested: "Reagendamento solicitado",
});

export const COMMUNICATION_DIRECTION_LABEL: Readonly<
  Record<CommunicationDirection, string>
> = Object.freeze({
  outbound: "Saída",
  inbound: "Entrada",
  internal: "Registro interno",
});

export const COMMUNICATION_ACTION_LABEL: Readonly<
  Record<CommunicationQuickAction, string>
> = Object.freeze({
  contact: "Registrar contato",
  confirm: "Confirmar presença",
  absence: "Registrar ausência",
  cancellation: "Registrar cancelamento",
  reschedule_request: "Registrar pedido de reagendamento",
});

export function getCommunicationKindLabel(kind: CommunicationKind): string {
  return COMMUNICATION_KIND_LABEL[kind];
}
export function getCommunicationChannelLabel(
  channel: CommunicationChannel,
): string {
  return COMMUNICATION_CHANNEL_LABEL[channel];
}
export function getCommunicationOutcomeLabel(
  outcome: CommunicationOutcome,
): string {
  return COMMUNICATION_OUTCOME_LABEL[outcome];
}
export function getCommunicationDirectionLabel(
  direction: CommunicationDirection,
): string {
  return COMMUNICATION_DIRECTION_LABEL[direction];
}
export function getCommunicationActionLabel(
  action: CommunicationQuickAction,
): string {
  return COMMUNICATION_ACTION_LABEL[action];
}
