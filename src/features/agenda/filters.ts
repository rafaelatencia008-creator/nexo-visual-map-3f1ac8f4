/**
 * LV-09.1B.3 — Modelo puro de filtros da Agenda.
 *
 * Sem React, sem I/O, sem `Date.now()`. Traduz filtros da interface para as
 * opções oficiais dos serviços `DeadlineService` e `AppointmentService`.
 */

import type { CaseId } from "@/domain/core/ids";
import type {
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
  DeadlineKind,
  DeadlinePriority,
  DeadlineStatus,
} from "@/domain/core/agenda";
import type { AppointmentListOptions } from "@/domain/services/appointment-service";
import type { DeadlineListOptions } from "@/domain/services/deadline-service";

// ---- Modelo -------------------------------------------------------------

export type AgendaItemFilter = "all" | "deadlines" | "appointments";
export type AgendaLifecycleFilter =
  | "all"
  | "open"
  | "completed"
  | "cancelled";

export type AgendaFilters = Readonly<{
  search: string;
  itemType: AgendaItemFilter;
  caseId?: CaseId;
  lifecycle: AgendaLifecycleFilter;
  deadlineKind?: DeadlineKind;
  deadlinePriority?: DeadlinePriority;
  appointmentKind?: AppointmentKind;
  appointmentMode?: AppointmentMode;
}>;

export const EMPTY_AGENDA_FILTERS: AgendaFilters = Object.freeze({
  search: "",
  itemType: "all",
  lifecycle: "all",
}) as AgendaFilters;

// ---- Mapeamento de situação --------------------------------------------

function mapDeadlineStatuses(
  lifecycle: AgendaLifecycleFilter,
): readonly DeadlineStatus[] | undefined {
  if (lifecycle === "open") return ["pending"];
  if (lifecycle === "completed") return ["completed"];
  if (lifecycle === "cancelled") return ["cancelled"];
  return undefined;
}

function mapAppointmentStatuses(
  lifecycle: AgendaLifecycleFilter,
): readonly AppointmentStatus[] | undefined {
  if (lifecycle === "open") return ["scheduled"];
  if (lifecycle === "completed") return ["completed"];
  if (lifecycle === "cancelled") return ["cancelled"];
  return undefined;
}

function trimmedSearch(search: string): string | undefined {
  const t = search.trim();
  return t.length > 0 ? t : undefined;
}

// ---- Construção das opções oficiais -------------------------------------

export function buildDeadlineListOptions(f: AgendaFilters): DeadlineListOptions {
  const opts: {
    -readonly [K in keyof DeadlineListOptions]: DeadlineListOptions[K];
  } = {};
  const s = trimmedSearch(f.search);
  if (s !== undefined) opts.search = s;
  if (f.caseId !== undefined) opts.caseId = f.caseId;
  const statuses = mapDeadlineStatuses(f.lifecycle);
  if (statuses !== undefined) opts.statuses = statuses;
  if (f.deadlineKind !== undefined) opts.kinds = [f.deadlineKind];
  if (f.deadlinePriority !== undefined) opts.priorities = [f.deadlinePriority];
  return opts;
}

export function buildAppointmentListOptions(
  f: AgendaFilters,
): AppointmentListOptions {
  const opts: {
    -readonly [K in keyof AppointmentListOptions]: AppointmentListOptions[K];
  } = {};
  const s = trimmedSearch(f.search);
  if (s !== undefined) opts.search = s;
  if (f.caseId !== undefined) opts.caseId = f.caseId;
  const statuses = mapAppointmentStatuses(f.lifecycle);
  if (statuses !== undefined) opts.statuses = statuses;
  if (f.appointmentKind !== undefined) opts.kinds = [f.appointmentKind];
  if (f.appointmentMode !== undefined) opts.modes = [f.appointmentMode];
  return opts;
}

// ---- Contagem/limpeza --------------------------------------------------

export function countActiveFilters(f: AgendaFilters): number {
  let n = 0;
  if (f.search.trim().length > 0) n += 1;
  if (f.itemType !== "all") n += 1;
  if (f.caseId !== undefined) n += 1;
  if (f.lifecycle !== "all") n += 1;
  if (f.deadlineKind !== undefined) n += 1;
  if (f.deadlinePriority !== undefined) n += 1;
  if (f.appointmentKind !== undefined) n += 1;
  if (f.appointmentMode !== undefined) n += 1;
  return n;
}

export function hasActiveFilters(f: AgendaFilters): boolean {
  return countActiveFilters(f) > 0;
}

