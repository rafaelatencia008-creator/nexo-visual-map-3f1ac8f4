/**
 * DeadlineService — implementação em memória (LV-09.1A).
 *
 * Determinístico. Sem Date.now, Math.random, crypto.randomUUID, rede
 * ou storage. Todas as leituras devolvem cópias profundas.
 */

import type {
  Deadline,
  DeadlineKind,
  DeadlinePriority,
  DeadlineStatus,
} from "../core/agenda";
import {
  AGENDA_DEADLINE_STATUSES,
  AGENDA_DESCRIPTION_MAX,
  AGENDA_TITLE_MAX,
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
  isDeadline,
  isDeadlineKind,
  isDeadlinePriority,
  isDeadlineStatus,
} from "../core/agenda";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isIsoDateTime,
  isoDateTimeToEpoch,
  isValidVersion,
  type IsoDateTime,
} from "../core/common";
import type {
  AssignmentId,
  CaseId,
  DeadlineId,
} from "../core/ids";
import {
  isAssignmentId,
  isCaseId,
  isDeadlineId,
} from "../core/ids";
import type {
  DeadlineListOptions,
  DeadlineService,
} from "../services/deadline-service";
import { DEADLINE_LIST_OPTIONS_ALLOWED_KEYS } from "../services/deadline-service";
import type {
  ChangeDeadlineStatusInput,
  CreateDeadlineInput,
  UpdateDeadlineInput,
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
  return { ok: false, error: { code: "not_found", message: "deadline_not_found" } };
}
function conflict<T>(expected: number, actual: number): ServiceResult<T> {
  return {
    ok: false,
    error: {
      code: "conflict",
      message: "deadline_version_conflict",
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
  "dueAt",
  "priority",
  "assignmentId",
]);
const UPDATE_ALLOWED: ReadonlySet<string> = new Set([
  "caseId",
  "deadlineId",
  "kind",
  "title",
  "description",
  "dueAt",
  "priority",
  "assignmentId",
  "expectedVersion",
]);
const CHANGE_STATUS_ALLOWED: ReadonlySet<string> = new Set([
  "caseId",
  "deadlineId",
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

function normalizeSearch(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function assignmentActiveInCase(
  store: MockStore,
  orgId: string,
  caseId: CaseId,
  assignmentId: AssignmentId,
): "ok" | "not_in_case" | "inactive" {
  const a = store.assignments.get(assignmentId);
  if (!a) return "not_in_case";
  if (a.organizationId !== orgId) return "not_in_case";
  if (a.caseId !== caseId) return "not_in_case";
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

function compareDeadlines(a: Deadline, b: Deadline): number {
  const t = isoDateTimeToEpoch(a.dueAt) - isoDateTimeToEpoch(b.dueAt);
  if (t !== 0) return t;
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

export function createDeadlineServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): DeadlineService {
  return {
    async getById(context, caseId, deadlineId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId)) return invalid<Deadline>("invalid_case_id");
      if (!isDeadlineId(deadlineId)) return invalid<Deadline>("invalid_deadline_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Deadline>();
      const d = store.deadlines.get(deadlineId);
      if (!d || d.organizationId !== orgId || d.caseId !== caseId) {
        return notFound<Deadline>();
      }
      return { ok: true, data: deepClone(d) };
    },

    async list(context, options) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      let opts: DeadlineListOptions = {};
      if (options !== undefined) {
        const envelope = validateEnvelope<PageResult<Deadline>>(
          options,
          DEADLINE_LIST_OPTIONS_ALLOWED_KEYS,
        );
        if (envelope) return envelope;
        opts = options;
      }
      if (opts.caseId !== undefined) {
        if (!isCaseId(opts.caseId))
          return invalid<PageResult<Deadline>>("invalid_case_id");
        const c = store.cases.get(opts.caseId);
        if (!c || c.organizationId !== orgId)
          return notFound<PageResult<Deadline>>();
      }
      if (opts.rangeFrom !== undefined && !isIsoDateTime(opts.rangeFrom))
        return invalid<PageResult<Deadline>>("invalid_range_from");
      if (opts.rangeTo !== undefined && !isIsoDateTime(opts.rangeTo))
        return invalid<PageResult<Deadline>>("invalid_range_to");
      if (
        opts.rangeFrom !== undefined &&
        opts.rangeTo !== undefined &&
        isoDateTimeToEpoch(opts.rangeFrom) > isoDateTimeToEpoch(opts.rangeTo)
      ) {
        return invalid<PageResult<Deadline>>("range_inverted");
      }
      let statusesArr: readonly DeadlineStatus[] | null = null;
      if (opts.statuses !== undefined) {
        statusesArr = validateEnumArray(opts.statuses, isDeadlineStatus);
        if (!statusesArr) return invalid<PageResult<Deadline>>("invalid_statuses");
      }
      let kindsArr: readonly DeadlineKind[] | null = null;
      if (opts.kinds !== undefined) {
        kindsArr = validateEnumArray(opts.kinds, isDeadlineKind);
        if (!kindsArr) return invalid<PageResult<Deadline>>("invalid_kinds");
      }
      let prioArr: readonly DeadlinePriority[] | null = null;
      if (opts.priorities !== undefined) {
        prioArr = validateEnumArray(opts.priorities, isDeadlinePriority);
        if (!prioArr) return invalid<PageResult<Deadline>>("invalid_priorities");
      }
      let assignArr: readonly AssignmentId[] | null = null;
      if (opts.assignmentIds !== undefined) {
        assignArr = validateEnumArray(opts.assignmentIds, isAssignmentId);
        if (!assignArr)
          return invalid<PageResult<Deadline>>("invalid_assignment_ids");
      }
      let searchNorm: string | null = null;
      if (opts.search !== undefined) {
        if (typeof opts.search !== "string")
          return invalid<PageResult<Deadline>>("invalid_search");
        const s = opts.search.trim();
        if (s.length > 0) searchNorm = normalizeSearch(s);
      }
      const accessibleCaseIds = computeAgendaAccessibleCaseIds(store, v.data.context);
      if (opts.caseId !== undefined) {
        // Caso não pertence à org já retornou not_found antes.
        if (!accessibleCaseIds.has(opts.caseId)) {
          return {
            ok: false,
            error: { code: "forbidden", message: "case_access_denied" },
          };
        }
      }
      let items = Array.from(store.deadlines.values()).filter((d) => {
        if (d.organizationId !== orgId) return false;
        if (!accessibleCaseIds.has(d.caseId)) return false;
        if (opts.caseId !== undefined && d.caseId !== opts.caseId) return false;
        if (opts.rangeFrom !== undefined && isoDateTimeToEpoch(d.dueAt) < isoDateTimeToEpoch(opts.rangeFrom)) return false;
        if (opts.rangeTo !== undefined && isoDateTimeToEpoch(d.dueAt) > isoDateTimeToEpoch(opts.rangeTo)) return false;
        if (statusesArr && !statusesArr.includes(d.status)) return false;
        if (kindsArr && !kindsArr.includes(d.kind)) return false;
        if (prioArr && !prioArr.includes(d.priority)) return false;
        if (assignArr) {
          if (d.assignmentId === undefined) return false;
          if (!assignArr.includes(d.assignmentId)) return false;
        }
        if (searchNorm !== null) {
          const hay = normalizeSearch(
            `${d.title} ${d.description ?? ""}`,
          );
          if (!hay.includes(searchNorm)) return false;
        }
        return true;
      });
      items = items.sort(compareDeadlines);
      const queryKey =
        `deadline-list|org=${orgId}|` +
        stableStringify({
          caseId: opts.caseId,
          rangeFrom: opts.rangeFrom,
          rangeTo: opts.rangeTo,
          statuses: statusesArr,
          kinds: kindsArr,
          priorities: prioArr,
          assignmentIds: assignArr,
          search: searchNorm,
        });
      const page = opts.page ?? { limit: 100 };
      return paginateItems(items, page, queryKey);
    },

    async create(context, input: CreateDeadlineInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Deadline>(input, CREATE_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<Deadline>("invalid_case_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Deadline>();
      if (!isDeadlineKind(raw.kind)) return invalid<Deadline>("invalid_kind");
      if (!isDeadlinePriority(raw.priority))
        return invalid<Deadline>("invalid_priority");
      if (!isIsoDateTime(raw.dueAt)) return invalid<Deadline>("invalid_due_at");
      const title = validateTitle(raw.title);
      if (title === null) return invalid<Deadline>("invalid_title");
      let description: string | undefined;
      if (raw.description !== undefined) {
        const d = validateDescription(raw.description);
        if (d === null) return invalid<Deadline>("invalid_description");
        description = d;
      }
      let assignmentId: AssignmentId | undefined;
      if (raw.assignmentId !== undefined) {
        if (!isAssignmentId(raw.assignmentId))
          return invalid<Deadline>("invalid_assignment_id");
        const check = assignmentActiveInCase(store, orgId, raw.caseId, raw.assignmentId);
        if (check === "not_in_case")
          return invalid<Deadline>("assignment_not_in_case");
        if (check === "inactive")
          return invalid<Deadline>("assignment_not_active");
        assignmentId = raw.assignmentId;
      }
      const previewId = ids.previewNext("deadline");
      const previewTime = clock.previewNext();
      const preview: Deadline = {
        id: previewId,
        organizationId: orgId,
        caseId: raw.caseId,
        kind: raw.kind,
        title,
        ...(description !== undefined ? { description } : {}),
        dueAt: raw.dueAt,
        status: "pending",
        priority: raw.priority,
        ...(assignmentId !== undefined ? { assignmentId } : {}),
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      if (!isDeadline(preview)) return invalid<Deadline>("invalid_deadline");
      ids.next("deadline");
      clock.next();
      store.deadlines.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },

    async update(context, input: UpdateDeadlineInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Deadline>(input, UPDATE_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<Deadline>("invalid_case_id");
      if (!isDeadlineId(raw.deadlineId))
        return invalid<Deadline>("invalid_deadline_id");
      if (!isValidVersion(raw.expectedVersion))
        return invalid<Deadline>("invalid_expected_version");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Deadline>();
      const current = store.deadlines.get(raw.deadlineId);
      if (!current || current.organizationId !== orgId || current.caseId !== raw.caseId) {
        return notFound<Deadline>();
      }
      if (raw.expectedVersion !== current.metadata.version) {
        return conflict<Deadline>(raw.expectedVersion, current.metadata.version);
      }

      let nextKind = current.kind;
      let nextTitle = current.title;
      let nextDescription = current.description;
      let nextDueAt = current.dueAt;
      let nextPriority = current.priority;
      let nextAssignmentId = current.assignmentId;
      let changed = false;

      if (raw.kind !== undefined) {
        if (!isDeadlineKind(raw.kind)) return invalid<Deadline>("invalid_kind");
        if (raw.kind !== current.kind) { nextKind = raw.kind; changed = true; }
      }
      if (raw.title !== undefined) {
        const t = validateTitle(raw.title);
        if (t === null) return invalid<Deadline>("invalid_title");
        if (t !== current.title) { nextTitle = t; changed = true; }
      }
      if (raw.description !== undefined) {
        if (raw.description === null) {
          if (current.description !== undefined) {
            nextDescription = undefined;
            changed = true;
          }
        } else {
          const d = validateDescription(raw.description);
          if (d === null) return invalid<Deadline>("invalid_description");
          if (d !== current.description) { nextDescription = d; changed = true; }
        }
      }
      if (raw.dueAt !== undefined) {
        if (!isIsoDateTime(raw.dueAt)) return invalid<Deadline>("invalid_due_at");
        if (raw.dueAt !== current.dueAt) { nextDueAt = raw.dueAt; changed = true; }
      }
      if (raw.priority !== undefined) {
        if (!isDeadlinePriority(raw.priority))
          return invalid<Deadline>("invalid_priority");
        if (raw.priority !== current.priority) {
          nextPriority = raw.priority; changed = true;
        }
      }
      if (raw.assignmentId !== undefined) {
        if (raw.assignmentId === null) {
          if (current.assignmentId !== undefined) {
            nextAssignmentId = undefined;
            changed = true;
          }
        } else {
          if (!isAssignmentId(raw.assignmentId))
            return invalid<Deadline>("invalid_assignment_id");
          if (raw.assignmentId === current.assignmentId) {
            // preservar mesmo se inativo
            if (!assignmentInCase(store, orgId, raw.caseId, raw.assignmentId)) {
              return invalid<Deadline>("assignment_not_in_case");
            }
          } else {
            const check = assignmentActiveInCase(
              store,
              orgId,
              raw.caseId,
              raw.assignmentId,
            );
            if (check === "not_in_case")
              return invalid<Deadline>("assignment_not_in_case");
            if (check === "inactive")
              return invalid<Deadline>("assignment_not_active");
            nextAssignmentId = raw.assignmentId;
            changed = true;
          }
        }
      }
      if (!changed) return invalid<Deadline>("no_changes");

      const nextTime = clock.next();
      const next: Deadline = {
        id: current.id,
        organizationId: current.organizationId,
        caseId: current.caseId,
        kind: nextKind,
        title: nextTitle,
        ...(nextDescription !== undefined ? { description: nextDescription } : {}),
        dueAt: nextDueAt,
        status: current.status,
        priority: nextPriority,
        ...(nextAssignmentId !== undefined ? { assignmentId: nextAssignmentId } : {}),
        ...(current.completedAt !== undefined ? { completedAt: current.completedAt } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      if (!isDeadline(next)) return invalid<Deadline>("invalid_deadline");
      store.deadlines.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async changeStatus(context, input: ChangeDeadlineStatusInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Deadline>(input, CHANGE_STATUS_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<Deadline>("invalid_case_id");
      if (!isDeadlineId(raw.deadlineId))
        return invalid<Deadline>("invalid_deadline_id");
      if (!isDeadlineStatus(raw.status))
        return invalid<Deadline>("invalid_status");
      if (!isValidVersion(raw.expectedVersion))
        return invalid<Deadline>("invalid_expected_version");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Deadline>();
      const current = store.deadlines.get(raw.deadlineId);
      if (!current || current.organizationId !== orgId || current.caseId !== raw.caseId) {
        return notFound<Deadline>();
      }
      if (raw.expectedVersion !== current.metadata.version) {
        return conflict<Deadline>(raw.expectedVersion, current.metadata.version);
      }
      if (raw.status === current.status) return invalid<Deadline>("no_changes");
      const nextTime = clock.next();
      let completedAt: IsoDateTime | undefined = current.completedAt;
      if (raw.status === "completed") {
        completedAt = nextTime;
      } else {
        completedAt = undefined;
      }
      const next: Deadline = {
        id: current.id,
        organizationId: current.organizationId,
        caseId: current.caseId,
        kind: current.kind,
        title: current.title,
        ...(current.description !== undefined ? { description: current.description } : {}),
        dueAt: current.dueAt,
        status: raw.status,
        priority: current.priority,
        ...(current.assignmentId !== undefined ? { assignmentId: current.assignmentId } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      if (!isDeadline(next)) return invalid<Deadline>("invalid_deadline");
      store.deadlines.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async remove(context, caseId, deadlineId, expectedVersion) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId))
        return invalid<{ readonly removed: true }>("invalid_case_id");
      if (!isDeadlineId(deadlineId))
        return invalid<{ readonly removed: true }>("invalid_deadline_id");
      if (!isValidVersion(expectedVersion))
        return invalid<{ readonly removed: true }>("invalid_expected_version");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<{ readonly removed: true }>();
      const current = store.deadlines.get(deadlineId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<{ readonly removed: true }>();
      }
      if (expectedVersion !== current.metadata.version) {
        return conflict<{ readonly removed: true }>(
          expectedVersion,
          current.metadata.version,
        );
      }
      store.deadlines.delete(deadlineId);
      return { ok: true, data: { removed: true } };
    },
  };
}

// Referências para satisfação de tipos exportados (evita warnings de import).
export const _DEADLINE_ENUMS = {
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
  AGENDA_DEADLINE_STATUSES,
} as const;
