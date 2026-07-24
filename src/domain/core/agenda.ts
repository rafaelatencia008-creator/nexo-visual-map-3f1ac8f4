/**
 * Entidades oficiais da Agenda — LV-09.1A.
 *
 * Deadline: prazo com data e hora limite.
 * Appointment: compromisso com início e término.
 *
 * Puro TypeScript. Sem armazenamento, sem rede, sem React.
 */

import {
  isAppointmentId,
  isAssignmentId,
  isCaseId,
  isDeadlineId,
  isOrganizationId,
  type AppointmentId,
  type AssignmentId,
  type CaseId,
  type DeadlineId,
  type OrganizationId,
} from "./ids";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isEntityMetadata,
  isIsoDateTime,
  isoDateTimeToEpoch,
  type EntityMetadata,
  type IsoDateTime,
} from "./common";

// ---- Limites --------------------------------------------------------------

export const AGENDA_TITLE_MAX = 160;
export const AGENDA_DESCRIPTION_MAX = 2000;
export const APPOINTMENT_LOCATION_MAX = 300;

// ---- Deadline: catálogos --------------------------------------------------

export const DEADLINE_KINDS = ["procedural", "administrative", "internal"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

/**
 * Catálogo oficial de status de prazo da Agenda. Canonical: `DEADLINE_STATUSES`.
 * Alias `AGENDA_DEADLINE_STATUSES` mantido para uso via barrel do domínio,
 * onde evita colisão com o `DeadlineStatus` de `./case`.
 */
export const DEADLINE_STATUSES = [
  "pending",
  "completed",
  "cancelled",
] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];
// Alias retro-compatível.
export const AGENDA_DEADLINE_STATUSES = DEADLINE_STATUSES;
export type AgendaDeadlineStatus = DeadlineStatus;

export const DEADLINE_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type DeadlinePriority = (typeof DEADLINE_PRIORITIES)[number];

const DEADLINE_KIND_SET = new Set<string>(DEADLINE_KINDS);
const DEADLINE_STATUS_SET = new Set<string>(DEADLINE_STATUSES);
const DEADLINE_PRIORITY_SET = new Set<string>(DEADLINE_PRIORITIES);

export const isDeadlineKind = (v: unknown): v is DeadlineKind =>
  typeof v === "string" && DEADLINE_KIND_SET.has(v);
export const isDeadlineStatus = (v: unknown): v is DeadlineStatus =>
  typeof v === "string" && DEADLINE_STATUS_SET.has(v);
export const isDeadlinePriority = (v: unknown): v is DeadlinePriority =>
  typeof v === "string" && DEADLINE_PRIORITY_SET.has(v);

// ---- Deadline: entidade ---------------------------------------------------

export type Deadline = Readonly<{
  id: DeadlineId;
  organizationId: OrganizationId;
  caseId: CaseId;
  kind: DeadlineKind;
  title: string;
  description?: string;
  dueAt: IsoDateTime;
  status: DeadlineStatus;
  priority: DeadlinePriority;
  assignmentId?: AssignmentId;
  completedAt?: IsoDateTime;
  metadata: EntityMetadata;
}>;

export const DEADLINE_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "kind",
  "title",
  "description",
  "dueAt",
  "status",
  "priority",
  "assignmentId",
  "completedAt",
  "metadata",
]);

function isValidTitle(v: unknown, max: number): v is string {
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t.length < 1) return false;
  if (v.length > max) return false;
  return true;
}

function isValidOptionalString(v: unknown, max: number): boolean {
  if (v === undefined) return true;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t.length < 1) return false;
  if (v.length > max) return false;
  return true;
}

export function isDeadline(v: unknown): v is Deadline {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, DEADLINE_ALLOWED_KEYS)) return false;
  const d = v as Record<string, unknown>;
  if (!isDeadlineId(d.id)) return false;
  if (!isOrganizationId(d.organizationId)) return false;
  if (!isCaseId(d.caseId)) return false;
  if (!isDeadlineKind(d.kind)) return false;
  if (!isValidTitle(d.title, AGENDA_TITLE_MAX)) return false;
  if (!isValidOptionalString(d.description, AGENDA_DESCRIPTION_MAX)) return false;
  if (!isIsoDateTime(d.dueAt)) return false;
  if (!isDeadlineStatus(d.status)) return false;
  if (!isDeadlinePriority(d.priority)) return false;
  if (d.assignmentId !== undefined && !isAssignmentId(d.assignmentId)) return false;
  if (d.status === "completed") {
    if (!isIsoDateTime(d.completedAt)) return false;
  } else {
    if (d.completedAt !== undefined) return false;
  }
  if (!isEntityMetadata(d.metadata)) return false;
  return true;
}

// ---- Appointment: catálogos ----------------------------------------------

export const APPOINTMENT_KINDS = [
  "hearing",
  "interview",
  "meeting",
  "diligence",
  "inspection",
  "other",
] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_MODES = ["in_person", "remote", "hybrid"] as const;
export type AppointmentMode = (typeof APPOINTMENT_MODES)[number];

const APPOINTMENT_KIND_SET = new Set<string>(APPOINTMENT_KINDS);
const APPOINTMENT_STATUS_SET = new Set<string>(APPOINTMENT_STATUSES);
const APPOINTMENT_MODE_SET = new Set<string>(APPOINTMENT_MODES);

export const isAppointmentKind = (v: unknown): v is AppointmentKind =>
  typeof v === "string" && APPOINTMENT_KIND_SET.has(v);
export const isAppointmentStatus = (v: unknown): v is AppointmentStatus =>
  typeof v === "string" && APPOINTMENT_STATUS_SET.has(v);
export const isAppointmentMode = (v: unknown): v is AppointmentMode =>
  typeof v === "string" && APPOINTMENT_MODE_SET.has(v);

// ---- Appointment: entidade ------------------------------------------------

export type Appointment = Readonly<{
  id: AppointmentId;
  organizationId: OrganizationId;
  caseId: CaseId;
  kind: AppointmentKind;
  title: string;
  description?: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  mode: AppointmentMode;
  location?: string;
  assignmentId?: AssignmentId;
  status: AppointmentStatus;
  metadata: EntityMetadata;
}>;

export const APPOINTMENT_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "organizationId",
  "caseId",
  "kind",
  "title",
  "description",
  "startsAt",
  "endsAt",
  "mode",
  "location",
  "assignmentId",
  "status",
  "metadata",
]);

export function isAppointment(v: unknown): v is Appointment {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (containsForbiddenKey(v)) return false;
  if (!hasOnlyAllowedKeys(v, APPOINTMENT_ALLOWED_KEYS)) return false;
  const a = v as Record<string, unknown>;
  if (!isAppointmentId(a.id)) return false;
  if (!isOrganizationId(a.organizationId)) return false;
  if (!isCaseId(a.caseId)) return false;
  if (!isAppointmentKind(a.kind)) return false;
  if (!isValidTitle(a.title, AGENDA_TITLE_MAX)) return false;
  if (!isValidOptionalString(a.description, AGENDA_DESCRIPTION_MAX)) return false;
  if (!isIsoDateTime(a.startsAt)) return false;
  if (!isIsoDateTime(a.endsAt)) return false;
  if (!(a.endsAt > a.startsAt)) return false;
  if (!isAppointmentMode(a.mode)) return false;
  if (!isValidOptionalString(a.location, APPOINTMENT_LOCATION_MAX)) return false;
  if (a.assignmentId !== undefined && !isAssignmentId(a.assignmentId)) return false;
  if (!isAppointmentStatus(a.status)) return false;
  if (!isEntityMetadata(a.metadata)) return false;
  return true;
}
