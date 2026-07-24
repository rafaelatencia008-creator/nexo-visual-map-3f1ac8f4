/**
 * LV-09.1B.7.1 — Motor consultivo de disponibilidade (parte pura).
 *
 * Puro TypeScript: sem React, sem I/O, sem `Date.now()`, sem acesso a
 * mocks ou store. Todos os resultados públicos são readonly e congelados.
 */

import type {
  Appointment,
  AppointmentStatus,
} from "@/domain/core/agenda";
import type { Assignment } from "@/domain/core/assignment";
import type {
  AppointmentId,
  AssignmentId,
  CaseId,
  ProfessionalProfileId,
} from "@/domain/core/ids";
import type { IsoDateTime } from "@/domain/core/common";
import { isoDateTimeToEpoch } from "@/domain/core/common";
import type { AppointmentListOptions } from "@/domain/services/appointment-service";
import type { PageRequest } from "@/domain/services/pagination";

// ---- Tipos públicos --------------------------------------------------------

export const AVAILABILITY_SCOPE = "accessible_cases" as const;
export type AvailabilityScope = typeof AVAILABILITY_SCOPE;

export type AppointmentAvailabilityCandidate = Readonly<{
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  assignmentId: AssignmentId;
  excludeAppointmentId?: AppointmentId;
}>;

export type AppointmentAvailabilityConflict = Readonly<{
  appointmentId: AppointmentId;
  caseId: CaseId;
  assignmentId: AssignmentId;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  status: AppointmentStatus;
}>;

export type AppointmentAvailabilityErrorSource = "assignments" | "appointments";

export type AppointmentAvailabilityResult =
  | Readonly<{
      status: "available";
      scope: AvailabilityScope;
      conflicts: readonly AppointmentAvailabilityConflict[];
    }>
  | Readonly<{
      status: "conflicts";
      scope: AvailabilityScope;
      conflicts: readonly AppointmentAvailabilityConflict[];
    }>
  | Readonly<{
      status: "not_applicable";
      scope: AvailabilityScope;
      reason: string;
    }>
  | Readonly<{
      status: "error";
      scope: AvailabilityScope;
      source: AppointmentAvailabilityErrorSource;
      message: string;
    }>;

// ---- Funções puras ---------------------------------------------------------

/**
 * Sobreposição estrita meia-aberta [start, end).
 * Períodos que apenas encostam nos limites NÃO conflitam.
 */
export function periodsOverlapHalfOpen(
  aStart: IsoDateTime,
  aEnd: IsoDateTime,
  bStart: IsoDateTime,
  bEnd: IsoDateTime,
): boolean {
  const aS = isoDateTimeToEpoch(aStart);
  const aE = isoDateTimeToEpoch(aEnd);
  const bS = isoDateTimeToEpoch(bStart);
  const bE = isoDateTimeToEpoch(bEnd);
  return aS < bE && aE > bS;
}

/**
 * Coleta todos os assignmentId cujo `professionalProfileId` é igual ao
 * informado, deduplicados. Independe do status atual do vínculo.
 */
export function collectProfessionalAssignmentIds(
  assignments: readonly Assignment[],
  professionalProfileId: ProfessionalProfileId,
): readonly AssignmentId[] {
  const set = new Set<AssignmentId>();
  for (const a of assignments) {
    if (a.professionalProfileId === professionalProfileId) {
      set.add(a.id);
    }
  }
  return Object.freeze(Array.from(set));
}

/**
 * Constrói opções para `AppointmentService.list` a partir do candidato.
 * `statuses` fica travado em ["scheduled"].
 */
export function buildAppointmentAvailabilityListOptions(
  candidate: Readonly<{ startsAt: IsoDateTime; endsAt: IsoDateTime }>,
  assignmentIds: readonly AssignmentId[],
  page: PageRequest,
): AppointmentListOptions {
  return {
    rangeFrom: candidate.startsAt,
    rangeTo: candidate.endsAt,
    statuses: ["scheduled"] as const,
    assignmentIds,
    page,
  };
}

/**
 * Filtra os compromissos retornados pelo serviço aplicando as regras
 * finais: status scheduled, mesmo profissional, sobreposição meia-aberta
 * e exclusão do próprio compromisso durante edição.
 */
export function filterAppointmentAvailabilityConflicts(
  appointments: readonly Appointment[],
  candidate: AppointmentAvailabilityCandidate,
  professionalAssignmentIds: ReadonlySet<AssignmentId>,
): readonly AppointmentAvailabilityConflict[] {
  const out: AppointmentAvailabilityConflict[] = [];
  for (const a of appointments) {
    if (a.status !== "scheduled") continue;
    if (a.assignmentId === undefined) continue;
    if (!professionalAssignmentIds.has(a.assignmentId)) continue;
    if (
      candidate.excludeAppointmentId !== undefined &&
      a.id === candidate.excludeAppointmentId
    ) {
      continue;
    }
    if (
      !periodsOverlapHalfOpen(
        a.startsAt,
        a.endsAt,
        candidate.startsAt,
        candidate.endsAt,
      )
    ) {
      continue;
    }
    out.push(
      Object.freeze({
        appointmentId: a.id,
        caseId: a.caseId,
        assignmentId: a.assignmentId,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      }),
    );
  }
  return Object.freeze(out);
}

/**
 * Ordenação determinística: por instante de início e, em empate, pelo
 * `appointmentId` como desempate estável.
 */
export function sortAppointmentAvailabilityConflicts(
  conflicts: readonly AppointmentAvailabilityConflict[],
): readonly AppointmentAvailabilityConflict[] {
  const arr = conflicts.slice().sort((x, y) => {
    const t =
      isoDateTimeToEpoch(x.startsAt) - isoDateTimeToEpoch(y.startsAt);
    if (t !== 0) return t;
    if (x.appointmentId < y.appointmentId) return -1;
    if (x.appointmentId > y.appointmentId) return 1;
    return 0;
  });
  return Object.freeze(arr);
}

// ---- Fábricas de resultado -------------------------------------------------

export function availabilityAvailable(): AppointmentAvailabilityResult {
  return Object.freeze({
    status: "available" as const,
    scope: AVAILABILITY_SCOPE,
    conflicts: Object.freeze([]),
  });
}

export function availabilityConflicts(
  conflicts: readonly AppointmentAvailabilityConflict[],
): AppointmentAvailabilityResult {
  return Object.freeze({
    status: "conflicts" as const,
    scope: AVAILABILITY_SCOPE,
    conflicts,
  });
}

export function availabilityNotApplicable(
  reason: string,
): AppointmentAvailabilityResult {
  return Object.freeze({
    status: "not_applicable" as const,
    scope: AVAILABILITY_SCOPE,
    reason,
  });
}

export function availabilityError(
  source: AppointmentAvailabilityErrorSource,
  message: string,
): AppointmentAvailabilityResult {
  return Object.freeze({
    status: "error" as const,
    scope: AVAILABILITY_SCOPE,
    source,
    message,
  });
}
