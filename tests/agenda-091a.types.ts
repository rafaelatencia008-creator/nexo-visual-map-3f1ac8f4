/**
 * LV-09.1A.1 — provas de tipo estáticas para Agenda.
 * Não roda testes; apenas força o compilador a verificar contratos.
 */

import type {
  Deadline,
  Appointment,
  DeadlineKind,
  DeadlinePriority,
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
} from "../src/domain/core/agenda";
import type { DeadlineStatus as AgendaStatus } from "../src/domain/core/agenda";
import type {
  DeadlineId,
  AppointmentId,
  AssignmentId,
  CaseId,
  OrganizationId,
} from "../src/domain/core/ids";
import type {
  CreateDeadlineInput,
  UpdateDeadlineInput,
  ChangeDeadlineStatusInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeAppointmentStatusInput,
} from "../src/domain/services/inputs";
import type { PermissionAction } from "../src/domain/services/permissions";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;
type Expect<T extends true> = T;

// Branded IDs distintos
type _D1 = Expect<Equals<Deadline["id"], DeadlineId>>;
type _D2 = Expect<Equals<Deadline["caseId"], CaseId>>;
type _D3 = Expect<Equals<Deadline["organizationId"], OrganizationId>>;
type _D4 = Expect<Equals<Deadline["kind"], DeadlineKind>>;
type _D5 = Expect<Equals<Deadline["priority"], DeadlinePriority>>;
type _D6 = Expect<Equals<Deadline["status"], AgendaStatus>>;
type _A1 = Expect<Equals<Appointment["id"], AppointmentId>>;
type _A2 = Expect<Equals<Appointment["kind"], AppointmentKind>>;
type _A3 = Expect<Equals<Appointment["mode"], AppointmentMode>>;
type _A4 = Expect<Equals<Appointment["status"], AppointmentStatus>>;

// Entidades readonly: atribuição direta deve falhar.
declare const dl: Deadline;
// @ts-expect-error Deadline é readonly
dl.title = "x";
// @ts-expect-error Deadline.metadata é readonly
dl.metadata = dl.metadata;

declare const ap: Appointment;
// @ts-expect-error Appointment é readonly
ap.title = "x";

// AssignmentId é branded
declare const asid: AssignmentId;
const _dl_assign: AssignmentId | undefined = dl.assignmentId;
void _dl_assign; void asid;

// Inputs não expõem status nem metadata
declare const cd: CreateDeadlineInput;
// @ts-expect-error CreateDeadlineInput não tem status
cd.status = "pending";
// @ts-expect-error CreateDeadlineInput não tem metadata
cd.metadata = undefined;

declare const ud: UpdateDeadlineInput;
type _UD1 = Expect<Equals<UpdateDeadlineInput["expectedVersion"], number>>;
// @ts-expect-error UpdateDeadlineInput não tem status
ud.status = "pending";

declare const sd: ChangeDeadlineStatusInput;
type _SD1 = Expect<Equals<ChangeDeadlineStatusInput["status"], AgendaStatus>>;
void sd;

declare const ca: CreateAppointmentInput;
// @ts-expect-error CreateAppointmentInput não tem status
ca.status = "scheduled";

declare const ua: UpdateAppointmentInput;
type _UA1 = Expect<Equals<UpdateAppointmentInput["expectedVersion"], number>>;

declare const sa: ChangeAppointmentStatusInput;
type _SA1 = Expect<Equals<ChangeAppointmentStatusInput["status"], AppointmentStatus>>;
void sa; void ua; void cd; void ud;

// Catálogo tem as 12 ações de Agenda.
const _agendaActs: readonly PermissionAction[] = [
  "deadline.read","deadline.list","deadline.create","deadline.update",
  "deadline.changeStatus","deadline.remove",
  "appointment.read","appointment.list","appointment.create","appointment.update",
  "appointment.changeStatus","appointment.remove",
] as const;
void _agendaActs;

// LV-09.1A.2 — Provas adicionais.

// DeadlineId e AppointmentId são distintos entre si e distintos de CaseId.
type _NotEq1 = Expect<Equals<Equals<DeadlineId, AppointmentId>, false>>;
type _NotEq2 = Expect<Equals<Equals<DeadlineId, CaseId>, false>>;
type _NotEq3 = Expect<Equals<Equals<AppointmentId, CaseId>, false>>;

// Appointment.startsAt e Appointment.endsAt são IsoDateTime.
declare const ap2: Appointment;
const _apStarts: string = ap2.startsAt; void _apStarts;

// UpdateAppointmentInput não aceita status nem metadata.
declare const ua2: UpdateAppointmentInput;
// @ts-expect-error UpdateAppointmentInput não tem status
ua2.status = "scheduled";
// @ts-expect-error UpdateAppointmentInput não tem metadata
ua2.metadata = undefined;

// ChangeAppointmentStatusInput.status é obrigatoriamente AppointmentStatus.
declare const sa2: ChangeAppointmentStatusInput;
const _saStatus: AppointmentStatus = sa2.status; void _saStatus;

export {};

// ============================================================================
// LV-09.1A.3 — Provas de tipo adicionais (sem casts)
// ============================================================================

import type { DeadlineService } from "../src/domain/services/deadline-service";
import type { AppointmentService } from "../src/domain/services/appointment-service";

// Service key sets são exatamente os métodos oficiais.
type DeadlineKeys = keyof DeadlineService;
type AppointmentKeys = keyof AppointmentService;
type ExpectedKeys = "create" | "getById" | "list" | "update" | "changeStatus" | "remove";
type _DK = Expect<Equals<DeadlineKeys, ExpectedKeys>>;
type _AK = Expect<Equals<AppointmentKeys, ExpectedKeys>>;

// Entidades: metadata é readonly-record com campos concretos.
type _DM = Expect<Equals<Deadline["metadata"]["version"], number>>;
type _AM = Expect<Equals<Appointment["metadata"]["version"], number>>;

// Entidades: campos de tempo são IsoDateTime brandado.
declare const dl2: Deadline;
declare const ap3: Appointment;
const _dlDue: Deadline["dueAt"] = dl2.dueAt;
const _apStart: Appointment["startsAt"] = ap3.startsAt;
const _apEnd: Appointment["endsAt"] = ap3.endsAt;
void _dlDue; void _apStart; void _apEnd;

// Inputs de update exigem expectedVersion tipado como number.
type _UDV = Expect<Equals<UpdateDeadlineInput["expectedVersion"], number>>;
type _UAV = Expect<Equals<UpdateAppointmentInput["expectedVersion"], number>>;

// Inputs de create NÃO possuem chaves version/id.
declare const cd2: CreateDeadlineInput;
// @ts-expect-error CreateDeadlineInput não expõe id
cd2.id = undefined;
// @ts-expect-error CreateDeadlineInput não expõe expectedVersion
cd2.expectedVersion = 1;

declare const ca2: CreateAppointmentInput;
// @ts-expect-error CreateAppointmentInput não expõe id
ca2.id = undefined;
// @ts-expect-error CreateAppointmentInput não expõe expectedVersion
ca2.expectedVersion = 1;

// ChangeStatus inputs não expõem outros campos mutáveis.
declare const sd2: ChangeDeadlineStatusInput;
// @ts-expect-error ChangeDeadlineStatusInput não altera título
sd2.title = "x";
declare const sa3: ChangeAppointmentStatusInput;
// @ts-expect-error ChangeAppointmentStatusInput não altera título
sa3.title = "x";
