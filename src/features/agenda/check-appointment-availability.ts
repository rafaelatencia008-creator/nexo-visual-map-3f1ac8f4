/**
 * LV-09.1B.7.1 — Motor consultivo de disponibilidade (orquestrador).
 *
 * Orquestra os serviços oficiais de assignments e appointments para
 * detectar conflitos de horário do MESMO profissional. Toda a lógica de
 * comparação é feita pelos helpers puros em `./availability`.
 *
 * Sem React, sem I/O direto, sem `Date.now()`. Não altera contratos.
 */

import type { Appointment } from "@/domain/core/agenda";
import type { Assignment } from "@/domain/core/assignment";
import type {
  AppointmentId,
  AssignmentId,
  CaseId,
} from "@/domain/core/ids";
import { isIsoDateTime, isoDateTimeToEpoch } from "@/domain/core/common";
import type { AppointmentService } from "@/domain/services/appointment-service";
import type { AssignmentService } from "@/domain/services/assignment-service";
import type { ServiceContext } from "@/domain/services/context";
import type { PageRequest } from "@/domain/services/pagination";
import type { ServiceError, ServiceResult } from "@/domain/services/result";
import {
  availabilityAvailable,
  availabilityConflicts,
  availabilityError,
  availabilityNotApplicable,
  buildAppointmentAvailabilityListOptions,
  collectProfessionalAssignmentIds,
  filterAppointmentAvailabilityConflicts,
  sortAppointmentAvailabilityConflicts,
  type AppointmentAvailabilityCandidate,
  type AppointmentAvailabilityResult,
} from "./availability";

// ---- Constantes locais -----------------------------------------------------

export const ASSIGNMENTS_PAGE_LIMIT = 100;
export const APPOINTMENTS_PAGE_LIMIT = 100;
export const ASSIGNMENTS_MAX_PAGES = 200;
export const APPOINTMENTS_MAX_PAGES = 200;

// ---- Serviços mínimos requeridos ------------------------------------------

export type AvailabilityServices = Readonly<{
  assignments: Pick<AssignmentService, "listByCase">;
  appointments: Pick<AppointmentService, "list">;
}>;

export type CheckAppointmentAvailabilityInput = Readonly<{
  services: AvailabilityServices;
  context: ServiceContext;
  accessibleCases: readonly CaseId[];
  selectedAssignment: Assignment | null;
  candidate: AppointmentAvailabilityCandidate | null;
  /** Overrides opcionais dos limites de página (uso em testes). */
  pageLimits?: Readonly<{
    assignments?: number;
    appointments?: number;
  }>;
}>;

// ---- Motor principal -------------------------------------------------------

