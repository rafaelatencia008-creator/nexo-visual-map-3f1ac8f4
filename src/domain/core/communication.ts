/**
 * Entidade oficial de Comunicação da Agenda — LV-09.2 (B1).
 *
 * `Communication` é um registro APPEND-ONLY vinculado a um `Appointment`.
 * Documenta solicitações, respostas, tentativas de contato, cancelamentos,
 * pedidos de reagendamento, ausências e notas avulsas.
 *
 * Puro TypeScript. Sem armazenamento, sem rede, sem React. Sem PII.
 *
 * Regras de imutabilidade:
 *   - `metadata.version` é sempre 1 (jamais atualizado);
 *   - `metadata.updatedAt === metadata.createdAt`;
 *   - a entidade nunca é editada, apenas novos registros são acrescidos.
 */

import {
  isAppointmentId,
  isCaseId,
  isCommunicationId,
  isMembershipId,
  isOrganizationId,
  type AppointmentId,
  type CaseId,
  type CommunicationId,
  type MembershipId,
  type OrganizationId,
} from "./ids";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isEntityMetadata,
  isIsoDateTime,
  type EntityMetadata,
  type IsoDateTime,
} from "./common";

// ---- Limites --------------------------------------------------------------

export const COMMUNICATION_SUBJECT_MAX = 160;
export const COMMUNICATION_NOTE_MAX = 2000;
export const COMMUNICATION_RECIPIENT_MAX = 160;

// ---- Catálogos -----------------------------------------------------------

export const COMMUNICATION_KINDS = [
  "confirmation_request",
  "confirmation_response",
  "absence",
  "note",
  "contact_attempt",
  "cancellation",
  "reschedule_request",
] as const;
export type CommunicationKind = (typeof COMMUNICATION_KINDS)[number];

export const COMMUNICATION_CHANNELS = [
  "email",
  "phone",
  "sms",
  "whatsapp",
  "in_person",
  "system",
] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_OUTCOMES = [
  "pending",
  "confirmed",
  "declined",
  "rescheduled",
  "no_response",
  "informed",
  "completed",
  "message_left",
  "absent",
  "cancelled",
  "reschedule_requested",
] as const;
export type CommunicationOutcome = (typeof COMMUNICATION_OUTCOMES)[number];

export const COMMUNICATION_DIRECTIONS = [
  "outbound",
  "inbound",
  "internal",
] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

const KIND_SET = new Set<string>(COMMUNICATION_KINDS);
const CHANNEL_SET = new Set<string>(COMMUNICATION_CHANNELS);
const OUTCOME_SET = new Set<string>(COMMUNICATION_OUTCOMES);
const DIRECTION_SET = new Set<string>(COMMUNICATION_DIRECTIONS);

export const isCommunicationKind = (v: unknown): v is CommunicationKind =>
  typeof v === "string" && KIND_SET.has(v);
export const isCommunicationChannel = (v: unknown): v is CommunicationChannel =>
  typeof v === "string" && CHANNEL_SET.has(v);
export const isCommunicationOutcome = (v: unknown): v is CommunicationOutcome =>
  typeof v === "string" && OUTCOME_SET.has(v);
export const isCommunicationDirection = (
  v: unknown,
): v is CommunicationDirection =>
  typeof v === "string" && DIRECTION_SET.has(v);

// ---- Canal obrigatório por tipo ------------------------------------------

const KINDS_REQUIRING_CHANNEL: ReadonlySet<CommunicationKind> = new Set([
  "contact_attempt",
  "confirmation_request",
  "confirmation_response",
]);

export function kindRequiresChannel(kind: CommunicationKind): boolean {
  return KINDS_REQUIRING_CHANNEL.has(kind);
}

// ---- Coerência semântica -------------------------------------------------

const NOTE_OUTCOMES: ReadonlySet<CommunicationOutcome> = new Set([
  "pending",
  "confirmed",
  "declined",
  "rescheduled",
  "no_response",
  "informed",
]);

