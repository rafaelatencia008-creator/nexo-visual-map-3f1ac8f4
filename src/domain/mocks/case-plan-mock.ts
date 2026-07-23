/**
 * CasePlanService — implementação em memória (LV-08.5A).
 */

import type {
  CasePlanItem,
  CasePlanItemKind,
  CasePlanItemPriority,
  CasePlanItemStatus,
} from "../core/case-plan";
import {
  CASE_PLAN_ITEM_DESCRIPTION_MAX,
  CASE_PLAN_ITEM_STATUSES,
  CASE_PLAN_ITEM_TITLE_MAX,
  isCasePlanItem,
  isCasePlanItemKind,
  isCasePlanItemPriority,
  isCasePlanItemStatus,
} from "../core/case-plan";
import { isIsoDate } from "../core/common";
import type { AssignmentId, CaseId, CasePlanItemId } from "../core/ids";
import { isAssignmentId } from "../core/ids";
import type { CasePlanService } from "../services/case-plan-service";
import type {
  ChangeCasePlanItemStatusInput,
  CreateCasePlanItemInput,
  UpdateCasePlanItemInput,
} from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { PageRequest, PageResult } from "../services/pagination";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import { requireContext } from "./context-validation";
import { paginateItems } from "./pagination-mock";

function notFound<T>(): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: "plan_item_not_found" } };
}
function invalid<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "validation_error", message: msg } };
}
function conflict<T>(msg: string, expected: number, actual: number): ServiceResult<T> {
  return {
    ok: false,
    error: {
      code: "conflict",
      message: msg,
      expectedVersion: expected,
      actualVersion: actual,
    },
  };
}

function validateTitle(v: string): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || t.length > CASE_PLAN_ITEM_TITLE_MAX) return null;
  return t;
}
function validateDescription(v: string): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || t.length > CASE_PLAN_ITEM_DESCRIPTION_MAX) return null;
  return t;
}

const STATUS_INDEX: Readonly<Record<CasePlanItemStatus, number>> = Object.freeze(
  Object.fromEntries(
    CASE_PLAN_ITEM_STATUSES.map((s, i) => [s, i]),
  ) as Record<CasePlanItemStatus, number>,
);

