/**
 * AppointmentService — implementação em memória (LV-09.1A).
 */

import type {
  Appointment,
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
} from "../core/agenda";
import {
  AGENDA_DESCRIPTION_MAX,
  AGENDA_TITLE_MAX,
  APPOINTMENT_KINDS,
  APPOINTMENT_LOCATION_MAX,
  APPOINTMENT_MODES,
  APPOINTMENT_STATUSES,
  isAppointment,
  isAppointmentKind,
  isAppointmentMode,
  isAppointmentStatus,
} from "../core/agenda";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isIsoDateTime,
  isValidVersion,
} from "../core/common";
import type {
  AppointmentId,
  AssignmentId,
  CaseId,
} from "../core/ids";
import {
  isAppointmentId,
  isAssignmentId,
  isCaseId,
} from "../core/ids";
import type {
  AppointmentListOptions,
  AppointmentService,
} from "../services/appointment-service";
import { APPOINTMENT_LIST_OPTIONS_ALLOWED_KEYS } from "../services/appointment-service";
import type {
  ChangeAppointmentStatusInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "../services/inputs";
import type { ServiceResult } from "../services/result";
import type { PageResult } from "../services/pagination";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import { requireContext } from "./context-validation";
import { paginateItems, stableStringify } from "./pagination-mock";
import { computeAgendaAccessibleCaseIds } from "./agenda-case-access";

function invalid<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "validation_error", message: msg } };
}
function notFound<T>(): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: "appointment_not_found" } };
}
function conflict<T>(expected: number, actual: number): ServiceResult<T> {
  return {
    ok: false,
    error: {
      code: "conflict",
      message: "appointment_version_conflict",
      expectedVersion: expected,
      actualVersion: actual,
    },
  };
}

