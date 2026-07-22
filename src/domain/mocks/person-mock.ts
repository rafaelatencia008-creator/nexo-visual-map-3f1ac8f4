/**
 * PersonService + CasePersonService + RelationshipService — implementação em memória.
 *
 * Regras:
 *  - `Person.update` bloqueia mudanças `adult` → `child`/`adolescent` quando
 *    existem `CasePerson` com `restrictedByDefault=false` — o profissional
 *    deve atualizar cada vínculo versionadamente antes.
 *  - `CasePerson.create`/`update` forçam `restrictedByDefault=true` para
 *    menores.
 *  - `CasePerson.remove` bloqueia quando a pessoa ainda participa de
 *    relacionamentos naquele caso.
 *  - `Relationship.update` bloqueia duplicatas equivalentes.
 */

import type { Person } from "../core/person";
import { isMinor } from "../core/person";
import type { CasePerson, Relationship } from "../core/assignment";
import type {
  CaseId,
  CasePersonId,
  PersonId,
  RelationshipId,
} from "../core/ids";
import {
  PERSON_SORT_FIELDS,
  type CasePersonService,
  type PersonService,
  type PersonListRequest,
  type RelationshipService,
} from "../services/person-service";
import type {
  CreateCasePersonInput,
  CreatePersonInput,
  CreateRelationshipInput,
  UpdateCasePersonInput,
  UpdatePersonInput,
  UpdateRelationshipInput,
} from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { PageRequest, PageResult } from "../services/pagination";
import {
  validateCasePerson,
  validatePerson,
  validateRelationship,
} from "../core/validators";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import { requireContext } from "./context-validation";
import { paginateItems, stableStringify } from "./pagination-mock";
import { sortStable } from "./sort";
import { validateSort } from "./sort-validation";

function notFound<T>(): ServiceResult<T> {
  return { ok: false, error: { code: "not_found", message: "resource_not_found" } };
}

// ---- PersonService ---------------------------------------------------------

export function createPersonServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): PersonService {
  return {
    async getById(context, id) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const p = store.persons.get(id);
      if (!p || p.organizationId !== v.data.context.organizationId) {
        return notFound<Person>();
      }
      return { ok: true, data: deepClone(p) };
    },
    async list(
      context: ServiceContext,
      request: PersonListRequest,
    ): Promise<ServiceResult<PageResult<Person>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const sortCheck = validateSort(request.sortBy, request.sortDir, PERSON_SORT_FIELDS);
      if (!sortCheck.ok) return sortCheck;
      const orgId = v.data.context.organizationId;
      let items = Array.from(store.persons.values()).filter(
        (p) => p.organizationId === orgId,
      );
      const f = request.filter;
      if (f?.ageClassifications && f.ageClassifications.length > 0) {
        items = items.filter((p) =>
          f.ageClassifications!.includes(p.ageClassification),
        );
      }
      if (f?.search) {
        const term = f.search.trim().toLowerCase();
        if (term.length > 0) {
          items = items.filter((p) => p.displayLabel.toLowerCase().includes(term));
        }
      }
      const dir = request.sortDir ?? "asc";
      const field = request.sortBy ?? "displayLabel";
      const pick =
        field === "ageClassification"
          ? (p: Person) => p.ageClassification
          : field === "createdAt"
            ? (p: Person) => p.metadata.createdAt
            : (p: Person) => p.displayLabel;
      items = sortStable(items, pick, dir);
      const queryKey = `person-list|org=${orgId}|f=${stableStringify(request.filter)}|sortBy=${field}|sortDir=${dir}`;
      return paginateItems(items, request.page, queryKey);
    },
    async create(context, input: CreatePersonInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (input.displayLabel.trim().length === 0) {
        return {
          ok: false,
          error: { code: "validation_error", message: "invalid_person_input" },
        };
      }
      const previewId = ids.previewNext("person");
      const previewTime = clock.previewNext();
      const preview: Person = {
        id: previewId,
        organizationId: v.data.context.organizationId,
        displayLabel: input.displayLabel,
        ageClassification: input.ageClassification,
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      const check = validatePerson(preview);
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      ids.next("person");
      clock.next();
      store.persons.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },
    async update(
      context: ServiceContext,
      id: PersonId,
      input: UpdatePersonInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const current = store.persons.get(id);
      if (!current || current.organizationId !== v.data.context.organizationId) {
        return notFound<Person>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "person_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      const mutated: Person = {
        ...current,
        ...(input.displayLabel !== undefined
          ? { displayLabel: input.displayLabel }
          : {}),
        ...(input.ageClassification !== undefined
          ? { ageClassification: input.ageClassification }
          : {}),
      };
      // Proteção: se pessoa passa a ser menor, todos os vínculos existentes
      // precisam estar com restrictedByDefault=true.
      if (
        !isMinor(current) &&
        isMinor(mutated)
      ) {
        for (const cp of store.casePersons.values()) {
          if (cp.personId === current.id && cp.restrictedByDefault === false) {
            return {
              ok: false,
              error: {
                code: "validation_error",
                message: "case_person_links_unprotected",
              },
            };
          }
        }
      }
      const preview: Person = {
        ...mutated,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: current.metadata.updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validatePerson(preview);
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      const next: Person = {
        ...preview,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: clock.next(),
          version: current.metadata.version + 1,
        },
      };
      store.persons.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
  };
}

