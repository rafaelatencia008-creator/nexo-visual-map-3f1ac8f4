/**
 * CaseSnapshotService — implementação em memória (LV-08.6A / LV-08.6A.1).
 *
 * Snapshots são imutáveis e completamente isolados do estado corrente
 * do processo. Cada leitura devolve cópia profunda. A criação de
 * snapshot é atômica: snapshot e evento de auditoria são preparados
 * antes de qualquer efetivação; falha na efetivação do evento reverte
 * o snapshot antes de retornar erro.
 */

import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import type { CaseSnapshotService } from "../services/case-snapshot-service";
import type { CreateCaseSnapshotInput } from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { PageRequest, PageResult } from "../services/pagination";
import type {
  CaseSnapshot,
  CaseSnapshotPayload,
} from "../core/case-audit";
import {
  CASE_SNAPSHOT_LABEL_MAX,
  CASE_SNAPSHOT_REASON_MAX,
  isCaseSnapshot,
} from "../core/case-audit";
import type { CaseSnapshotId } from "../core/ids";
import { isCaseId, isCaseSnapshotId } from "../core/ids";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
} from "../core/common";
import { deepClone } from "./clone";
import { requireContext } from "./context-validation";
import { paginateItems } from "./pagination-mock";
import { validatePageRequest } from "../services/pagination";
import type { InternalAuditAppender } from "./audit-event-mock";

function invalid<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "validation_error", message: msg } };
}
function notFound<T>(msg = "snapshot_not_found"): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: msg } };
}
function internal<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "internal_error", message: msg } };
}
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const CREATE_ALLOWED = new Set(["caseId", "label", "reason"]);
const LIST_OPT_ALLOWED = new Set(["page"]);

