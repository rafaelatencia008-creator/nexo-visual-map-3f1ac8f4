/**
 * AssignmentService — implementação em memória.
 *
 * Invariantes de duplicidade ativa (mesmo caso + perfil + papel + status
 * "active") são impostas em `create`, `update` e `changeStatus`.
 */

import type { Assignment } from "../core/assignment";
import type { AssignmentId, CaseId } from "../core/ids";
import { isIsoDate } from "../core/common";
import type { AssignmentService } from "../services/assignment-service";
import type {
  ChangeAssignmentStatusInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { PageRequest, PageResult } from "../services/pagination";
import { validateAssignment } from "../core/validators";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import { requireContext } from "./context-validation";
import { paginateItems } from "./pagination-mock";
import { sortStable } from "./sort";

function notFound<T>(): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: "resource_not_found" } };
}

function hasEquivalentActive(
  store: MockStore,
  candidate: Assignment,
): boolean {
  for (const a of store.assignments.values()) {
    if (
      a.id !== candidate.id &&
      a.status === "active" &&
      candidate.status === "active" &&
      a.caseId === candidate.caseId &&
      a.professionalProfileId === candidate.professionalProfileId &&
      a.role === candidate.role
    ) {
      return true;
    }
  }
  return false;
}

export function createAssignmentServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): AssignmentService {
  return {
    async getById(context, caseId, id: AssignmentId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Assignment>();
      const a = store.assignments.get(id);
      if (!a || a.organizationId !== orgId || a.caseId !== caseId) {
        return notFound<Assignment>();
      }
      return { ok: true, data: deepClone(a) };
    },
    async listByCase(
      context: ServiceContext,
      caseId: CaseId,
      page: PageRequest,
    ): Promise<ServiceResult<PageResult<Assignment>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) {
        return notFound<PageResult<Assignment>>();
      }
      const items = sortStable(
        Array.from(store.assignments.values()).filter(
          (a) => a.organizationId === orgId && a.caseId === caseId,
        ),
        (a) => a.metadata.createdAt,
        "asc",
      );
      const queryKey = `assignment-listByCase|org=${orgId}|case=${caseId}`;
      return paginateItems(items, page, queryKey);
    },
    async create(context, input: CreateAssignmentInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(input.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Assignment>();
      const prof = store.professionalProfiles.get(input.professionalProfileId);
      if (!prof || prof.organizationId !== orgId) return notFound<Assignment>();
      if (!isIsoDate(input.startedOn)) {
        return {
          ok: false,
          error: { code: "validation_error", message: "invalid_started_on" },
        };
      }
      for (const a of store.assignments.values()) {
        if (
          a.caseId === input.caseId &&
          a.professionalProfileId === input.professionalProfileId &&
          a.role === input.role &&
          a.status === "active"
        ) {
          return {
            ok: false,
            error: { code: "conflict", message: "duplicate_active_assignment" },
          };
        }
      }
      const previewId = ids.previewNext("assignment");
      const previewTime = clock.previewNext();
      const preview: Assignment = {
        id: previewId,
        organizationId: orgId,
        caseId: input.caseId,
        professionalProfileId: input.professionalProfileId,
        role: input.role,
        status: "active",
        ...(input.section !== undefined ? { section: input.section } : {}),
        startedOn: input.startedOn,
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      const check = validateAssignment(preview, {
        cases: Array.from(store.cases.values()),
        professionalProfiles: Array.from(store.professionalProfiles.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      ids.next("assignment");
      clock.next();
      store.assignments.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },
    async update(
      context: ServiceContext,
      caseId: CaseId,
      input: UpdateAssignmentInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Assignment>();
      const current = store.assignments.get(input.assignmentId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<Assignment>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "assignment_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      if (input.endedOn !== undefined && !isIsoDate(input.endedOn)) {
        return {
          ok: false,
          error: { code: "validation_error", message: "invalid_ended_on" },
        };
      }
      const mutated: Assignment = {
        ...current,
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.section !== undefined ? { section: input.section } : {}),
        ...(input.endedOn !== undefined ? { endedOn: input.endedOn } : {}),
      };
      if (hasEquivalentActive(store, mutated)) {
        return {
          ok: false,
          error: { code: "conflict", message: "duplicate_active_assignment" },
        };
      }
      const preview: Assignment = {
        ...mutated,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: current.metadata.updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validateAssignment(preview, {
        cases: Array.from(store.cases.values()),
        professionalProfiles: Array.from(store.professionalProfiles.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      const next: Assignment = {
        ...preview,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: clock.next(),
          version: current.metadata.version + 1,
        },
      };
      store.assignments.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async changeStatus(
      context: ServiceContext,
      caseId: CaseId,
      input: ChangeAssignmentStatusInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Assignment>();
      const current = store.assignments.get(input.assignmentId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<Assignment>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "assignment_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      const mutated: Assignment = { ...current, status: input.status };
      if (hasEquivalentActive(store, mutated)) {
        return {
          ok: false,
          error: { code: "conflict", message: "duplicate_active_assignment" },
        };
      }
      const preview: Assignment = {
        ...mutated,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: current.metadata.updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validateAssignment(preview, {
        cases: Array.from(store.cases.values()),
        professionalProfiles: Array.from(store.professionalProfiles.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      const next: Assignment = {
        ...preview,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: clock.next(),
          version: current.metadata.version + 1,
        },
      };
      store.assignments.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
  };
}
