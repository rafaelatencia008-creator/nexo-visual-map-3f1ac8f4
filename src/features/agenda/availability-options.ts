/**
 * LV-09.1B.7.2 — Carregamento paginado de processos e vínculos para a
 * página consultiva de disponibilidade da Agenda.
 *
 * Puro em relação a React. Usa somente:
 *   - environment.services.cases.list
 *   - environment.services.assignments.listByCase
 *
 * Percorre todas as páginas com `PAGE_LIMIT_MAX`. Nunca devolve lista
 * parcial como se fosse completa: em falha do serviço ou excedente de
 * páginas, retorna `error`. Não acessa `snapshot()`, store, seed ou
 * `appointments.list`.
 */

import type { Case } from "@/domain/core/case";
import type { Assignment } from "@/domain/core/assignment";
import type { CaseId } from "@/domain/core/ids";
import type { AppointmentService } from "@/domain/services/appointment-service";
import type { AssignmentService } from "@/domain/services/assignment-service";
import type { CaseService } from "@/domain/services/case-service";
import type { ServiceContext } from "@/domain/services/context";
import { PAGE_LIMIT_MAX } from "@/domain/services/pagination";

// ---- Ambiente estrutural mínimo -----------------------------------------

export type AvailabilityPageEnvironment = Readonly<{
  services: Readonly<{
    cases: Pick<CaseService, "list">;
    assignments: Pick<AssignmentService, "listByCase">;
    appointments: Pick<AppointmentService, "list">;
  }>;
}>;

// ---- Teto defensivo próprio ---------------------------------------------

export const AVAILABILITY_OPTIONS_MAX_PAGES = 20;
export const AVAILABILITY_OPTIONS_PAGE_LIMIT = PAGE_LIMIT_MAX;

// ---- Resultado -----------------------------------------------------------

export type AvailabilityOptionsResult<T> =
  | Readonly<{
      kind: "ready";
      items: readonly T[];
    }>
  | Readonly<{
      kind: "error";
      reason: "consultation_failed" | "pagination_limit";
    }>;

// ---- Rótulos de vínculo --------------------------------------------------

const ASSIGNMENT_ROLE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  lead_professional: "Profissional responsável",
  co_professional: "Profissional auxiliar",
  reviewer: "Revisor",
  collaborator: "Colaborador",
  read_only: "Somente leitura",
});

export function formatAvailabilityAssignmentLabel(assignment: Assignment): string {
  const role = ASSIGNMENT_ROLE_LABEL[assignment.role] ?? assignment.role;
  const section =
    typeof assignment.section === "string" && assignment.section.trim().length > 0
      ? ` · ${assignment.section.trim()}`
      : "";
  const shortId = String(assignment.id).slice(-6);
  return `${role}${section} · #${shortId}`;
}

// ---- Ordenação -----------------------------------------------------------

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortCases(cases: readonly Case[]): readonly Case[] {
  const arr = cases.slice();
  arr.sort((a, b) => {
    const r = compareStrings(a.reference, b.reference);
    if (r !== 0) return r;
    const t = compareStrings(a.title, b.title);
    if (t !== 0) return t;
    return compareStrings(String(a.id), String(b.id));
  });
  return Object.freeze(arr);
}

function sortAssignments(items: readonly Assignment[]): readonly Assignment[] {
  const arr = items.slice();
  arr.sort((a, b) => {
    const r = compareStrings(a.role, b.role);
    if (r !== 0) return r;
    const sa = typeof a.section === "string" ? a.section : "";
    const sb = typeof b.section === "string" ? b.section : "";
    const s = compareStrings(sa, sb);
    if (s !== 0) return s;
    return compareStrings(String(a.id), String(b.id));
  });
  return Object.freeze(arr);
}

// ---- Processos -----------------------------------------------------------

export async function loadAvailabilityCases(
  environment: AvailabilityPageEnvironment,
  context: ServiceContext,
): Promise<AvailabilityOptionsResult<Case>> {
  const seen = new Set<string>();
  const collected: Case[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < AVAILABILITY_OPTIONS_MAX_PAGES; page += 1) {
    let res;
    try {
      res = await environment.services.cases.list(context, {
        page:
          cursor === undefined
            ? { limit: AVAILABILITY_OPTIONS_PAGE_LIMIT }
            : { limit: AVAILABILITY_OPTIONS_PAGE_LIMIT, cursor },
      });
    } catch {
      return Object.freeze({ kind: "error", reason: "consultation_failed" });
    }
    if (!res.ok) {
      return Object.freeze({ kind: "error", reason: "consultation_failed" });
    }
    for (const c of res.data.items) {
      const key = String(c.id);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(c);
    }
    const next: string | undefined = res.data.nextCursor;
    if (next === undefined) {
      return Object.freeze({ kind: "ready", items: sortCases(collected) });
    }
    cursor = next;
  }
  return Object.freeze({ kind: "error", reason: "pagination_limit" });
}

// ---- Vínculos ativos -----------------------------------------------------

export async function loadActiveAssignmentsForCase(
  environment: AvailabilityPageEnvironment,
  context: ServiceContext,
  caseId: CaseId,
): Promise<AvailabilityOptionsResult<Assignment>> {
  const seen = new Set<string>();
  const collected: Assignment[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < AVAILABILITY_OPTIONS_MAX_PAGES; page += 1) {
    let res;
    try {
      res = await environment.services.assignments.listByCase(
        context,
        caseId,
        cursor === undefined
          ? { limit: AVAILABILITY_OPTIONS_PAGE_LIMIT }
          : { limit: AVAILABILITY_OPTIONS_PAGE_LIMIT, cursor },
      );
    } catch {
      return Object.freeze({ kind: "error", reason: "consultation_failed" });
    }
    if (!res.ok) {
      return Object.freeze({ kind: "error", reason: "consultation_failed" });
    }
    for (const a of res.data.items) {
      if (a.status !== "active") continue;
      const key = String(a.id);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(a);
    }
    const next: string | undefined = res.data.nextCursor;
    if (next === undefined) {
      return Object.freeze({ kind: "ready", items: sortAssignments(collected) });
    }
    cursor = next;
  }
  return Object.freeze({ kind: "error", reason: "pagination_limit" });
}