function comparePlanItems(a: CasePlanItem, b: CasePlanItem): number {
  const s = STATUS_INDEX[a.status] - STATUS_INDEX[b.status];
  if (s !== 0) return s;
  if (a.dueOn !== b.dueOn) {
    if (a.dueOn === undefined) return 1;
    if (b.dueOn === undefined) return -1;
    if (a.dueOn < b.dueOn) return -1;
    if (a.dueOn > b.dueOn) return 1;
  }
  if (a.metadata.createdAt !== b.metadata.createdAt) {
    return a.metadata.createdAt < b.metadata.createdAt ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
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

export function createCasePlanServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): CasePlanService {
  return {
    async getById(context, caseId, planItemId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CasePlanItem>();
      const p = store.casePlanItems.get(planItemId);
      if (!p || p.organizationId !== orgId || p.caseId !== caseId) {
        return notFound<CasePlanItem>();
      }
      return { ok: true, data: deepClone(p) };
    },

    async listByCase(
      context: ServiceContext,
      caseId: CaseId,
      page: PageRequest,
    ): Promise<ServiceResult<PageResult<CasePlanItem>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) {
        return notFound<PageResult<CasePlanItem>>();
      }
      const items = Array.from(store.casePlanItems.values()).filter(
        (p) => p.organizationId === orgId && p.caseId === caseId,
      );
      items.sort(comparePlanItems);
      const queryKey = `casePlan-listByCase|org=${orgId}|case=${caseId}`;
      return paginateItems(items, page, queryKey);
    },

    async create(context, input: CreateCasePlanItemInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(input.caseId);
      if (!c || c.organizationId !== orgId) return notFound<CasePlanItem>();
      if (!isCasePlanItemKind(input.kind)) return invalid<CasePlanItem>("invalid_plan_item");
      if (!isCasePlanItemPriority(input.priority))
        return invalid<CasePlanItem>("invalid_plan_item");
      const title = validateTitle(input.title);
      if (title === null) return invalid<CasePlanItem>("invalid_plan_item");
      let description: string | undefined = undefined;
      if (input.description !== undefined) {
        const d = validateDescription(input.description);
        if (d === null) return invalid<CasePlanItem>("invalid_plan_item");
        description = d;
      }
      if (input.dueOn !== undefined && !isIsoDate(input.dueOn)) {
        return invalid<CasePlanItem>("invalid_plan_item");
      }
      if (input.assignmentId !== undefined) {
        if (!isAssignmentId(input.assignmentId))
          return invalid<CasePlanItem>("invalid_plan_item");
        if (!assignmentInCase(store, orgId, input.caseId, input.assignmentId)) {
          return invalid<CasePlanItem>("assignment_not_in_case");
        }
      }
      const previewId = ids.previewNext("casePlanItem");
      const previewTime = clock.previewNext();
      const preview: CasePlanItem = {
        id: previewId,
        organizationId: orgId,
        caseId: input.caseId,
        kind: input.kind,
        title,
        ...(description !== undefined ? { description } : {}),
        status: "planned",
        priority: input.priority,
        ...(input.dueOn !== undefined ? { dueOn: input.dueOn } : {}),
        ...(input.assignmentId !== undefined
          ? { assignmentId: input.assignmentId }
          : {}),
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      if (!isCasePlanItem(preview)) return invalid<CasePlanItem>("invalid_plan_item");
      ids.next("casePlanItem");
      clock.next();
      store.casePlanItems.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },

    async update(
      context: ServiceContext,
      caseId: CaseId,
      input: UpdateCasePlanItemInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CasePlanItem>();
      const current = store.casePlanItems.get(input.planItemId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<CasePlanItem>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return conflict<CasePlanItem>(
          "plan_item_version_conflict",
          input.expectedVersion,
          current.metadata.version,
        );
      }
      let nextKind: CasePlanItemKind = current.kind;
      let nextTitle: string = current.title;
      let nextDescription: string | undefined = current.description;
      let nextPriority: CasePlanItemPriority = current.priority;
      let nextDueOn: string | undefined = current.dueOn;
      let nextAssignmentId: AssignmentId | undefined = current.assignmentId;
      let changed = false;

      if (input.kind !== undefined) {
        if (!isCasePlanItemKind(input.kind)) return invalid<CasePlanItem>("invalid_plan_item");
        if (input.kind !== current.kind) { nextKind = input.kind; changed = true; }
      }
      if (input.title !== undefined) {
        const t = validateTitle(input.title);
        if (t === null) return invalid<CasePlanItem>("invalid_plan_item");
        if (t !== current.title) { nextTitle = t; changed = true; }
      }
      if (input.description !== undefined) {
        if (input.description === null) {
          if (current.description !== undefined) { nextDescription = undefined; changed = true; }
        } else {
          const d = validateDescription(input.description);
          if (d === null) return invalid<CasePlanItem>("invalid_plan_item");
          if (d !== current.description) { nextDescription = d; changed = true; }
        }
      }
      if (input.priority !== undefined) {
        if (!isCasePlanItemPriority(input.priority))
          return invalid<CasePlanItem>("invalid_plan_item");
        if (input.priority !== current.priority) {
          nextPriority = input.priority; changed = true;
        }
      }
      if (input.dueOn !== undefined) {
        if (input.dueOn === null) {
          if (current.dueOn !== undefined) { nextDueOn = undefined; changed = true; }
        } else {
          if (!isIsoDate(input.dueOn)) return invalid<CasePlanItem>("invalid_plan_item");
          if (input.dueOn !== current.dueOn) { nextDueOn = input.dueOn; changed = true; }
        }
      }
      if (input.assignmentId !== undefined) {
        if (input.assignmentId === null) {
          if (current.assignmentId !== undefined) {
            nextAssignmentId = undefined; changed = true;
          }
        } else {
          if (!isAssignmentId(input.assignmentId))
            return invalid<CasePlanItem>("invalid_plan_item");
          if (!assignmentInCase(store, orgId, caseId, input.assignmentId))
            return invalid<CasePlanItem>("assignment_not_in_case");
          if (input.assignmentId !== current.assignmentId) {
            nextAssignmentId = input.assignmentId; changed = true;
          }
        }
      }
      if (!changed) return invalid<CasePlanItem>("no_changes");

      const nextTime = clock.next();
      const next: CasePlanItem = {
        id: current.id,
        organizationId: current.organizationId,
        caseId: current.caseId,
        kind: nextKind,
        title: nextTitle,
        ...(nextDescription !== undefined ? { description: nextDescription } : {}),
        status: current.status,
        priority: nextPriority,
        ...(nextDueOn !== undefined ? { dueOn: nextDueOn as CasePlanItem["dueOn"] } : {}),
        ...(nextAssignmentId !== undefined ? { assignmentId: nextAssignmentId } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      if (!isCasePlanItem(next)) return invalid<CasePlanItem>("invalid_plan_item");
      store.casePlanItems.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async changeStatus(
      context: ServiceContext,
      caseId: CaseId,
      input: ChangeCasePlanItemStatusInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CasePlanItem>();
      const current = store.casePlanItems.get(input.planItemId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<CasePlanItem>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return conflict<CasePlanItem>(
          "plan_item_version_conflict",
          input.expectedVersion,
          current.metadata.version,
        );
      }
      if (!isCasePlanItemStatus(input.status))
        return invalid<CasePlanItem>("invalid_plan_item");
      if (input.status === current.status) return invalid<CasePlanItem>("no_changes");
      const nextTime = clock.next();
      const next: CasePlanItem = {
        ...current,
        status: input.status,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      store.casePlanItems.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async remove(
      context: ServiceContext,
      caseId: CaseId,
      planItemId: CasePlanItemId,
      expectedVersion: number,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<void>();
      const current = store.casePlanItems.get(planItemId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<void>();
      }
      if (expectedVersion !== current.metadata.version) {
        return conflict<void>(
          "plan_item_version_conflict",
          expectedVersion,
          current.metadata.version,
        );
      }
      store.casePlanItems.delete(planItemId);
      return { ok: true, data: undefined };
    },
  };
}