/**
 * Ao mudar o tipo de item, remove filtros exclusivos incompatíveis.
 * Preferência da especificação: limpar (não apenas ocultar).
 */
export function sanitizeForItemType(
  f: AgendaFilters,
  next: AgendaItemFilter,
): AgendaFilters {
  if (next === f.itemType) return f;
  if (next === "deadlines") {
    return {
      ...f,
      itemType: next,
      appointmentKind: undefined,
      appointmentMode: undefined,
    };
  }
  if (next === "appointments") {
    return {
      ...f,
      itemType: next,
      deadlineKind: undefined,
      deadlinePriority: undefined,
    };
  }
  return { ...f, itemType: next };
}

/**
 * Painel "Próximos prazos" deve aparecer apenas quando o contexto permite
 * prazos pendentes futuros. Oculto para "Compromissos" e para situações
 * "Concluídas" / "Canceladas".
 */
export function shouldShowUpcomingPanel(f: AgendaFilters): boolean {
  if (f.itemType === "appointments") return false;
  if (f.lifecycle === "completed" || f.lifecycle === "cancelled") return false;
  return true;
}

/** Indica se o serviço de prazos deve ser consultado. */
export function shouldQueryDeadlines(f: AgendaFilters): boolean {
  return f.itemType !== "appointments";
}

/** Indica se o serviço de compromissos deve ser consultado. */
export function shouldQueryAppointments(f: AgendaFilters): boolean {
  return f.itemType !== "deadlines";
}

// ---- Resumo textual dos filtros ativos ---------------------------------

export type AgendaFilterChip = Readonly<{
  key:
    | "search"
    | "itemType"
    | "caseId"
    | "lifecycle"
    | "deadlineKind"
    | "deadlinePriority"
    | "appointmentKind"
    | "appointmentMode";
  label: string;
}>;

export type AgendaFilterLabels = Readonly<{
  itemType: Record<AgendaItemFilter, string>;
  lifecycle: Record<AgendaLifecycleFilter, string>;
  deadlineKind: Record<DeadlineKind, string>;
  deadlinePriority: Record<DeadlinePriority, string>;
  appointmentKind: Record<AppointmentKind, string>;
  appointmentMode: Record<AppointmentMode, string>;
  caseLabelFor: (caseId: CaseId) => string;
}>;

export function summarizeFilters(
  f: AgendaFilters,
  labels: AgendaFilterLabels,
): readonly AgendaFilterChip[] {
  const chips: AgendaFilterChip[] = [];
  const s = f.search.trim();
  if (s.length > 0) chips.push({ key: "search", label: `Busca: "${s}"` });
  if (f.itemType !== "all")
    chips.push({ key: "itemType", label: `Exibir: ${labels.itemType[f.itemType]}` });
  if (f.caseId !== undefined)
    chips.push({ key: "caseId", label: `Processo: ${labels.caseLabelFor(f.caseId)}` });
  if (f.lifecycle !== "all")
    chips.push({
      key: "lifecycle",
      label: `Situação: ${labels.lifecycle[f.lifecycle]}`,
    });
  if (f.deadlineKind !== undefined)
    chips.push({
      key: "deadlineKind",
      label: `Tipo de prazo: ${labels.deadlineKind[f.deadlineKind]}`,
    });
  if (f.deadlinePriority !== undefined)
    chips.push({
      key: "deadlinePriority",
      label: `Prioridade: ${labels.deadlinePriority[f.deadlinePriority]}`,
    });
  if (f.appointmentKind !== undefined)
    chips.push({
      key: "appointmentKind",
      label: `Tipo de compromisso: ${labels.appointmentKind[f.appointmentKind]}`,
    });
  if (f.appointmentMode !== undefined)
    chips.push({
      key: "appointmentMode",
      label: `Modalidade: ${labels.appointmentMode[f.appointmentMode]}`,
    });
  return chips;
}

/** Remove um filtro individual pela chave do chip. */
export function removeFilter(
  f: AgendaFilters,
  key: AgendaFilterChip["key"],
): AgendaFilters {
  switch (key) {
    case "search":
      return { ...f, search: "" };
    case "itemType":
      return sanitizeForItemType(f, "all");
    case "caseId":
      return { ...f, caseId: undefined };
    case "lifecycle":
      return { ...f, lifecycle: "all" };
    case "deadlineKind":
      return { ...f, deadlineKind: undefined };
    case "deadlinePriority":
      return { ...f, deadlinePriority: undefined };
    case "appointmentKind":
      return { ...f, appointmentKind: undefined };
    case "appointmentMode":
      return { ...f, appointmentMode: undefined };
  }
}