export async function checkAppointmentAvailability(
  input: CheckAppointmentAvailabilityInput,
): Promise<AppointmentAvailabilityResult> {
  const { services, context, accessibleCases, selectedAssignment, candidate } =
    input;

  // Pré-condições — sempre `not_applicable`, nunca `error`.
  if (selectedAssignment === null) {
    return availabilityNotApplicable("no_selected_assignment");
  }
  if (candidate === null) {
    return availabilityNotApplicable("no_candidate");
  }
  if (!isIsoDateTime(candidate.startsAt) || !isIsoDateTime(candidate.endsAt)) {
    return availabilityNotApplicable("invalid_period");
  }
  if (
    isoDateTimeToEpoch(candidate.startsAt) >=
    isoDateTimeToEpoch(candidate.endsAt)
  ) {
    return availabilityNotApplicable("invalid_period");
  }
  if (accessibleCases.length === 0) {
    return availabilityAvailable();
  }

  const assignmentsLimit = clampLimit(
    input.pageLimits?.assignments,
    ASSIGNMENTS_PAGE_LIMIT,
  );
  const appointmentsLimit = clampLimit(
    input.pageLimits?.appointments,
    APPOINTMENTS_PAGE_LIMIT,
  );

  // 1) Coleta assignments dos processos acessíveis (paginação completa).
  const collectedAssignments = new Map<AssignmentId, Assignment>();
  for (const caseId of dedupCaseIds(accessibleCases)) {
    const res = await paginateAssignments(
      services.assignments,
      context,
      caseId,
      assignmentsLimit,
    );
    if (!res.ok) {
      return availabilityError("assignments", res.error.code);
    }
    for (const a of res.items) {
      if (!collectedAssignments.has(a.id)) collectedAssignments.set(a.id, a);
    }
  }
  // Garante que o próprio selectedAssignment participa da identidade
  // profissional, ainda que o caso não faça parte de accessibleCases.
  if (!collectedAssignments.has(selectedAssignment.id)) {
    collectedAssignments.set(selectedAssignment.id, selectedAssignment);
  }

  // 2) Todos os assignmentIds do mesmo profissional.
  const profAssignmentIds = collectProfessionalAssignmentIds(
    Array.from(collectedAssignments.values()),
    selectedAssignment.professionalProfileId,
  );
  if (profAssignmentIds.length === 0) {
    return availabilityAvailable();
  }
  const profAssignmentSet = new Set<AssignmentId>(profAssignmentIds);

  // 3) Consulta appointments com sobreposição de intervalo (paginação completa).
  const seenAppointments = new Map<AppointmentId, Appointment>();
  let cursor: string | undefined = undefined;
  for (let page = 0; page < APPOINTMENTS_MAX_PAGES; page += 1) {
    const req: PageRequest =
      cursor === undefined
        ? { limit: appointmentsLimit }
        : { limit: appointmentsLimit, cursor };
    const options = buildAppointmentAvailabilityListOptions(
      candidate,
      profAssignmentIds,
      req,
    );
    const res = await services.appointments.list(context, options);
    if (!res.ok) return availabilityError("appointments", res.error.code);
    for (const a of res.data.items) {
      if (!seenAppointments.has(a.id)) seenAppointments.set(a.id, a);
    }
    if (res.data.nextCursor === undefined) {
      cursor = undefined;
      break;
    }
    cursor = res.data.nextCursor;
  }
  if (cursor !== undefined) {
    return availabilityError("appointments", "pagination_exhausted");
  }

  // 4) Filtragem final e ordenação.
  const raw = filterAppointmentAvailabilityConflicts(
    Array.from(seenAppointments.values()),
    candidate,
    profAssignmentSet,
  );
  const sorted = sortAppointmentAvailabilityConflicts(raw);
  if (sorted.length === 0) return availabilityAvailable();
  return availabilityConflicts(sorted);
}

// ---- Auxiliares locais -----------------------------------------------------

function clampLimit(v: number | undefined, fallback: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 100) {
    return fallback;
  }
  return v;
}

function dedupCaseIds(cases: readonly CaseId[]): readonly CaseId[] {
  const set = new Set<CaseId>();
  const out: CaseId[] = [];
  for (const c of cases) {
    if (!set.has(c)) {
      set.add(c);
      out.push(c);
    }
  }
  return out;
}

type PaginatedAssignments =
  | Readonly<{ ok: true; items: readonly Assignment[] }>
  | Readonly<{ ok: false; error: ServiceError }>;

async function paginateAssignments(
  service: Pick<AssignmentService, "listByCase">,
  context: ServiceContext,
  caseId: CaseId,
  limit: number,
): Promise<PaginatedAssignments> {
  const items: Assignment[] = [];
  let cursor: string | undefined = undefined;
  for (let page = 0; page < ASSIGNMENTS_MAX_PAGES; page += 1) {
    const req: PageRequest =
      cursor === undefined ? { limit } : { limit, cursor };
    const res: ServiceResult<{
      readonly items: readonly Assignment[];
      readonly nextCursor?: string;
    }> = await service.listByCase(context, caseId, req);
    if (!res.ok) {
      // `not_found` de caso inacessível é tratado como sem assignments.
      if (res.error.code === "not_found" || res.error.code === "forbidden") {
        return { ok: true, items };
      }
      return { ok: false, error: res.error };
    }
    for (const a of res.data.items) items.push(a);
    if (res.data.nextCursor === undefined) {
      return { ok: true, items };
    }
    cursor = res.data.nextCursor;
  }
  return {
    ok: false,
    error: { code: "internal_error", message: "pagination_exhausted" },
  };
}