export function isCoherentCommunication(
  kind: CommunicationKind,
  direction: CommunicationDirection,
  outcome: CommunicationOutcome,
): boolean {
  if (kind === "contact_attempt") {
    if (direction !== "outbound") return false;
    return (
      outcome === "completed" ||
      outcome === "no_response" ||
      outcome === "message_left"
    );
  }
  if (kind === "confirmation_request") {
    if (direction !== "outbound") return false;
    return outcome === "pending" || outcome === "no_response";
  }
  if (kind === "confirmation_response") {
    if (direction !== "inbound") return false;
    return outcome === "confirmed" || outcome === "declined";
  }
  if (kind === "absence") {
    if (direction !== "inbound" && direction !== "internal") return false;
    return outcome === "absent";
  }
  if (kind === "cancellation") {
    if (direction !== "inbound" && direction !== "internal") return false;
    return outcome === "cancelled";
  }
  if (kind === "reschedule_request") {
    if (direction !== "inbound" && direction !== "internal") return false;
    return outcome === "reschedule_requested";
  }
  // kind === "note"
  return NOTE_OUTCOMES.has(outcome);
}

// ---- Entidade -------------------------------------------------------------

export type Communication = Readonly<{
  id: CommunicationId;
  organizationId: OrganizationId;
  caseId: CaseId;
  appointmentId: AppointmentId;
  kind: CommunicationKind;
  channel?: CommunicationChannel;
  outcome: CommunicationOutcome;
  direction: CommunicationDirection;
  subject?: string;
  note?: string;
  recipientLabel?: string;
  occurredAt: IsoDateTime;
  authorMembershipId: MembershipId;
  metadata: EntityMetadata;
}>;

export const COMMUNICATION_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "appointmentId",
  "kind",
  "channel",
  "outcome",
  "direction",
  "subject",
  "note",
  "recipientLabel",
  "occurredAt",
  "authorMembershipId",
  "metadata",
]);

function isValidOptionalTrimmed(v: unknown, max: number): boolean {
  if (v === undefined) return true;
  if (typeof v !== "string") return false;
  if (v.length > max) return false;
  return v.trim().length > 0;
}

function hasTrimmedContent(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function isCommunication(v: unknown): v is Communication {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, COMMUNICATION_ALLOWED_KEYS)) return false;
  const c = v as Record<string, unknown>;
  if (!isCommunicationId(c.id)) return false;
  if (!isOrganizationId(c.organizationId)) return false;
  if (!isCaseId(c.caseId)) return false;
  if (!isAppointmentId(c.appointmentId)) return false;
  if (!isCommunicationKind(c.kind)) return false;
  if (c.channel !== undefined && !isCommunicationChannel(c.channel))
    return false;
  if (kindRequiresChannel(c.kind) && c.channel === undefined) return false;
  if (!isCommunicationOutcome(c.outcome)) return false;
  if (!isCommunicationDirection(c.direction)) return false;
  if (!isCoherentCommunication(c.kind, c.direction, c.outcome)) return false;
  if (!isValidOptionalTrimmed(c.subject, COMMUNICATION_SUBJECT_MAX)) return false;
  if (!isValidOptionalTrimmed(c.note, COMMUNICATION_NOTE_MAX)) return false;
  if (!isValidOptionalTrimmed(c.recipientLabel, COMMUNICATION_RECIPIENT_MAX))
    return false;
  // Conteúdo textual mínimo: subject OU note preenchido.
  if (!hasTrimmedContent(c.subject) && !hasTrimmedContent(c.note)) return false;
  if (!isIsoDateTime(c.occurredAt)) return false;
  if (!isMembershipId(c.authorMembershipId)) return false;
  if (!isEntityMetadata(c.metadata)) return false;
  if (c.metadata.version !== 1) return false;
  if (c.metadata.updatedAt !== c.metadata.createdAt) return false;
  return true;
}
