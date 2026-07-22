/**
 * CaseService — implementação em memória.
 *
 * Normalizações:
 *  - `create` faz trim de `reference` e `title`;
 *  - `list` valida `sortBy`/`sortDir` contra catálogos oficiais.
 * Efeitos colaterais: `clock.next()` e `ids.next()` só são consumidos
 * depois que todas as validações prévias passam.
 */

import type { Case } from "../core/case";
import { computeReadiness } from "../core/case";
import type { CaseId } from "../core/ids";
import type {
  CaseService,
  CaseListRequest,
  CaseReadinessView,
  CaseReadinessIssue,
} from "../services/case-service";
import { CASE_READINESS_ISSUES } from "../services/case-service";
import {
  CASE_SORT_FIELDS,
  type ChangeCaseStatusInput,
  type CreateCaseInput,
  type UpdateCaseInput,
} from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { PageResult } from "../services/pagination";
import { validateCase } from "../core/validators";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import { requireContext } from "./context-validation";
import { paginateItems } from "./pagination-mock";
import { sortStable } from "./sort";
import { validateSort } from "./sort-validation";

function notFound<T>(): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: "resource_not_found" } };
}

export function createCaseServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): CaseService {
  return {
    async getById(context, caseId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== v.data.context.organizationId) {
        return notFound<Case>();
      }
      return { ok: true, data: deepClone(c) };
    },
    async list(
      context: ServiceContext,
      request: CaseListRequest,
    ): Promise<ServiceResult<PageResult<Case>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const sortCheck = validateSort(request.sortBy, request.sortDir, CASE_SORT_FIELDS);
      if (!sortCheck.ok) return sortCheck;
      const orgId = v.data.context.organizationId;
      let items = Array.from(store.cases.values()).filter(
        (c) => c.organizationId === orgId,
      );
      const f = request.filter;
      if (f?.statuses && f.statuses.length > 0) {
        items = items.filter((c) => f.statuses!.includes(c.status));
      }
      if (f?.confidentiality && f.confidentiality.length > 0) {
        items = items.filter((c) => f.confidentiality!.includes(c.confidentiality));
      }
      if (f?.search) {
        const term = f.search.trim().toLowerCase();
        if (term.length > 0) {
          items = items.filter(
            (c) =>
              c.reference.toLowerCase().includes(term) ||
              c.title.toLowerCase().includes(term),
          );
        }
      }
      const dir = request.sortDir ?? "asc";
      const field = request.sortBy ?? "updatedAt";
      const pick =
        field === "title"
          ? (c: Case) => c.title
          : field === "reference"
            ? (c: Case) => c.reference
            : field === "status"
              ? (c: Case) => c.status
              : field === "createdAt"
                ? (c: Case) => c.metadata.createdAt
                : (c: Case) => c.metadata.updatedAt;
      items = sortStable(items, pick, dir);
      return paginateItems(items, request.page);
    },
    async create(context, input: CreateCaseInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const reference = input.reference.trim();
      const title = input.title.trim();
      if (reference.length === 0 || title.length === 0) {
        return {
          ok: false,
          error: {
            code: "validation_error",
            message: "invalid_case_input",
            fieldErrors: {
              ...(reference.length === 0 ? { reference: ["empty"] } : {}),
              ...(title.length === 0 ? { title: ["empty"] } : {}),
            },
          },
        };
      }
      for (const c of store.cases.values()) {
        if (c.organizationId === orgId && c.reference === reference) {
          return {
            ok: false,
            error: { code: "conflict", message: "duplicate_case_reference" },
          };
        }
      }
      const id = ids.next("case");
      const now = clock.next();
      const next: Case = {
        id,
        organizationId: orgId,
        reference,
        title,
        status: "draft",
        confidentiality: input.confidentiality,
        conflictCheck: "not_reviewed",
        objectDefined: false,
        deadlineStatus: "not_reviewed",
        metadata: { createdAt: now, updatedAt: now, version: 1 },
      };
      const check = validateCase(next);
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      store.cases.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async update(context, caseId: CaseId, input: UpdateCaseInput) {
      return applyCaseMutation(store, clock, context, caseId, input.expectedVersion, (c) => ({
        ...c,
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.confidentiality !== undefined
          ? { confidentiality: input.confidentiality }
          : {}),
        ...(input.objectDefined !== undefined
          ? { objectDefined: input.objectDefined }
          : {}),
        ...(input.deadlineStatus !== undefined
          ? { deadlineStatus: input.deadlineStatus }
          : {}),
        ...(input.conflictCheck !== undefined
          ? { conflictCheck: input.conflictCheck }
          : {}),
      }));
    },
    async changeStatus(context, input: ChangeCaseStatusInput) {
      return applyCaseMutation(store, clock, context, input.caseId, input.expectedVersion, (c) => ({
        ...c,
        status: input.status,
      }));
    },
    async archive(context, caseId: CaseId, expectedVersion: number) {
      return applyCaseMutation(store, clock, context, caseId, expectedVersion, (c) => ({
        ...c,
        status: "archived",
      }));
    },
    async getReadiness(context, caseId: CaseId): Promise<ServiceResult<CaseReadinessView>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== v.data.context.organizationId) {
        return notFound<CaseReadinessView>();
      }
      const professionalRoleDefined = Array.from(store.assignments.values()).some(
        (a) => a.caseId === c.id && a.status === "active",
      );
      const readiness = computeReadiness(c, professionalRoleDefined);
      const issues: CaseReadinessIssue[] = [];
      for (const key of CASE_READINESS_ISSUES) {
        if (!readiness[key]) issues.push(key);
      }
      return {
        ok: true,
        data: { readiness: { ...readiness }, issues },
      };
    },
  };
}

function applyCaseMutation(
  store: MockStore,
  clock: MockClock,
  context: ServiceContext,
  caseId: CaseId,
  expectedVersion: number,
  mutate: (c: Case) => Case,
): ServiceResult<Case> {
  const v = requireContext(store, context);
  if (!v.ok) return v;
  const current = store.cases.get(caseId);
  if (!current || current.organizationId !== v.data.context.organizationId) {
    return notFound<Case>();
  }
  if (expectedVersion !== current.metadata.version) {
    return {
      ok: false,
      error: {
        code: "conflict",
        message: "case_version_conflict",
        expectedVersion,
        actualVersion: current.metadata.version,
      },
    };
  }
  const mutated = mutate(current);
  const preview: Case = {
    ...mutated,
    metadata: {
      createdAt: current.metadata.createdAt,
      updatedAt: current.metadata.updatedAt,
      version: current.metadata.version + 1,
    },
  };
  const check = validateCase(preview);
  if (!check.ok) {
    return { ok: false, error: { code: "validation_error", message: check.reason } };
  }
  const next: Case = {
    ...preview,
    metadata: {
      createdAt: current.metadata.createdAt,
      updatedAt: clock.next(),
      version: current.metadata.version + 1,
    },
  };
  store.cases.set(next.id, next);
  return { ok: true, data: deepClone(next) };
}
