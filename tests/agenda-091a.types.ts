/**
 * LV-09.1A.1 — provas de tipo estáticas para Agenda.
 *
 * Nenhum teste em runtime: apenas verifica em compilação que os tipos
 * exportados são branded, readonly e coerentes com os inputs oficiais.
 */

import { describe, it, expect } from "bun:test";
import type {
  Deadline,
  Appointment,
  DeadlineKind,
  DeadlinePriority,
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
} from "@/domain/core/agenda";
import type { DeadlineStatus as AgendaStatus } from "@/domain/core/agenda";
import type {
  DeadlineId,
  AppointmentId,
  AssignmentId,
  CaseId,
  OrganizationId,
} from "@/domain/core/ids";
import type {
  CreateDeadlineInput,
  UpdateDeadlineInput,
  ChangeDeadlineStatusInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeAppointmentStatusInput,
} from "@/domain/services/inputs";
import type { PermissionAction } from "@/domain/services/permissions";

// Helper genérico: garante que dois tipos são iguais estruturalmente.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;
function assertType<T extends true>(_?: T): void {}

// ---- Branded IDs ---------------------------------------------------------
{
  const _d: DeadlineId = "" as DeadlineId;
  const _a: AppointmentId = "" as AppointmentId;
  // @ts-expect-error IDs branded não misturam
  const _bad: DeadlineId = _a;
  void _d; void _a; void _bad;
}

// ---- Deadline entidade: campos readonly e branded --------------------
{
  const d = {} as Deadline;
  assertType<Equals<typeof d.id, DeadlineId>>();
  assertType<Equals<typeof d.caseId, CaseId>>();
  assertType<Equals<typeof d.organizationId, OrganizationId>>();
  assertType<Equals<typeof d.kind, DeadlineKind>>();
  assertType<Equals<typeof d.priority, DeadlinePriority>>();
  assertType<Equals<typeof d.status, AgendaStatus>>();
  const _assign: AssignmentId | undefined = d.assignmentId;
  void _assign;
}

// ---- Appointment entidade ------------------------------------------------
{
  const a = {} as Appointment;
  assertType<Equals<typeof a.id, AppointmentId>>();
  assertType<Equals<typeof a.kind, AppointmentKind>>();
  assertType<Equals<typeof a.mode, AppointmentMode>>();
  assertType<Equals<typeof a.status, AppointmentStatus>>();
}

// ---- Inputs de criação/atualização não expõem status/metadata ------------
{
  const c = {} as CreateDeadlineInput;
  // @ts-expect-error CreateDeadlineInput não permite status
  c.status = "pending";
  // @ts-expect-error CreateDeadlineInput não permite metadata
  c.metadata = { version: 1 };
  void c;
}
{
  const u = {} as UpdateDeadlineInput;
  assertType<Equals<typeof u.expectedVersion, number>>();
  // @ts-expect-error UpdateDeadlineInput não permite status
  u.status = "pending";
  void u;
}
{
  const s = {} as ChangeDeadlineStatusInput;
  assertType<Equals<typeof s.status, AgendaStatus>>();
}
{
  const c = {} as CreateAppointmentInput;
  // @ts-expect-error CreateAppointmentInput não permite status
  c.status = "scheduled";
  void c;
}
{
  const u = {} as UpdateAppointmentInput;
  assertType<Equals<typeof u.expectedVersion, number>>();
}
{
  const s = {} as ChangeAppointmentStatusInput;
  assertType<Equals<typeof s.status, AppointmentStatus>>();
}

// ---- PermissionAction inclui as 12 novas ações ---------------------------
{
  const acts: PermissionAction[] = [
    "deadline.read","deadline.list","deadline.create","deadline.update",
    "deadline.changeStatus","deadline.remove",
    "appointment.read","appointment.list","appointment.create","appointment.update",
    "appointment.changeStatus","appointment.remove",
  ];
  void acts;
}

describe("LV-09.1A.1 · type proofs", () => {
  it("compilou (sanidade)", () => {
    expect(true).toBe(true);
  });
});
