/**
 * Barrel do domínio oficial — LV-07.1 + correção LV-07.1.1.
 */

export * from "./ids";
export * from "./common";
export * from "./access";
export * from "./organization";
export * from "./professional";
export * from "./case";
export * from "./person";
export * from "./assignment";
export * from "./case-plan";
export * from "./case-audit";
// `./agenda` exporta um `DeadlineStatus` diferente do exportado por `./case`
// (situação da revisão de prazo do caso vs. situação de um prazo da Agenda).
// Para evitar ambiguidade no barrel, reexportamos explicitamente os símbolos
// da Agenda; consumidores que precisam do tipo `DeadlineStatus` da Agenda
// devem importar direto de `@/domain/core/agenda`.
export {
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
  AGENDA_DEADLINE_STATUSES,
  DEADLINE_ALLOWED_KEYS,
  APPOINTMENT_KINDS,
  APPOINTMENT_MODES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_ALLOWED_KEYS,
  AGENDA_TITLE_MAX,
  AGENDA_DESCRIPTION_MAX,
  APPOINTMENT_LOCATION_MAX,
  isDeadlineKind,
  isDeadlinePriority,
  isDeadlineStatus,
  isAppointmentKind,
  isAppointmentMode,
  isAppointmentStatus,
  isDeadline,
  isAppointment,
} from "./agenda";
export type {
  DeadlineKind,
  DeadlinePriority,
  Deadline,
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
  Appointment,
  AgendaDeadlineStatus,
} from "./agenda";
export * from "./validators";
export * from "./labels";
export * as fixtures from "./fixtures";

// Reexporta enums compartilhados para conveniência.
export {
  PERFIS,
  WORK_MODES,
  ROLES,
  isPerfil,
  isWorkMode,
  isRole,
} from "../shared/work-context";
export type { Perfil, WorkMode, Role } from "../shared/work-context";
