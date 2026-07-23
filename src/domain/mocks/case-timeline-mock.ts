/**
 * CaseTimelineService — implementação em memória (LV-08.5A).
 */

import type { CaseTimelineEntry, CaseTimelineEntryKind } from "../core/case-plan";
import {
  CASE_TIMELINE_ENTRY_DESCRIPTION_MAX,
  CASE_TIMELINE_ENTRY_TITLE_MAX,
  isCaseTimelineEntry,
  isCaseTimelineEntryKind,
} from "../core/case-plan";
import { isIsoDate } from "../core/common";
import type { CaseId, CaseTimelineEntryId } from "../core/ids";
import type { CaseTimelineService } from "../services/case-timeline-service";
import type {
  CreateCaseTimelineEntryInput,
  UpdateCaseTimelineEntryInput,
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
  return { ok: false, error: { code: "not_found", message: "timeline_entry_not_found" } };
}
function invalid<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "validation_error", message: msg } };
}
function conflict<T>(msg: string, e: number, a: number): ServiceResult<T> {
  return {
    ok: false,
    error: { code: "conflict", message: msg, expectedVersion: e, actualVersion: a },
  };
}

function validateTitle(v: string): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || t.length > CASE_TIMELINE_ENTRY_TITLE_MAX) return null;
  return t;
}
function validateDescription(v: string): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || t.length > CASE_TIMELINE_ENTRY_DESCRIPTION_MAX) return null;
  return t;
}

function compareTimeline(a: CaseTimelineEntry, b: CaseTimelineEntry): number {
  if (a.occurredOn !== b.occurredOn) {
    return a.occurredOn < b.occurredOn ? 1 : -1;
  }
  if (a.metadata.createdAt !== b.metadata.createdAt) {
    return a.metadata.createdAt < b.metadata.createdAt ? 1 : -1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function createCaseTimelineServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): CaseTimelineService {
  return {
    async getById(context, caseId, timelineEntryId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CaseTimelineEntry>();
      const t = store.caseTimelineEntries.get(timelineEntryId);
      if (!t || t.organizationId !== orgId || t.caseId !== caseId) {
        return notFound<CaseTimelineEntry>();
      }
      return { ok: true, data: deepClone(t) };
    },

    async listByCase(
      context: ServiceContext,
      caseId: CaseId,
      page: PageRequest,
    ): Promise<ServiceResult<PageResult<CaseTimelineEntry>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) {
        return notFound<PageResult<CaseTimelineEntry>>();
      }
      const items = Array.from(store.caseTimelineEntries.values()).filter(
        (t) => t.organizationId === orgId && t.caseId === caseId,
      );
      items.sort(compareTimeline);
      const queryKey = `caseTimeline-listByCase|org=${orgId}|case=${caseId}`;
      return paginateItems(items, page, queryKey);
    },

    async create(context, input: CreateCaseTimelineEntryInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(input.caseId);
      if (!c || c.organizationId !== orgId) return notFound<CaseTimelineEntry>();
      if (!isCaseTimelineEntryKind(input.kind))
        return invalid<CaseTimelineEntry>("invalid_timeline_entry");
      if (!isIsoDate(input.occurredOn))
        return invalid<CaseTimelineEntry>("invalid_timeline_entry");
      const title = validateTitle(input.title);
      if (title === null) return invalid<CaseTimelineEntry>("invalid_timeline_entry");
      let description: string | undefined = undefined;
      if (input.description !== undefined) {
        const d = validateDescription(input.description);
        if (d === null) return invalid<CaseTimelineEntry>("invalid_timeline_entry");
        description = d;
      }
      const previewId = ids.previewNext("caseTimelineEntry");
      const previewTime = clock.previewNext();
      const preview: CaseTimelineEntry = {
        id: previewId,
        organizationId: orgId,
        caseId: input.caseId,
        kind: input.kind,
        occurredOn: input.occurredOn,
        title,
        ...(description !== undefined ? { description } : {}),
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      if (!isCaseTimelineEntry(preview))
        return invalid<CaseTimelineEntry>("invalid_timeline_entry");
      ids.next("caseTimelineEntry");
      clock.next();
      store.caseTimelineEntries.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },

    async update(
      context: ServiceContext,
      caseId: CaseId,
      input: UpdateCaseTimelineEntryInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CaseTimelineEntry>();
      const current = store.caseTimelineEntries.get(input.timelineEntryId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<CaseTimelineEntry>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return conflict<CaseTimelineEntry>(
          "timeline_entry_version_conflict",
          input.expectedVersion,
          current.metadata.version,
        );
      }
      let nextKind: CaseTimelineEntryKind = current.kind;
      let nextOccurredOn = current.occurredOn;
      let nextTitle: string = current.title;
      let nextDescription: string | undefined = current.description;
      let changed = false;

      if (input.kind !== undefined) {
        if (!isCaseTimelineEntryKind(input.kind))
          return invalid<CaseTimelineEntry>("invalid_timeline_entry");
        if (input.kind !== current.kind) { nextKind = input.kind; changed = true; }
      }
      if (input.occurredOn !== undefined) {
        if (!isIsoDate(input.occurredOn))
          return invalid<CaseTimelineEntry>("invalid_timeline_entry");
        if (input.occurredOn !== current.occurredOn) {
          nextOccurredOn = input.occurredOn; changed = true;
        }
      }
      if (input.title !== undefined) {
        const t = validateTitle(input.title);
        if (t === null) return invalid<CaseTimelineEntry>("invalid_timeline_entry");
        if (t !== current.title) { nextTitle = t; changed = true; }
      }
      if (input.description !== undefined) {
        if (input.description === null) {
          if (current.description !== undefined) { nextDescription = undefined; changed = true; }
        } else {
          const d = validateDescription(input.description);
          if (d === null) return invalid<CaseTimelineEntry>("invalid_timeline_entry");
          if (d !== current.description) { nextDescription = d; changed = true; }
        }
      }
      if (!changed) return invalid<CaseTimelineEntry>("no_changes");

      const nextTime = clock.next();
      const next: CaseTimelineEntry = {
        id: current.id,
        organizationId: current.organizationId,
        caseId: current.caseId,
        kind: nextKind,
        occurredOn: nextOccurredOn,
        title: nextTitle,
        ...(nextDescription !== undefined ? { description: nextDescription } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: nextTime,
          version: current.metadata.version + 1,
        },
      };
      if (!isCaseTimelineEntry(next))
        return invalid<CaseTimelineEntry>("invalid_timeline_entry");
      store.caseTimelineEntries.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },

    async remove(
      context: ServiceContext,
      caseId: CaseId,
      timelineEntryId: CaseTimelineEntryId,
      expectedVersion: number,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<void>();
      const current = store.caseTimelineEntries.get(timelineEntryId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<void>();
      }
      if (expectedVersion !== current.metadata.version) {
        return conflict<void>(
          "timeline_entry_version_conflict",
          expectedVersion,
          current.metadata.version,
        );
      }
      store.caseTimelineEntries.delete(timelineEntryId);
      return { ok: true, data: undefined };
    },
  };
}