// ---- CasePersonService -----------------------------------------------------

export function createCasePersonServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): CasePersonService {
  return {
    async getById(context, caseId, casePersonId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const cp = store.casePersons.get(casePersonId);
      const c = store.cases.get(caseId);
      const orgId = v.data.context.organizationId;
      if (!c || c.organizationId !== orgId) return notFound<CasePerson>();
      if (!cp || cp.organizationId !== orgId || cp.caseId !== caseId) {
        return notFound<CasePerson>();
      }
      return { ok: true, data: deepClone(cp) };
    },
    async listByCase(
      context: ServiceContext,
      caseId: CaseId,
      page: PageRequest,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) {
        return notFound<PageResult<CasePerson>>();
      }
      const items = sortStable(
        Array.from(store.casePersons.values()).filter(
          (cp) => cp.organizationId === orgId && cp.caseId === caseId,
        ),
        (cp) => cp.metadata.createdAt,
        "asc",
      );
      const queryKey = `casePerson-listByCase|org=${orgId}|case=${caseId}`;
      return paginateItems(items, page, queryKey);
    },
    async create(context, input: CreateCasePersonInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(input.caseId);
      const p = store.persons.get(input.personId);
      if (!c || c.organizationId !== orgId) return notFound<CasePerson>();
      if (!p || p.organizationId !== orgId) return notFound<CasePerson>();
      for (const cp of store.casePersons.values()) {
        if (cp.caseId === input.caseId && cp.personId === input.personId) {
          return {
            ok: false,
            error: { code: "conflict", message: "duplicate_case_person" },
          };
        }
      }
      const restricted = isMinor(p) ? true : input.restrictedByDefault;
      const previewId = ids.previewNext("casePerson");
      const previewTime = clock.previewNext();
      const preview: CasePerson = {
        id: previewId,
        organizationId: orgId,
        caseId: input.caseId,
        personId: input.personId,
        role: input.role,
        restrictedByDefault: restricted,
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      const check = validateCasePerson(preview, {
        cases: Array.from(store.cases.values()),
        persons: Array.from(store.persons.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      ids.next("casePerson");
      clock.next();
      store.casePersons.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },
    async update(context, caseId: CaseId, input: UpdateCasePersonInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CasePerson>();
      const current = store.casePersons.get(input.casePersonId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<CasePerson>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "case_person_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      const person = store.persons.get(current.personId);
      const restricted =
        person && isMinor(person)
          ? true
          : input.restrictedByDefault !== undefined
            ? input.restrictedByDefault
            : current.restrictedByDefault;
      const mutated: CasePerson = {
        ...current,
        ...(input.role !== undefined ? { role: input.role } : {}),
        restrictedByDefault: restricted,
      };
      const preview: CasePerson = {
        ...mutated,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: current.metadata.updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validateCasePerson(preview, {
        cases: Array.from(store.cases.values()),
        persons: Array.from(store.persons.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      const next: CasePerson = {
        ...preview,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: clock.next(),
          version: current.metadata.version + 1,
        },
      };
      store.casePersons.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async remove(
      context: ServiceContext,
      caseId: CaseId,
      casePersonId: CasePersonId,
      expectedVersion: number,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<CasePerson>();
      const current = store.casePersons.get(casePersonId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<CasePerson>();
      }
      if (expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "case_person_version_conflict",
            expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      // Consistência: bloquear se a pessoa ainda participa de relacionamentos
      // do mesmo caso.
      for (const r of store.relationships.values()) {
        if (
          r.caseId === caseId &&
          (r.fromPersonId === current.personId || r.toPersonId === current.personId)
        ) {
          return {
            ok: false,
            error: { code: "conflict", message: "case_person_in_use" },
          };
        }
      }
      store.casePersons.delete(casePersonId);
      return { ok: true, data: deepClone(current) };
    },
  };
}

// ---- RelationshipService ---------------------------------------------------

function findDuplicateRelationship(
  store: MockStore,
  candidate: Relationship,
): boolean {
  for (const r of store.relationships.values()) {
    if (
      r.id !== candidate.id &&
      r.caseId === candidate.caseId &&
      r.fromPersonId === candidate.fromPersonId &&
      r.toPersonId === candidate.toPersonId &&
      r.type === candidate.type
    ) {
      return true;
    }
  }
  return false;
}

export function createRelationshipServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): RelationshipService {
  return {
    async getById(context, caseId, id) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Relationship>();
      const r = store.relationships.get(id);
      if (!r || r.organizationId !== orgId || r.caseId !== caseId) {
        return notFound<Relationship>();
      }
      return { ok: true, data: deepClone(r) };
    },
    async listByCase(
      context: ServiceContext,
      caseId: CaseId,
      page: PageRequest,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) {
        return notFound<PageResult<Relationship>>();
      }
      const items = sortStable(
        Array.from(store.relationships.values()).filter(
          (r) => r.organizationId === orgId && r.caseId === caseId,
        ),
        (r) => r.metadata.createdAt,
        "asc",
      );
      const queryKey = `relationship-listByCase|org=${orgId}|case=${caseId}`;
      return paginateItems(items, page, queryKey);
    },
    async create(context, input: CreateRelationshipInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(input.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Relationship>();
      if (input.fromPersonId === input.toPersonId) {
        return {
          ok: false,
          error: { code: "validation_error", message: "self_relationship" },
        };
      }
      const casePeople = Array.from(store.casePersons.values()).filter(
        (cp) => cp.caseId === input.caseId && cp.organizationId === orgId,
      );
      const hasFrom = casePeople.some((cp) => cp.personId === input.fromPersonId);
      const hasTo = casePeople.some((cp) => cp.personId === input.toPersonId);
      if (!hasFrom || !hasTo) {
        return {
          ok: false,
          error: {
            code: "validation_error",
            message: "person_not_linked_to_case",
          },
        };
      }
      for (const r of store.relationships.values()) {
        if (
          r.caseId === input.caseId &&
          r.fromPersonId === input.fromPersonId &&
          r.toPersonId === input.toPersonId &&
          r.type === input.type
        ) {
          return {
            ok: false,
            error: { code: "conflict", message: "duplicate_relationship" },
          };
        }
      }
      const previewId = ids.previewNext("relationship");
      const previewTime = clock.previewNext();
      const preview: Relationship = {
        id: previewId,
        organizationId: orgId,
        caseId: input.caseId,
        fromPersonId: input.fromPersonId,
        toPersonId: input.toPersonId,
        type: input.type,
        metadata: { createdAt: previewTime, updatedAt: previewTime, version: 1 },
      };
      const check = validateRelationship(preview, {
        cases: Array.from(store.cases.values()),
        persons: Array.from(store.persons.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      ids.next("relationship");
      clock.next();
      store.relationships.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },
    async update(
      context: ServiceContext,
      caseId: CaseId,
      input: UpdateRelationshipInput,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Relationship>();
      const current = store.relationships.get(input.relationshipId);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<Relationship>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "relationship_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      const mutated: Relationship = {
        ...current,
        ...(input.type !== undefined ? { type: input.type } : {}),
      };
      if (findDuplicateRelationship(store, mutated)) {
        return {
          ok: false,
          error: { code: "conflict", message: "duplicate_relationship" },
        };
      }
      const preview: Relationship = {
        ...mutated,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: current.metadata.updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validateRelationship(preview, {
        cases: Array.from(store.cases.values()),
        persons: Array.from(store.persons.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      const next: Relationship = {
        ...preview,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt: clock.next(),
          version: current.metadata.version + 1,
        },
      };
      store.relationships.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async remove(
      context: ServiceContext,
      caseId: CaseId,
      id: RelationshipId,
      expectedVersion: number,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Relationship>();
      const current = store.relationships.get(id);
      if (!current || current.organizationId !== orgId || current.caseId !== caseId) {
        return notFound<Relationship>();
      }
      if (expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "relationship_version_conflict",
            expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      store.relationships.delete(id);
      return { ok: true, data: deepClone(current) };
    },
  };
}