const CREATE_ALLOWED: ReadonlySet<string> = new Set([
  "caseId",
  "kind",
  "title",
  "description",
  "startsAt",
  "endsAt",
  "mode",
  "location",
  "assignmentId",
]);
const UPDATE_ALLOWED: ReadonlySet<string> = new Set([
  "caseId",
  "appointmentId",
  "kind",
  "title",
  "description",
  "startsAt",
  "endsAt",
  "mode",
  "location",
  "assignmentId",
  "expectedVersion",
]);
const CHANGE_STATUS_ALLOWED: ReadonlySet<string> = new Set([
  "caseId",
  "appointmentId",
  "status",
  "expectedVersion",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function validateEnvelope<T>(
  input: unknown,
  allowed: ReadonlySet<string>,
): ServiceResult<T> | null {
  if (!isPlainObject(input)) return invalid<T>("invalid_input_shape");
  if (containsForbiddenKey(input)) return invalid<T>("forbidden_key");
  if (!hasOnlyAllowedKeys(input, allowed)) return invalid<T>("unknown_key");
  return null;
}
function validateTitle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || v.length > AGENDA_TITLE_MAX) return null;
  return t;
}
function validateDescription(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || v.length > AGENDA_DESCRIPTION_MAX) return null;
  return t;
}
function validateLocation(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || v.length > APPOINTMENT_LOCATION_MAX) return null;
  return t;
}
function normalizeSearch(v: string): string {
  return v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
function assignmentActiveInCase(
  store: MockStore,
  orgId: string,
  caseId: CaseId,
  assignmentId: AssignmentId,
): "ok" | "not_in_case" | "inactive" {
  const a = store.assignments.get(assignmentId);
  if (!a || a.organizationId !== orgId || a.caseId !== caseId) return "not_in_case";
  if (a.status !== "active") return "inactive";
  return "ok";
}
function assignmentInCase(
  store: MockStore,
  orgId: string,
  caseId: CaseId,
  assignmentId: AssignmentId,
): boolean {
  const a = store.assignments.get(assignmentId);
  return !!a && a.organizationId === orgId && a.caseId === caseId;
}
function compareAppointments(a: Appointment, b: Appointment): number {
  if (a.startsAt !== b.startsAt) return a.startsAt < b.startsAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
function validateEnumArray<T extends string>(
  v: unknown,
  guard: (x: unknown) => x is T,
): readonly T[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length === 0) return null;
  for (const x of v) if (!guard(x)) return null;
  return v as readonly T[];
}

export function createAppointmentServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): AppointmentService {
  return {
    async getById(context, caseId, appointmentId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId)) return invalid<Appointment>("invalid_case_id");
      if (!isAppointmentId(appointmentId))
        return invalid<Appointment>("invalid_appointment_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Appointment>();
      const a = store.appointments.get(appointmentId);
      if (!a || a.organizationId !== orgId || a.caseId !== caseId) {
        return notFound<Appointment>();
      }
      return { ok: true, data: deepClone(a) };
    },

    async list(context, options) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      let opts: AppointmentListOptions = {};
      if (options !== undefined) {
        const envelope = validateEnvelope<PageResult<Appointment>>(
          options,
          APPOINTMENT_LIST_OPTIONS_ALLOWED_KEYS,
        );
        if (envelope) return envelope;
        opts = options;
      }
      if (opts.caseId !== undefined) {
        if (!isCaseId(opts.caseId))
          return invalid<PageResult<Appointment>>("invalid_case_id");
        const c = store.cases.get(opts.caseId);
        if (!c || c.organizationId !== orgId)
          return notFound<PageResult<Appointment>>();
      }
      if (opts.rangeFrom !== undefined && !isIsoDateTime(opts.rangeFrom))
        return invalid<PageResult<Appointment>>("invalid_range_from");
      if (opts.rangeTo !== undefined && !isIsoDateTime(opts.rangeTo))
        return invalid<PageResult<Appointment>>("invalid_range_to");
      if (
        opts.rangeFrom !== undefined &&
        opts.rangeTo !== undefined &&
        opts.rangeFrom > opts.rangeTo
      ) {
        return invalid<PageResult<Appointment>>("range_inverted");
      }
      let statusesArr: readonly AppointmentStatus[] | null = null;
      if (opts.statuses !== undefined) {
        statusesArr = validateEnumArray(opts.statuses, isAppointmentStatus);
        if (!statusesArr) return invalid<PageResult<Appointment>>("invalid_statuses");
      }
      let kindsArr: readonly AppointmentKind[] | null = null;
      if (opts.kinds !== undefined) {
        kindsArr = validateEnumArray(opts.kinds, isAppointmentKind);
        if (!kindsArr) return invalid<PageResult<Appointment>>("invalid_kinds");
      }
      let modesArr: readonly AppointmentMode[] | null = null;
      if (opts.modes !== undefined) {
        modesArr = validateEnumArray(opts.modes, isAppointmentMode);
        if (!modesArr) return invalid<PageResult<Appointment>>("invalid_modes");
      }
      let assignArr: readonly AssignmentId[] | null = null;
      if (opts.assignmentIds !== undefined) {
        assignArr = validateEnumArray(opts.assignmentIds, isAssignmentId);
        if (!assignArr)
          return invalid<PageResult<Appointment>>("invalid_assignment_ids");
      }
      let searchNorm: string | null = null;
      if (opts.search !== undefined) {
        if (typeof opts.search !== "string")
          return invalid<PageResult<Appointment>>("invalid_search");
        const s = opts.search.trim();
        if (s.length > 0) searchNorm = normalizeSearch(s);
      }
      const accessibleCaseIds = computeAgendaAccessibleCaseIds(store, v.data.context);
      if (opts.caseId !== undefined && !accessibleCaseIds.has(opts.caseId)) {
        return {
          ok: false,
          error: { code: "forbidden", message: "case_access_denied" },
        };
      }
      let items = Array.from(store.appointments.values()).filter((a) => {
        if (a.organizationId !== orgId) return false;
        if (!accessibleCaseIds.has(a.caseId)) return false;
        if (opts.caseId !== undefined && a.caseId !== opts.caseId) return false;
        // Interseção com [rangeFrom, rangeTo]
        if (opts.rangeFrom !== undefined && a.endsAt < opts.rangeFrom) return false;
        if (opts.rangeTo !== undefined && a.startsAt > opts.rangeTo) return false;
        if (statusesArr && !statusesArr.includes(a.status)) return false;
        if (kindsArr && !kindsArr.includes(a.kind)) return false;
        if (modesArr && !modesArr.includes(a.mode)) return false;
        if (assignArr) {
          if (a.assignmentId === undefined) return false;
          if (!assignArr.includes(a.assignmentId)) return false;
        }
        if (searchNorm !== null) {
          const hay = normalizeSearch(
            `${a.title} ${a.description ?? ""} ${a.location ?? ""}`,
          );
          if (!hay.includes(searchNorm)) return false;
        }
        return true;
      });
      items = items.sort(compareAppointments);
      const queryKey =
        `appointment-list|org=${orgId}|` +
        stableStringify({
          caseId: opts.caseId,
          rangeFrom: opts.rangeFrom,
          rangeTo: opts.rangeTo,
          statuses: statusesArr,
          kinds: kindsArr,
          modes: modesArr,
          assignmentIds: assignArr,
          search: searchNorm,
        });
      const page = opts.page ?? { limit: 100 };
      return paginateItems(items, page, queryKey);
    },

    async create(context, input: CreateAppointmentInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Appointment>(input, CREATE_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<Appointment>("invalid_case_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Appointment>();
      if (!isAppointmentKind(raw.kind)) return invalid<Appointment>("invalid_kind");
      if (!isAppointmentMode(raw.mode)) return invalid<Appointment>("invalid_mode");
      if (!isIsoDateTime(raw.startsAt))
        return invalid<Appointment>("invalid_starts_at");
      if (!isIsoDateTime(raw.endsAt)) return invalid<Appointment>("invalid_ends_at");
      if (raw.startsAt >= raw.endsAt)
        return invalid<Appointment>("period_inverted");
      const title = validateTitle(raw.title);
      if (title === null) return invalid<Appointment>("invalid_title");
      let description: string | undefined;
      if (raw.description !== undefined) {
        const d = validateDescription(raw.description);
        if (d === null) return invalid<Appointment>("invalid_description");
        description = d;
      }
      let location: string | undefined;
      if (raw.location !== undefined) {
        const l = validateLocation(raw.location);
        if (l === null) return invalid<Appointment>("invalid_location");
        location = l;
      }
      let assignmentId: AssignmentId | undefined;
      if (raw.assignmentId !== undefined) {
        if (!isAssignmentId(raw.assignmentId))
          return invalid<Appointment>("invalid_assignment_id");
        const check = assignmentActiveInCase(store, orgId, raw.caseId, raw.assignmentId);
        if (check === "not_in_case")
          return invalid<Appointment>("assignment_not_in_case");
        if (check === "inactive")
          return invalid<Appointment>("assignment_not_active");
        assignmentId = raw.assignmentId;
      }
      const previewId = ids.previewNext("appointment");
      const previewTime = clock.previewNext();
      const preview: Appointment = {
        id: previewId,
        organizationId: orgId,
        caseId: raw.caseId,
        kind: raw.kind,
        title,
        ...(description !== undefined ? { description } : {}),
        startsAt: raw.startsAt,
        endsAt: raw.endsAt,
        mode: raw.mode,
        ...(location !== undefined ? { location } : {}),
        status: "scheduled",
        ...(assignmentId !== undefined ? { assignmentId } : {}),
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      if (!isAppointment(preview)) return invalid<Appointment>("invalid_appointment");
      ids.next("appointment");
      clock.next();
      store.appointments.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },

    async update(context, input: UpdateAppointmentInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Appointment>(input, UPDATE_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<Appointment>("invalid_case_id");
      if (!isAppointmentId(raw.appointmentId))
        return invalid<Appointment>("invalid_appointment_id");
      if (!isValidVersion(raw.expectedVersion))
        return invalid<Appointment>("invalid_expected_version");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Appointment>();
      const current = store.appointments.get(raw.appointmentId);
      if (!current || current.organizationId !== orgId || current.caseId !== raw.caseId) {
        return notFound<Appointment>();
      }
      if (raw.expectedVersion !== current.metadata.version) {
        return conflict<Appointment>(raw.expectedVersion, current.metadata.version);
      }
      let nextKind = current.kind;
      let nextTitle = current.title;
      let nextDescription = current.description;
      let nextStartsAt = current.startsAt;
      let nextEndsAt = current.endsAt;
      let nextMode = current.mode;
      let nextLocation = current.location;
      let nextAssignmentId = current.assignmentId;
      let changed = false;

      if (raw.kind !== undefined) {
        if (!isAppointmentKind(raw.kind)) return invalid<Appointment>("invalid_kind");
        if (raw.kind !== current.kind) { nextKind = raw.kind; changed = true; }
      }
      if (raw.title !== undefined) {
        const t = validateTitle(raw.title);
        if (t === null) return invalid<Appointment>("invalid_title");
        if (t !== current.title) { nextTitle = t; changed = true; }
      }
      if (raw.description !== undefined) {
        if (raw.description === null) {
          if (current.description !== undefined) { nextDescription = undefined; changed = true; }
        } else {
          const d = validateDescription(raw.description);
          if (d === null) return invalid<Appointment>("invalid_description");
          if (d !== current.description) { nextDescription = d; changed = true; }
        }
      }
      if (raw.startsAt !== undefined) {
        if (!isIsoDateTime(raw.startsAt))
          return invalid<Appointment>("invalid_starts_at");
        if (raw.startsAt !== current.startsAt) { nextStartsAt = raw.startsAt; changed = true; }
      }
      if (raw.endsAt !== undefined) {
        if (!isIsoDateTime(raw.endsAt)) return invalid<Appointment>("invalid_ends_at");
        if (raw.endsAt !== current.endsAt) { nextEndsAt = raw.endsAt; changed = true; }
      }
      if (nextStartsAt >= nextEndsAt) return invalid<Appointment>("period_inverted");
      if (raw.mode !== undefined) {
        if (!isAppointmentMode(raw.mode)) return invalid<Appointment>("invalid_mode");
        if (raw.mode !== current.mode) { nextMode = raw.mode; changed = true; }
      }
      if (raw.location !== undefined) {
        if (raw.location === null) {
          if (current.location !== undefined) { nextLocation = undefined; changed = true; }
        } else {
          const l = validateLocation(raw.location);
          if (l === null) return invalid<Appointment>("invalid_location");
          if (l !== current.location) { nextLocation = l; changed = true; }
        }
      }
      if (raw.assignmentId !== undefined) {
        if (raw.assignmentId === null) {
          if (current.assignmentId !== undefined) { nextAssignmentId = undefined; changed = true; }
        } else {
          if (!isAssignmentId(raw.assignmentId))
            return invalid<Appointment>("invalid_assignment_id");
          if (raw.assignmentId === current.assignmentId) {
            if (!assignmentInCase(store, orgId, raw.caseId, raw.assignmentId)) {
              return invalid<Appointment>("assignment_not_in_case");
            }
          } else {
            const check = assignmentActiveInCase(store, orgId, raw.caseId, raw.assignmentId);
            if (check === "not_in_case") return invalid<Appointment>("assignment_not_in_case");
            if (check === "inactive") return invalid<Appointment>("assignment_not_active");
            nextAssignmentId = raw.assignmentId; changed = true;
          }
        }
      }
      if (!changed) return invalid<Appointment>("no_changes");
      const nextTime = clock.next();
      const next: Appointment = {
        id: current.id,
        organizationId: current.organizationId,
        caseId: current.caseId,
        kind: nextKind,
        title: nextTitle,
        ...(nextDescription !== undefined ? { description: nextDescription } : {}),
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        mode: nextMode,
        ...(nextLocation !== undefined ? { location: nextLocation } : {}),
        status: current.status,
        ...(nextAssignmentId !== undefined ? { assignmentId: nextAssignmentId } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      if (!isAppointment(next)) return invalid<Appointment>("invalid_appointment");
      store.appointments.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async changeStatus(context, input: ChangeAppointmentStatusInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Appointment>(input, CHANGE_STATUS_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<Appointment>("invalid_case_id");
      if (!isAppointmentId(raw.appointmentId))
        return invalid<Appointment>("invalid_appointment_id");
      if (!isAppointmentStatus(raw.status))
        return invalid<Appointment>("invalid_status");
      if (!isValidVersion(raw.expectedVersion))
        return invalid<Appointment>("invalid_expected_version");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Appointment>();
      const current = store.appointments.get(raw.appointmentId);
      if (!current || current.organizationId !== orgId || current.caseId !== raw.caseId) {
        return notFound<Appointment>();
      }
      if (raw.expectedVersion !== current.metadata.version) {
        return conflict<Appointment>(raw.expectedVersion, current.metadata.version);
      }
      if (raw.status === current.status) return invalid<Appointment>("no_changes");
      const nextTime = clock.next();
      const next: Appointment = {
        id: current.id,
        organizationId: current.organizationId,
        caseId: current.caseId,
        kind: current.kind,
        title: current.title,
        ...(current.description !== undefined ? { description: current.description } : {}),
        startsAt: current.startsAt,
        endsAt: current.endsAt,
        mode: current.mode,
        ...(current.location !== undefined ? { location: current.location } : {}),
        status: raw.status,
        ...(current.assignmentId !== undefined ? { assignmentId: current.assignmentId } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      if (!isAppointment(next)) return invalid<Appointment>("invalid_appointment");
      store.appointments.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async remove(context, caseId, appointmentId, expectedVersion) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId))
        return invalid<{ readonly removed: true }>("invalid_case_id");
      if (!isAppointmentId(appointmentId))
        return invalid<{ readonly removed: true }>("invalid_appointment_id");
      if (!isValidVersion(expectedVersion))
        return invalid<{ readonly removed: true }>("invalid_expected_version");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<{ readonly removed: true }>();
      const current = store.appointments.get(appointmentId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<{ readonly removed: true }>();
      }
      if (expectedVersion !== current.metadata.version) {
        return conflict<{ readonly removed: true }>(
          expectedVersion,
          current.metadata.version,
        );
      }
      store.appointments.delete(appointmentId);
      return { ok: true, data: { removed: true } };
    },
  };
}

export const _APPOINTMENT_ENUMS = {
  APPOINTMENT_KINDS,
  APPOINTMENT_MODES,
  APPOINTMENT_STATUSES,
} as const;