function compareSnapshots(a: CaseSnapshot, b: CaseSnapshot): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function createCaseSnapshotServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
  audit: InternalAuditAppender,
): CaseSnapshotService {
  return {
    async create(
      context: ServiceContext,
      input: CreateCaseSnapshotInput,
    ): Promise<ServiceResult<CaseSnapshot>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isPlainObject(input)) return invalid<CaseSnapshot>("invalid_input_shape");
      if (containsForbiddenKey(input)) return invalid<CaseSnapshot>("forbidden_key");
      if (!hasOnlyAllowedKeys(input, CREATE_ALLOWED))
        return invalid<CaseSnapshot>("unknown_key");
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId)) return invalid<CaseSnapshot>("invalid_case_id");
      if (typeof raw.label !== "string")
        return invalid<CaseSnapshot>("invalid_label");
      const labelTrim = raw.label.trim();
      if (labelTrim.length < 1 || labelTrim.length > CASE_SNAPSHOT_LABEL_MAX)
        return invalid<CaseSnapshot>("invalid_label");
      let reason: string | undefined;
      if (raw.reason !== undefined) {
        if (typeof raw.reason !== "string")
          return invalid<CaseSnapshot>("invalid_reason");
        const rt = raw.reason.trim();
        if (rt.length < 1 || rt.length > CASE_SNAPSHOT_REASON_MAX)
          return invalid<CaseSnapshot>("invalid_reason");
        reason = rt;
      }
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<CaseSnapshot>("case_not_found");

      // Coleta dados do processo, no mesmo escopo organizacional.
      const casePersons = Array.from(store.casePersons.values()).filter(
        (cp) => cp.organizationId === orgId && cp.caseId === raw.caseId,
      );
      const linkedPersonIds = new Set(casePersons.map((cp) => cp.personId));
      const persons = Array.from(store.persons.values()).filter(
        (p) => p.organizationId === orgId && linkedPersonIds.has(p.id),
      );
      if (persons.length !== linkedPersonIds.size) {
        return internal<CaseSnapshot>("linked_person_missing");
      }
      const relationships = Array.from(store.relationships.values()).filter(
        (r) => r.organizationId === orgId && r.caseId === raw.caseId,
      );
      const assignments = Array.from(store.assignments.values()).filter(
        (a) => a.organizationId === orgId && a.caseId === raw.caseId,
      );
      const casePlanItems = Array.from(store.casePlanItems.values()).filter(
        (p) => p.organizationId === orgId && p.caseId === raw.caseId,
      );
      const caseTimelineEntries = Array.from(
        store.caseTimelineEntries.values(),
      ).filter(
        (t) => t.organizationId === orgId && t.caseId === raw.caseId,
      );

      const payload: CaseSnapshotPayload = deepClone({
        case: c,
        casePersons,
        persons,
        relationships,
        assignments,
        casePlanItems,
        caseTimelineEntries,
      });

      const id = ids.next("caseSnapshot");
      const createdAt = clock.next();
      const snapshot: CaseSnapshot = {
        id,
        organizationId: orgId,
        caseId: raw.caseId,
        createdByUserId: v.data.context.userId,
        createdByMembershipId: v.data.context.membershipId,
        createdAt,
        label: labelTrim,
        ...(reason !== undefined ? { reason } : {}),
        payload,
        metadata: {
          createdAt,
          updatedAt: createdAt,
          version: 1,
        },
      };
      if (!isCaseSnapshot(snapshot)) {
        return internal<CaseSnapshot>("invalid_snapshot_shape");
      }

      // Fase 1: preparar evento sem tocar no store.
      let preparedEvent;
      try {
        preparedEvent = audit.prepare({
          organizationId: orgId,
          caseId: raw.caseId,
          actorUserId: v.data.context.userId,
          actorMembershipId: v.data.context.membershipId,
          action: "caseSnapshot.created",
          targetType: "caseSnapshot",
          targetId: id,
        });
      } catch {
        return internal<CaseSnapshot>("audit_prepare_failed");
      }

      // Fase 2: efetivar snapshot + evento atomicamente.
      store.caseSnapshots.set(id, snapshot);
      try {
        audit.commit(preparedEvent);
      } catch {
        // Rollback: remove snapshot para nunca deixar snapshot sem evento.
        store.caseSnapshots.delete(id);
        return internal<CaseSnapshot>("audit_commit_failed");
      }
      return { ok: true, data: deepClone(snapshot) };
    },

    async getById(context, caseId, snapshotId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId)) return invalid<CaseSnapshot>("invalid_case_id");
      if (!isCaseSnapshotId(snapshotId))
        return invalid<CaseSnapshot>("invalid_snapshot_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<CaseSnapshot>("case_not_found");
      const s = store.caseSnapshots.get(snapshotId);
      if (!s || s.organizationId !== orgId || s.caseId !== caseId) {
        return notFound<CaseSnapshot>();
      }
      return { ok: true, data: deepClone(s) };
    },

    async listByCase(
      context: ServiceContext,
      caseId,
      options,
    ): Promise<ServiceResult<PageResult<CaseSnapshot>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId))
        return invalid<PageResult<CaseSnapshot>>("invalid_case_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<PageResult<CaseSnapshot>>("case_not_found");
      let page: PageRequest = { limit: 100 };
      if (options !== undefined) {
        if (!isPlainObject(options))
          return invalid<PageResult<CaseSnapshot>>("invalid_options");
        if (containsForbiddenKey(options))
          return invalid<PageResult<CaseSnapshot>>("forbidden_key");
        if (!hasOnlyAllowedKeys(options, LIST_OPT_ALLOWED))
          return invalid<PageResult<CaseSnapshot>>("unknown_option");
        if (options.page !== undefined) {
          const p = validatePageRequest(options.page);
          if (!p.ok) return { ok: false, error: p.error };
          page = p.value;
        }
      }
      const items = Array.from(store.caseSnapshots.values()).filter(
        (s) => s.organizationId === orgId && s.caseId === caseId,
      );
      items.sort(compareSnapshots);
      const queryKey = `caseSnapshot-listByCase|org=${orgId}|case=${caseId}`;
      return paginateItems(items, page, queryKey);
    },
  };
}

// Suppress unused CaseSnapshotId reference for TS lint (kept for readability).
export type _KeepImports = CaseSnapshotId;
