/**
 * Entidade oficial de Comunicação da Agenda — LV-09.2A.
 *
 * `Communication` é um registro APPEND-ONLY vinculado a um `Appointment`
 * (compromisso) que documenta:
 *   - solicitações de confirmação enviadas,
 *   - respostas de confirmação recebidas,
 *   - declarações de ausência,
 *   - notas/comunicados avulsos.
 *
 * Puro TypeScript. Sem armazenamento, sem rede, sem React. Sem PII.
 * O `recipientLabel` é apenas um rótulo curto para exibição, nunca um
 * dado pessoal identificável real (nome, telefone, e-mail).
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

// ---- Coerência semântica (kind ↔ direction/outcome) ----------------------

/**
 * Regras de coerência interna do tipo × direção × desfecho:
 *
 * | kind                     | direções permitidas         | desfechos permitidos                                             |
 * |--------------------------|-----------------------------|------------------------------------------------------------------|
 * | confirmation_request     | outbound                    | pending, no_response                                             |
 * | confirmation_response    | inbound                     | confirmed, declined, rescheduled                                 |
 * | absence                  | inbound, internal           | informed, rescheduled                                            |
 * | note                     | outbound, inbound, internal | informed, pending, no_response, confirmed, declined, rescheduled |
 *
 * Essas regras existem para manter o histórico interpretável sem custo
 * de aplicação e sem depender de nenhuma UI.
 */
export function isCoherentCommunication(
  kind: CommunicationKind,
  direction: CommunicationDirection,
  outcome: CommunicationOutcome,
): boolean {
  if (kind === "confirmation_request") {
    if (direction !== "outbound") return false;
    return outcome === "pending" || outcome === "no_response";
  }
  if (kind === "confirmation_response") {
    if (direction !== "inbound") return false;
    return (
      outcome === "confirmed" ||
      outcome === "declined" ||
      outcome === "rescheduled"
    );
  }
  if (kind === "absence") {
    if (direction !== "inbound" && direction !== "internal") return false;
    return outcome === "informed" || outcome === "rescheduled";
  }
  // kind === "note"
  return true;
}

// ---- Entidade -------------------------------------------------------------

export type Communication = Readonly<{
  id: CommunicationId;
  organizationId: OrganizationId;
  caseId: CaseId;
  appointmentId: AppointmentId;
  kind: CommunicationKind;
  channel: CommunicationChannel;
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
  if (!isCommunicationChannel(c.channel)) return false;
  if (!isCommunicationOutcome(c.outcome)) return false;
  if (!isCommunicationDirection(c.direction)) return false;
  if (!isCoherentCommunication(c.kind, c.direction, c.outcome)) return false;
  if (!isValidOptionalTrimmed(c.subject, COMMUNICATION_SUBJECT_MAX)) return false;
  if (!isValidOptionalTrimmed(c.note, COMMUNICATION_NOTE_MAX)) return false;
  if (!isValidOptionalTrimmed(c.recipientLabel, COMMUNICATION_RECIPIENT_MAX))
    return false;
  if (!isIsoDateTime(c.occurredAt)) return false;
  if (!isMembershipId(c.authorMembershipId)) return false;
  if (!isEntityMetadata(c.metadata)) return false;
  // Append-only: version fixa em 1 e updatedAt === createdAt.
  if (c.metadata.version !== 1) return false;
  if (c.metadata.updatedAt !== c.metadata.createdAt) return false;
  return true;
}
