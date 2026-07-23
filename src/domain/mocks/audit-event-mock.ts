/**
 * Mock interno do registrador de auditoria — LV-08.6A.
 *
 * Este módulo NÃO exporta `appendAuditEvent` pelo barrel público
 * (`src/domain/mocks/index.ts`). É consumido apenas pelo `factory.ts`
 * para embutir auditoria automática nas escritas bem-sucedidas.
 */

import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import type { ServiceContext } from "../services/context";
import type { AuditEventService } from "../services/audit-service";
import type {
  AuditEvent,
  AuditAction,
  AuditTargetType,
} from "../core/case-audit";
import { AUDIT_SUMMARY, isAuditEvent } from "../core/case-audit";
import { isAuditAction, isAuditTargetType } from "../core/case-audit";
import type { CaseId, OrganizationId } from "../core/ids";
import { isCaseId } from "../core/ids";
import { deepClone } from "./clone";
import { requireContext } from "./context-validation";
import { paginateItems } from "./pagination-mock";
import { validatePageRequest, type PageRequest } from "../services/pagination";
import { isIsoDateTime } from "../core/common";
import type { ServiceResult } from "../services/result";
import type { PageResult } from "../services/pagination";

// ---- Registrador interno ---------------------------------------------------

export type AppendAuditEventArgs = Readonly<{
  organizationId: OrganizationId;
  caseId: CaseId;
  actorUserId: string;
  actorMembershipId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
}>;

export interface InternalAuditAppender {
  append(args: AppendAuditEventArgs): AuditEvent;
}

export function createAuditAppender(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): InternalAuditAppender {
  return {
    append(args) {
      if (!isAuditAction(args.action)) {
        throw new Error(`audit: invalid action ${String(args.action)}`);
      }
      if (!isAuditTargetType(args.targetType)) {
        throw new Error(`audit: invalid targetType ${String(args.targetType)}`);
      }
      const id = ids.next("auditEvent");
      const occurredAt = clock.next();
      const summary = AUDIT_SUMMARY[args.action];
      const evt: AuditEvent = {
        id,
        organizationId: args.organizationId,
        caseId: args.caseId,
        actorUserId: args.actorUserId as AuditEvent["actorUserId"],
        actorMembershipId:
          args.actorMembershipId as AuditEvent["actorMembershipId"],
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId,
        summary,
        occurredAt,
        metadata: {
          createdAt: occurredAt,
          updatedAt: occurredAt,
          version: 1,
        },
      };
      if (!isAuditEvent(evt)) {
        throw new Error("audit: constructed event failed shape guard");
      }
      store.auditEvents.set(id, evt);
      return deepClone(evt);
    },
  };
}

// ---- Semeador --------------------------------------------------------------

/**
 * Insere um evento pré-fabricado (seed determinístico). Não usa clock/ids
 * dinâmicos — recebe todos os campos prontos e apenas armazena.
 */
export function seedAuditEvent(store: MockStore, evt: AuditEvent): void {
  if (!isAuditEvent(evt)) {
    throw new Error(`audit-seed: invalid event ${evt.id}`);
  }
  store.auditEvents.set(evt.id, evt);
}

// ---- Serviço público (somente leitura) ------------------------------------

function invalid<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "validation_error", message: msg } };
}
function notFound<T>(): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: "case_not_found" } };
}

const OPT_ALLOWED = new Set([
  "page",
  "actions",
  "targetTypes",
  "occurredFrom",
  "occurredTo",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function createAuditEventServiceMock(
  store: MockStore,
): AuditEventService {
  return {
    async listByCase(context, caseId, options) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId))
        return invalid<PageResult<AuditEvent>>("invalid_case_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<PageResult<AuditEvent>>();
      let page: PageRequest = { limit: 100 };
      const actions: Set<string> = new Set();
      const targetTypes: Set<string> = new Set();
      let hasActionFilter = false;
      let hasTargetFilter = false;
      let occurredFrom: string | undefined;
      let occurredTo: string | undefined;
      if (options !== undefined) {
        if (!isPlainObject(options))
          return invalid<PageResult<AuditEvent>>("invalid_options");
        for (const k of Object.keys(options)) {
          if (!OPT_ALLOWED.has(k))
            return invalid<PageResult<AuditEvent>>("unknown_option");
        }
        if (options.page !== undefined) {
          const p = validatePageRequest(options.page);
          if (!p.ok) return { ok: false, error: p.error };
          page = p.value;
        }
        if (options.actions !== undefined) {
          if (!Array.isArray(options.actions))
            return invalid<PageResult<AuditEvent>>("invalid_actions");
          hasActionFilter = true;
          for (const a of options.actions) {
            if (!isAuditAction(a))
              return invalid<PageResult<AuditEvent>>("invalid_actions");
            actions.add(a);
          }
        }
        if (options.targetTypes !== undefined) {
          if (!Array.isArray(options.targetTypes))
            return invalid<PageResult<AuditEvent>>("invalid_target_types");
          hasTargetFilter = true;
          for (const t of options.targetTypes) {
            if (!isAuditTargetType(t))
              return invalid<PageResult<AuditEvent>>("invalid_target_types");
            targetTypes.add(t);
          }
        }
        if (options.occurredFrom !== undefined) {
          if (!isIsoDateTime(options.occurredFrom))
            return invalid<PageResult<AuditEvent>>("invalid_occurred_from");
          occurredFrom = options.occurredFrom;
        }
        if (options.occurredTo !== undefined) {
          if (!isIsoDateTime(options.occurredTo))
            return invalid<PageResult<AuditEvent>>("invalid_occurred_to");
          occurredTo = options.occurredTo;
        }
        if (
          occurredFrom !== undefined &&
          occurredTo !== undefined &&
          occurredFrom > occurredTo
        ) {
          return invalid<PageResult<AuditEvent>>("invalid_range");
        }
      }
      const items = Array.from(store.auditEvents.values()).filter((e) => {
        if (e.organizationId !== orgId) return false;
        if (e.caseId !== caseId) return false;
        if (hasActionFilter && !actions.has(e.action)) return false;
        if (hasTargetFilter && !targetTypes.has(e.targetType)) return false;
        if (occurredFrom !== undefined && e.occurredAt < occurredFrom) return false;
        if (occurredTo !== undefined && e.occurredAt > occurredTo) return false;
        return true;
      });
      // Ordenação determinística: occurredAt desc, id desc.
      items.sort((a, b) => {
        if (a.occurredAt !== b.occurredAt) {
          return a.occurredAt < b.occurredAt ? 1 : -1;
        }
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
      const filterKey = JSON.stringify({
        actions: Array.from(actions).sort(),
        targetTypes: Array.from(targetTypes).sort(),
        occurredFrom: occurredFrom ?? null,
        occurredTo: occurredTo ?? null,
      });
      const queryKey = `audit-listByCase|org=${orgId}|case=${caseId}|f=${filterKey}`;
      return paginateItems(items, page, queryKey);
    },
  };
}
