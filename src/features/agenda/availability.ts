/**
 * LV-09.1B.7.1 — Motor consultivo de disponibilidade da Agenda.
 *
 * Este módulo é puro: apenas tipos e funções sobre intervalos.
 * Não importa React, Router, notificações, storage, serviços, mocks ou fetch.
 * Não altera domínio, serviços ou mocks.
 *
 * Semântica de intervalo: `[startsAt, endsAt)` (semiaberto). Dois
 * intervalos conflitam quando `aStart < bEnd && bStart < aEnd`.
 * Portanto, limites exatamente encostados NÃO conflitam.
 */

import type { Appointment } from "@/domain/core/agenda";
import { isoDateTimeToEpoch, type IsoDateTime } from "@/domain/core/common";
import type { AppointmentId, AssignmentId } from "@/domain/core/ids";

// ---- Tipos públicos ------------------------------------------------------

export type AppointmentAvailabilityConflict = Readonly<{
  appointmentId: AppointmentId;
  title: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
}>;

export type AppointmentAvailabilityIndeterminateReason =
  | "assignment_required"
  | "invalid_interval"
  | "consultation_failed"
  | "pagination_limit";

export type AppointmentAvailabilityDecision =
  | Readonly<{ kind: "available" }>
  | Readonly<{
      kind: "conflict";
      conflicts: readonly AppointmentAvailabilityConflict[];
    }>
  | Readonly<{
      kind: "indeterminate";
      reason: AppointmentAvailabilityIndeterminateReason;
    }>;

export type NormalizedInterval = Readonly<{
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  startEpoch: number;
  endEpoch: number;
}>;

// ---- Funções puras -------------------------------------------------------

/**
 * `true` sse o intervalo é bem-formado (`endsAt > startsAt`, em epoch).
 * Não conflita com valores encostados: apenas `endsAt === startsAt` é
 * inválido; `endsAt > startsAt` é válido.
 */
export function isValidInterval(startsAt: IsoDateTime, endsAt: IsoDateTime): boolean {
  const s = isoDateTimeToEpoch(startsAt);
  const e = isoDateTimeToEpoch(endsAt);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
  return e > s;
}

/**
 * Normaliza um intervalo em epoch. Retorna `null` quando inválido.
 */
export function normalizeInterval(
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
): NormalizedInterval | null {
  const startEpoch = isoDateTimeToEpoch(startsAt);
  const endEpoch = isoDateTimeToEpoch(endsAt);
  if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) return null;
  if (!(endEpoch > startEpoch)) return null;
  return { startsAt, endsAt, startEpoch, endEpoch };
}

/**
 * Regra oficial de sobreposição de intervalos semiabertos.
 * Encostados não conflitam (uso estrito de `<`).
 */
export function intervalsOverlap(
  aStartEpoch: number,
  aEndEpoch: number,
  bStartEpoch: number,
  bEndEpoch: number,
): boolean {
  return aStartEpoch < bEndEpoch && bStartEpoch < aEndEpoch;
}

/**
 * `true` sse o compromisso existente deve ser considerado na verificação.
 * Regras:
 *  - somente `scheduled`;
 *  - ignora `excludeAppointmentId`;
 *  - quando `assignmentId` da proposta está definido, exige o mesmo
 *    assignment no existente.
 *
 * A validação temporal fica fora daqui: esta função apenas seleciona
 * candidatos elegíveis por status/responsável.
 */
export function isCandidateForConflict(
  existing: Appointment,
  proposedAssignmentId: AssignmentId,
  excludeAppointmentId: AppointmentId | undefined,
): boolean {
  if (existing.status !== "scheduled") return false;
  if (excludeAppointmentId !== undefined && existing.id === excludeAppointmentId) {
    return false;
  }
  if (existing.assignmentId === undefined) return false;
  if (existing.assignmentId !== proposedAssignmentId) return false;
  return true;
}

/**
 * Constrói o registro público de conflito. Apenas os campos necessários
 * para apresentação — nada mais.
 */
export function toConflict(a: Appointment): AppointmentAvailabilityConflict {
  return Object.freeze({
    appointmentId: a.id,
    title: a.title,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
  });
}

/**
 * Deduplica por `appointmentId` e ordena por (startsAt, endsAt,
 * appointmentId) crescente. Determinístico.
 */
export function dedupeAndSortConflicts(
  conflicts: readonly AppointmentAvailabilityConflict[],
): readonly AppointmentAvailabilityConflict[] {
  const byId = new Map<AppointmentId, AppointmentAvailabilityConflict>();
  for (const c of conflicts) {
    if (!byId.has(c.appointmentId)) byId.set(c.appointmentId, c);
  }
  const arr = Array.from(byId.values());
  arr.sort((x, y) => {
    const sx = isoDateTimeToEpoch(x.startsAt);
    const sy = isoDateTimeToEpoch(y.startsAt);
    if (sx !== sy) return sx - sy;
    const ex = isoDateTimeToEpoch(x.endsAt);
    const ey = isoDateTimeToEpoch(y.endsAt);
    if (ex !== ey) return ex - ey;
    if (x.appointmentId < y.appointmentId) return -1;
    if (x.appointmentId > y.appointmentId) return 1;
    return 0;
  });
  return Object.freeze(arr);
}

// ---- Fábricas de decisão --------------------------------------------------

export function decisionAvailable(): AppointmentAvailabilityDecision {
  return Object.freeze({ kind: "available" });
}

export function decisionIndeterminate(
  reason: AppointmentAvailabilityIndeterminateReason,
): AppointmentAvailabilityDecision {
  return Object.freeze({ kind: "indeterminate", reason });
}

export function decisionConflict(
  conflicts: readonly AppointmentAvailabilityConflict[],
): AppointmentAvailabilityDecision {
  return Object.freeze({
    kind: "conflict",
    conflicts: dedupeAndSortConflicts(conflicts),
  });
}
