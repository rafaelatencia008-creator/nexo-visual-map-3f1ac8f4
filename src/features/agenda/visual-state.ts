/**
 * LV-09.1B.2 — Helpers puros e determinísticos de estado visual da Agenda.
 *
 * Regras:
 *  - funções puras, sem React, sem `Date.now()` interno, sem I/O;
 *  - `overdue` é uma interpretação visual (não é status oficial);
 *  - a hierarquia de estados visuais de prazo é:
 *      cancelled > completed > overdue > urgent > high > normal > low
 *  - o atraso começa quando `epoch(dueAt) < referenceEpoch`
 *    (igualdade NÃO é atrasado).
 */

import type { Appointment, Deadline } from "@/domain/core/agenda";
import { isoDateTimeToEpoch } from "@/domain/core/common";

// ---- Prazo ----------------------------------------------------------------

export type DeadlineVisualState =
  | "cancelled"
  | "completed"
  | "overdue"
  | "urgent"
  | "high"
  | "normal"
  | "low";

export function getDeadlineVisualState(
  deadline: Deadline,
  referenceEpoch: number,
): DeadlineVisualState {
  if (deadline.status === "cancelled") return "cancelled";
  if (deadline.status === "completed") return "completed";
  // status === "pending"
  if (isoDateTimeToEpoch(deadline.dueAt) < referenceEpoch) return "overdue";
  if (deadline.priority === "urgent") return "urgent";
  if (deadline.priority === "high") return "high";
  if (deadline.priority === "normal") return "normal";
  return "low";
}

export function isDeadlineOverdue(
  deadline: Deadline,
  referenceEpoch: number,
): boolean {
  return (
    deadline.status === "pending" &&
    isoDateTimeToEpoch(deadline.dueAt) < referenceEpoch
  );
}

export type DeadlineVisualPresentation = Readonly<{
  state: DeadlineVisualState;
  stateLabel: string;
  containerClass: string;
  accentClass: string;
  stateBadgeClass: string;
}>;

const DEADLINE_STATE_LABEL: Record<DeadlineVisualState, string> = {
  cancelled: "Cancelado",
  completed: "Cumprido",
  overdue: "Atrasado",
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const DEADLINE_CONTAINER_CLASS: Record<DeadlineVisualState, string> = {
  cancelled: "border-border/60 bg-muted/30",
  completed: "border-emerald-500/40 bg-emerald-500/5",
  overdue: "border-destructive/60 bg-destructive/10",
  urgent: "border-destructive/40 bg-destructive/5",
  high: "border-amber-500/50 bg-amber-500/5",
  normal: "border-border/70 bg-card",
  low: "border-border/60 bg-card",
};

const DEADLINE_ACCENT_CLASS: Record<DeadlineVisualState, string> = {
  cancelled: "bg-muted-foreground/40",
  completed: "bg-emerald-500",
  overdue: "bg-destructive",
  urgent: "bg-destructive/70",
  high: "bg-amber-500",
  normal: "bg-primary/60",
  low: "bg-muted-foreground/30",
};

const DEADLINE_BADGE_CLASS: Record<DeadlineVisualState, string> = {
  cancelled: "border-transparent bg-muted text-muted-foreground",
  completed:
    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  overdue: "border-transparent bg-destructive text-destructive-foreground",
  urgent:
    "border-transparent bg-destructive/15 text-destructive dark:text-destructive",
  high: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  normal: "border-border bg-background text-foreground",
  low: "border-border bg-background text-muted-foreground",
};

export function getDeadlinePresentation(
  deadline: Deadline,
  referenceEpoch: number,
): DeadlineVisualPresentation {
  const state = getDeadlineVisualState(deadline, referenceEpoch);
  return {
    state,
    stateLabel: DEADLINE_STATE_LABEL[state],
    containerClass: DEADLINE_CONTAINER_CLASS[state],
    accentClass: DEADLINE_ACCENT_CLASS[state],
    stateBadgeClass: DEADLINE_BADGE_CLASS[state],
  };
}

// ---- Compromisso ----------------------------------------------------------

export type AppointmentVisualState = "scheduled" | "completed" | "cancelled";

export function getAppointmentVisualState(
  appointment: Appointment,
): AppointmentVisualState {
  return appointment.status;
}

export type AppointmentVisualPresentation = Readonly<{
  state: AppointmentVisualState;
  stateLabel: string;
  containerClass: string;
  accentClass: string;
  stateBadgeClass: string;
}>;

const APPOINTMENT_STATE_LABEL: Record<AppointmentVisualState, string> = {
  scheduled: "Agendado",
  completed: "Realizado",
  cancelled: "Cancelado",
};

const APPOINTMENT_CONTAINER_CLASS: Record<AppointmentVisualState, string> = {
  scheduled: "border-primary/40 bg-primary/5",
  completed: "border-emerald-500/40 bg-emerald-500/5",
  cancelled: "border-border/60 bg-muted/30",
};

const APPOINTMENT_ACCENT_CLASS: Record<AppointmentVisualState, string> = {
  scheduled: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-muted-foreground/40",
};

const APPOINTMENT_BADGE_CLASS: Record<AppointmentVisualState, string> = {
  scheduled:
    "border-transparent bg-primary/15 text-primary dark:text-primary",
  completed:
    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "border-transparent bg-muted text-muted-foreground",
};

export function getAppointmentPresentation(
  appointment: Appointment,
): AppointmentVisualPresentation {
  const state = getAppointmentVisualState(appointment);
  return {
    state,
    stateLabel: APPOINTMENT_STATE_LABEL[state],
    containerClass: APPOINTMENT_CONTAINER_CLASS[state],
    accentClass: APPOINTMENT_ACCENT_CLASS[state],
    stateBadgeClass: APPOINTMENT_BADGE_CLASS[state],
  };
}
