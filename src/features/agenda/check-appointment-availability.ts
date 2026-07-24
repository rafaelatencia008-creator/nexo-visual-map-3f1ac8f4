/**
 * LV-09.1B.7.1 — Orquestrador consultivo de disponibilidade.
 *
 * Consulta o serviço oficial `appointments.list` (via `MockDomainEnvironment`)
 * paginando pelo cursor opaco e devolve uma decisão tipada. Consultivo puro:
 * NÃO grava, NÃO bloqueia, NÃO altera contexto, NÃO emite notificações,
 * NÃO navega, NÃO abre diálogo.
 *
 * Regras — vide `availability.ts`:
 *   - intervalos semiabertos; encostados não conflitam;
 *   - apenas `scheduled` participa;
 *   - assignment diferente não conflita;
 *   - ausência de `assignmentId` na proposta → `assignment_required`;
 *   - `endsAt <= startsAt` → `invalid_interval` (sem chamar serviço);
 *   - falha do serviço → `consultation_failed` (nunca `available`);
 *   - excesso de páginas → `pagination_limit` (nunca `available`);
 *   - `excludeAppointmentId` ignora o próprio compromisso.
 */

import type { Appointment } from "@/domain/core/agenda";
import type { IsoDateTime } from "@/domain/core/common";
import type { AppointmentId, AssignmentId } from "@/domain/core/ids";
import type { AppointmentService } from "@/domain/services/appointment-service";
import type { ServiceContext } from "@/domain/services/context";
import {
  decisionAvailable,
  decisionConflict,
  decisionIndeterminate,
  intervalsOverlap,
  isCandidateForConflict,
  normalizeInterval,
  toConflict,
  type AppointmentAvailabilityConflict,
  type AppointmentAvailabilityDecision,
} from "./availability";

/**
 * Limite oficial da paginação (compatível com `PAGE_LIMIT_MAX`).
 */
export const AVAILABILITY_PAGE_LIMIT = 100;

/**
 * Teto defensivo de páginas percorridas. Além disso a consulta é
 * abortada com `pagination_limit`.
 */
export const AVAILABILITY_MAX_PAGES = 100;

export interface CheckAppointmentAvailabilityInput {
  readonly startsAt: IsoDateTime;
  readonly endsAt: IsoDateTime;
  readonly assignmentId?: AssignmentId;
  readonly excludeAppointmentId?: AppointmentId;
}

/**
 * Superfície mínima do ambiente necessária ao motor. Qualquer objeto
 * que exponha `services.appointments.list` satisfaz o contrato; em
 * produção é o `MockDomainEnvironment` oficial.
 */
export type AvailabilityEnvironment = Readonly<{
  services: Readonly<{
    appointments: Pick<AppointmentService, "list">;
  }>;
}>;

export async function checkAppointmentAvailability(
  environment: AvailabilityEnvironment,
  context: ServiceContext,
  input: CheckAppointmentAvailabilityInput,
): Promise<AppointmentAvailabilityDecision> {
  // 1) Intervalo inválido: não chama serviço.
  const normalized = normalizeInterval(input.startsAt, input.endsAt);
  if (normalized === null) return decisionIndeterminate("invalid_interval");

  // 2) Responsável obrigatório para decisão vinculante.
  if (input.assignmentId === undefined) {
    return decisionIndeterminate("assignment_required");
  }

  const assignmentId = input.assignmentId;
  const exclude = input.excludeAppointmentId;
  const collected: AppointmentAvailabilityConflict[] = [];

  let cursor: string | undefined = undefined;
  for (let page = 0; page < AVAILABILITY_MAX_PAGES; page += 1) {
    let result;
    try {
      result = await environment.services.appointments.list(context, {
        page:
          cursor === undefined
            ? { limit: AVAILABILITY_PAGE_LIMIT }
            : { limit: AVAILABILITY_PAGE_LIMIT, cursor },
        statuses: ["scheduled"],
        assignmentIds: [assignmentId],
      });
    } catch {
      return decisionIndeterminate("consultation_failed");
    }

    if (!result.ok) return decisionIndeterminate("consultation_failed");

    const items: readonly Appointment[] = result.data.items;
    for (const existing of items) {
      if (!isCandidateForConflict(existing, assignmentId, exclude)) continue;
      // Isolamento organizacional: o serviço já filtra por contexto,
      // mas verificamos aqui como segunda barreira defensiva.
      if (existing.organizationId !== context.organizationId) continue;
      const s = Date.parse(existing.startsAt);
      const e = Date.parse(existing.endsAt);
      if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
      if (intervalsOverlap(normalized.startEpoch, normalized.endEpoch, s, e)) {
        collected.push(toConflict(existing));
      }
    }

    const next: string | undefined = result.data.nextCursor;
    if (next === undefined) {
      if (collected.length === 0) return decisionAvailable();
      return decisionConflict(collected);
    }
    cursor = next;
  }

  // 3) Ultrapassou o teto defensivo com cursor ainda presente.
  return decisionIndeterminate("pagination_limit");
}
