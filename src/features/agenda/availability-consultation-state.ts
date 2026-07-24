/**
 * LV-09.1B.7.2.1 — Sessão pura do ciclo consultivo de disponibilidade.
 *
 * Puro: sem React, sem Router, sem serviço concreto, sem relógio real.
 * O componente `AgendaAvailabilityContent` consome esse helper para
 * gerenciar o single-flight, a invalidação por mudança de campo e a
 * confirmação de proprietário (owner) de cada consulta.
 *
 * Invariantes:
 *   - `requestId` é monotonicamente crescente.
 *   - `inputKey` é determinística a partir do input do motor.
 *   - Um `begin` durante `inFlight === true` é bloqueado.
 *   - `invalidate` torna qualquer owner anterior obsoleto e a nova
 *     sessão fica com `requestId` estritamente maior.
 *   - `complete` só libera a sessão quando o owner recebido é o dono
 *     corrente; owner obsoleto NÃO libera sessão nova.
 */

import type { CheckAppointmentAvailabilityInput } from "./check-appointment-availability";

export type AvailabilityConsultationSession = Readonly<{
  requestId: number;
  inFlight: boolean;
  inputKey: string | null;
}>;

export type AvailabilityConsultationOwner = Readonly<{
  requestId: number;
  inputKey: string;
}>;

export type BeginAvailabilityConsultationResult =
  | Readonly<{
      kind: "started";
      session: AvailabilityConsultationSession;
      owner: AvailabilityConsultationOwner;
    }>
  | Readonly<{
      kind: "blocked";
      session: AvailabilityConsultationSession;
    }>;

export function createAvailabilityConsultationSession(): AvailabilityConsultationSession {
  return Object.freeze({ requestId: 0, inFlight: false, inputKey: null });
}

export function buildAvailabilityConsultationInputKey(
  input: CheckAppointmentAvailabilityInput,
): string {
  const assign = input.assignmentId ?? "";
  const exclude = input.excludeAppointmentId ?? "";
  return `${input.startsAt}|${input.endsAt}|${assign}|${exclude}`;
}

export function beginAvailabilityConsultation(
  session: AvailabilityConsultationSession,
  input: CheckAppointmentAvailabilityInput,
): BeginAvailabilityConsultationResult {
  if (session.inFlight) {
    return Object.freeze({ kind: "blocked" as const, session });
  }
  const nextRequestId = session.requestId + 1;
  const inputKey = buildAvailabilityConsultationInputKey(input);
  const nextSession: AvailabilityConsultationSession = Object.freeze({
    requestId: nextRequestId,
    inFlight: true,
    inputKey,
  });
  const owner: AvailabilityConsultationOwner = Object.freeze({
    requestId: nextRequestId,
    inputKey,
  });
  return Object.freeze({ kind: "started" as const, session: nextSession, owner });
}

export function invalidateAvailabilityConsultation(
  session: AvailabilityConsultationSession,
): AvailabilityConsultationSession {
  return Object.freeze({
    requestId: session.requestId + 1,
    inFlight: false,
    inputKey: null,
  });
}

export function isAvailabilityConsultationCurrent(
  mounted: boolean,
  session: AvailabilityConsultationSession,
  owner: AvailabilityConsultationOwner,
): boolean {
  if (!mounted) return false;
  if (!session.inFlight) return false;
  return session.requestId === owner.requestId && session.inputKey === owner.inputKey;
}

export function completeAvailabilityConsultation(
  session: AvailabilityConsultationSession,
  owner: AvailabilityConsultationOwner,
): AvailabilityConsultationSession {
  if (session.requestId !== owner.requestId || session.inputKey !== owner.inputKey) {
    return session;
  }
  return Object.freeze({
    requestId: session.requestId,
    inFlight: false,
    inputKey: session.inputKey,
  });
}
