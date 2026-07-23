/**
 * Fábrica pública dos mocks de domínio — LV-07.3 + LV-08.6A.
 *
 * Cada chamada devolve um ambiente totalmente isolado. Nenhuma instância
 * global é criada aqui. O store, o relógio, o gerador de IDs e o
 * appender de auditoria ficam fechados por closure.
 */

import {
  MOCK_BASE_EPOCH_MS,
  MOCK_TICK_MS,
  createMockClock,
} from "./clock";
import { createMockIdGenerator } from "./id-generator";
import { createEmptyStore, type MockStore } from "./store";
import { buildSeedSnapshot, validateMockDomainSeed } from "./seed";
import { deepClone } from "./clone";
import { createOrganizationServiceMock, createCurrentUserServiceMock } from "./organization-mock";
import { createMembershipServiceMock } from "./membership-mock";
import {
  createProfessionalProfileServiceMock,
  createCredentialServiceMock,
} from "./professional-mock";
import { createCaseServiceMock } from "./case-mock";
import {
  createPersonServiceMock,
  createCasePersonServiceMock,
  createRelationshipServiceMock,
} from "./person-mock";
import { createAssignmentServiceMock } from "./assignment-mock";
import { createCasePlanServiceMock } from "./case-plan-mock";
import { createCaseTimelineServiceMock } from "./case-timeline-mock";
import { createPermissionPolicyMock } from "./permission-mock";
import {
  createAuditAppender,
  createAuditEventServiceMock,
  type InternalAuditAppender,
} from "./audit-event-mock";
import { createCaseSnapshotServiceMock } from "./case-snapshot-mock";
import { createDeadlineServiceMock } from "./deadline-mock";
import { createAppointmentServiceMock } from "./appointment-mock";
import {
  guardOrganizationService,
  guardMembershipService,
  guardProfessionalProfileService,
  guardCredentialService,
  guardCaseService,
  guardPersonService,
  guardCasePersonService,
  guardRelationshipService,
  guardAssignmentService,
  guardCasePlanService,
  guardCaseTimelineService,
  guardAuditEventService,
  guardCaseSnapshotService,
  guardDeadlineService,
  guardAppointmentService,
} from "./permission-guards";
import {
  MOCK_DOMAIN_OPTIONS_ALLOWED_KEYS,
  type MockDomainEnvironment,
  type MockDomainOptions,
  type MockDomainServices,
  type MockDomainSnapshot,
} from "./types";
import { hasOnlyAllowedKeys, containsForbiddenKey } from "../core/common";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { CaseService } from "../services/case-service";
import type {
  CasePersonService,
  RelationshipService,
} from "../services/person-service";
import type { AssignmentService } from "../services/assignment-service";
import type { CasePlanService } from "../services/case-plan-service";
import type { CaseTimelineService } from "../services/case-timeline-service";
import type { Case } from "../core/case";
import type { CasePerson, Relationship, Assignment } from "../core/assignment";
import type { CasePlanItem, CaseTimelineEntry } from "../core/case-plan";
import type { AuditAction, AuditTargetType } from "../core/case-audit";
import type { CaseId } from "../core/ids";

function loadSeed(store: MockStore): void {
  const seed = buildSeedSnapshot();
  const issues = validateMockDomainSeed(seed);
  if (issues.length > 0) {
    throw new Error(
      `Mock seed inválido: ${issues.map((i) => `${i.entity}(${i.id})=${i.reason}`).join(", ")}`,
    );
  }
  for (const o of seed.organizations) store.organizations.set(o.id, deepClone(o));
  for (const u of seed.users) store.users.set(u.id, deepClone(u));
  for (const m of seed.memberships) store.memberships.set(m.id, deepClone(m));
  for (const p of seed.professionalProfiles)
    store.professionalProfiles.set(p.id, deepClone(p));
  for (const c of seed.credentials) store.credentials.set(c.id, deepClone(c));
  for (const c of seed.cases) store.cases.set(c.id, deepClone(c));
  for (const p of seed.persons) store.persons.set(p.id, deepClone(p));
  for (const cp of seed.casePersons) store.casePersons.set(cp.id, deepClone(cp));
  for (const r of seed.relationships) store.relationships.set(r.id, deepClone(r));
  for (const a of seed.assignments) store.assignments.set(a.id, deepClone(a));
  for (const p of seed.casePlanItems) store.casePlanItems.set(p.id, deepClone(p));
  for (const t of seed.caseTimelineEntries)
    store.caseTimelineEntries.set(t.id, deepClone(t));
  for (const e of seed.auditEvents) store.auditEvents.set(e.id, deepClone(e));
  for (const s of seed.caseSnapshots) store.caseSnapshots.set(s.id, deepClone(s));
  for (const d of seed.deadlines) store.deadlines.set(d.id, deepClone(d));
  for (const a of seed.appointments) store.appointments.set(a.id, deepClone(a));
}

function snapshot(store: MockStore): MockDomainSnapshot {
  return Object.freeze({
    organizations: Array.from(store.organizations.values()).map(deepClone),
    users: Array.from(store.users.values()).map(deepClone),
    memberships: Array.from(store.memberships.values()).map(deepClone),
    professionalProfiles: Array.from(store.professionalProfiles.values()).map(deepClone),
    credentials: Array.from(store.credentials.values()).map(deepClone),
    cases: Array.from(store.cases.values()).map(deepClone),
    persons: Array.from(store.persons.values()).map(deepClone),
    casePersons: Array.from(store.casePersons.values()).map(deepClone),
    relationships: Array.from(store.relationships.values()).map(deepClone),
    assignments: Array.from(store.assignments.values()).map(deepClone),
    casePlanItems: Array.from(store.casePlanItems.values()).map(deepClone),
    caseTimelineEntries: Array.from(store.caseTimelineEntries.values()).map(deepClone),
    auditEvents: Array.from(store.auditEvents.values()).map(deepClone),
    caseSnapshots: Array.from(store.caseSnapshots.values()).map(deepClone),
    deadlines: Array.from(store.deadlines.values()).map(deepClone),
    appointments: Array.from(store.appointments.values()).map(deepClone),
  });
}

// ---- Auditing decorators ---------------------------------------------------

function emit(
  audit: InternalAuditAppender,
  ctx: ServiceContext,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  caseId: CaseId,
): void {
  audit.append({
    organizationId: ctx.organizationId,
    caseId,
    actorUserId: ctx.userId,
    actorMembershipId: ctx.membershipId,
    action,
    targetType,
    targetId,
  });
}

function wrapCaseService(s: CaseService, audit: InternalAuditAppender): CaseService {
  return {
    getById: s.getById.bind(s),
    list: s.list.bind(s),
    getReadiness: s.getReadiness.bind(s),
    create: async (ctx, input) => {
      const r = await s.create(ctx, input);
      if (r.ok) emit(audit, ctx, "case.created", "case", r.data.id, r.data.id);
      return r;
    },
    update: async (ctx, cid, input) => {
      const r = await s.update(ctx, cid, input);
      if (r.ok) emit(audit, ctx, "case.updated", "case", r.data.id, r.data.id);
      return r;
    },
    changeStatus: async (ctx, input) => {
      const r = await s.changeStatus(ctx, input);
      if (r.ok) emit(audit, ctx, "case.updated", "case", r.data.id, r.data.id);
      return r;
    },
    archive: async (ctx, cid, ev) => {
      const r = await s.archive(ctx, cid, ev);
      if (r.ok) emit(audit, ctx, "case.updated", "case", r.data.id, r.data.id);
      return r;
    },
  };
}

function wrapCasePersonService(
  s: CasePersonService,
  audit: InternalAuditAppender,
): CasePersonService {
  return {
    getById: s.getById.bind(s),
    listByCase: s.listByCase.bind(s),
    create: async (ctx, input) => {
      const r = await s.create(ctx, input);
      if (r.ok) {
        const cp: CasePerson = r.data;
        emit(audit, ctx, "casePerson.created", "casePerson", cp.id, cp.caseId);
      }
      return r;
    },
    update: async (ctx, cid, input) => {
      const r = await s.update(ctx, cid, input);
      if (r.ok) {
        const cp: CasePerson = r.data;
        emit(audit, ctx, "casePerson.updated", "casePerson", cp.id, cp.caseId);
      }
      return r;
    },
    remove: async (ctx, cid, cpid, ev) => {
      const r = await s.remove(ctx, cid, cpid, ev);
      if (r.ok) {
        const cp: CasePerson = r.data;
        emit(audit, ctx, "casePerson.removed", "casePerson", cp.id, cp.caseId);
      }
      return r;
    },
  };
}

function wrapRelationshipService(
  s: RelationshipService,
  audit: InternalAuditAppender,
): RelationshipService {
  return {
    getById: s.getById.bind(s),
    listByCase: s.listByCase.bind(s),
    create: async (ctx, input) => {
      const r = await s.create(ctx, input);
      if (r.ok) {
        const rel: Relationship = r.data;
        emit(audit, ctx, "relationship.created", "relationship", rel.id, rel.caseId);
      }
      return r;
    },
    update: async (ctx, cid, input) => {
      const r = await s.update(ctx, cid, input);
      if (r.ok) {
        const rel: Relationship = r.data;
        emit(audit, ctx, "relationship.updated", "relationship", rel.id, rel.caseId);
      }
      return r;
    },
    remove: async (ctx, cid, rid, ev) => {
      const r = await s.remove(ctx, cid, rid, ev);
      if (r.ok) {
        const rel: Relationship = r.data;
        emit(audit, ctx, "relationship.removed", "relationship", rel.id, rel.caseId);
      }
      return r;
    },
  };
}

function wrapAssignmentService(
  s: AssignmentService,
  audit: InternalAuditAppender,
): AssignmentService {
  return {
    getById: s.getById.bind(s),
    listByCase: s.listByCase.bind(s),
    create: async (ctx, input) => {
      const r = await s.create(ctx, input);
      if (r.ok) {
        const a: Assignment = r.data;
        emit(audit, ctx, "assignment.created", "assignment", a.id, a.caseId);
      }
      return r;
    },
    update: async (ctx, cid, input) => {
      const r = await s.update(ctx, cid, input);
      if (r.ok) {
        const a: Assignment = r.data;
        emit(audit, ctx, "assignment.updated", "assignment", a.id, a.caseId);
      }
      return r;
    },
    changeStatus: async (ctx, cid, input) => {
      const r = await s.changeStatus(ctx, cid, input);
      if (r.ok) {
        const a: Assignment = r.data;
        emit(audit, ctx, "assignment.updated", "assignment", a.id, a.caseId);
      }
      return r;
    },
  };
}

function wrapCasePlanService(
  s: CasePlanService,
  audit: InternalAuditAppender,
): CasePlanService {
  return {
    getById: s.getById.bind(s),
    listByCase: s.listByCase.bind(s),
    create: async (ctx, input) => {
      const r = await s.create(ctx, input);
      if (r.ok) {
        const p: CasePlanItem = r.data;
        emit(audit, ctx, "casePlanItem.created", "casePlanItem", p.id, p.caseId);
      }
      return r;
    },
    update: async (ctx, cid, input) => {
      const r = await s.update(ctx, cid, input);
      if (r.ok) {
        const p: CasePlanItem = r.data;
        emit(audit, ctx, "casePlanItem.updated", "casePlanItem", p.id, p.caseId);
      }
      return r;
    },
    changeStatus: async (ctx, cid, input) => {
      const r = await s.changeStatus(ctx, cid, input);
      if (r.ok) {
        const p: CasePlanItem = r.data;
        emit(audit, ctx, "casePlanItem.statusChanged", "casePlanItem", p.id, p.caseId);
      }
      return r;
    },
    remove: async (ctx, cid, pid, ev): Promise<ServiceResult<void>> => {
      const r = await s.remove(ctx, cid, pid, ev);
      if (r.ok) {
        emit(audit, ctx, "casePlanItem.removed", "casePlanItem", pid, cid);
      }
      return r;
    },
  };
}

function wrapCaseTimelineService(
  s: CaseTimelineService,
  audit: InternalAuditAppender,
): CaseTimelineService {
  return {
    getById: s.getById.bind(s),
    listByCase: s.listByCase.bind(s),
    create: async (ctx, input) => {
      const r = await s.create(ctx, input);
      if (r.ok) {
        const t: CaseTimelineEntry = r.data;
        emit(audit, ctx, "caseTimelineEntry.created", "caseTimelineEntry", t.id, t.caseId);
      }
      return r;
    },
    update: async (ctx, cid, input) => {
      const r = await s.update(ctx, cid, input);
      if (r.ok) {
        const t: CaseTimelineEntry = r.data;
        emit(audit, ctx, "caseTimelineEntry.updated", "caseTimelineEntry", t.id, t.caseId);
      }
      return r;
    },
    remove: async (ctx, cid, tid, ev): Promise<ServiceResult<void>> => {
      const r = await s.remove(ctx, cid, tid, ev);
      if (r.ok) {
        emit(audit, ctx, "caseTimelineEntry.removed", "caseTimelineEntry", tid, cid);
      }
      return r;
    },
  };
}

// Suppress unused import warning; Case referenced only as type in future.
type _KeepCase = Case;

export function createMockDomainEnvironment(
  options?: MockDomainOptions,
): MockDomainEnvironment {
  if (options !== undefined) {
    if (
      typeof options !== "object" ||
      options === null ||
      Array.isArray(options)
    ) {
      throw new Error("createMockDomainEnvironment: options must be an object");
    }
    if (containsForbiddenKey(options)) {
      throw new Error("createMockDomainEnvironment: forbidden key in options");
    }
    if (!hasOnlyAllowedKeys(options, MOCK_DOMAIN_OPTIONS_ALLOWED_KEYS)) {
      throw new Error("createMockDomainEnvironment: unknown option key");
    }
    if (
      options.baseEpochMs !== undefined &&
      (!Number.isFinite(options.baseEpochMs) ||
        !Number.isInteger(options.baseEpochMs))
    ) {
      throw new Error("createMockDomainEnvironment: baseEpochMs must be an integer");
    }
    if (
      options.tickMs !== undefined &&
      (!Number.isFinite(options.tickMs) ||
        !Number.isInteger(options.tickMs) ||
        options.tickMs <= 0)
    ) {
      throw new Error("createMockDomainEnvironment: tickMs must be a positive integer");
    }
  }
  const baseEpochMs = options?.baseEpochMs ?? MOCK_BASE_EPOCH_MS;
  const tickMs = options?.tickMs ?? MOCK_TICK_MS;
  const store = createEmptyStore();
  const clock = createMockClock(baseEpochMs, tickMs);
  const ids = createMockIdGenerator();
  loadSeed(store);

  const audit = createAuditAppender(store, clock, ids);

  const services: MockDomainServices = Object.freeze({
    organization: guardOrganizationService(
      store,
      createOrganizationServiceMock(store, clock),
    ),
    currentUser: createCurrentUserServiceMock(store),
    memberships: guardMembershipService(
      store,
      createMembershipServiceMock(store, clock, ids),
    ),
    professionalProfiles: guardProfessionalProfileService(
      store,
      createProfessionalProfileServiceMock(store, clock, ids),
    ),
    credentials: guardCredentialService(
      store,
      createCredentialServiceMock(store, clock, ids),
    ),
    cases: guardCaseService(
      store,
      wrapCaseService(createCaseServiceMock(store, clock, ids), audit),
    ),
    persons: guardPersonService(
      store,
      createPersonServiceMock(store, clock, ids),
    ),
    casePersons: guardCasePersonService(
      store,
      wrapCasePersonService(
        createCasePersonServiceMock(store, clock, ids),
        audit,
      ),
    ),
    relationships: guardRelationshipService(
      store,
      wrapRelationshipService(
        createRelationshipServiceMock(store, clock, ids),
        audit,
      ),
    ),
    assignments: guardAssignmentService(
      store,
      wrapAssignmentService(
        createAssignmentServiceMock(store, clock, ids),
        audit,
      ),
    ),
    casePlan: guardCasePlanService(
      store,
      wrapCasePlanService(
        createCasePlanServiceMock(store, clock, ids),
        audit,
      ),
    ),
    caseTimeline: guardCaseTimelineService(
      store,
      wrapCaseTimelineService(
        createCaseTimelineServiceMock(store, clock, ids),
        audit,
      ),
    ),
    permissions: createPermissionPolicyMock(store),
    auditEvents: guardAuditEventService(
      store,
      createAuditEventServiceMock(store),
    ),
    caseSnapshots: guardCaseSnapshotService(
      store,
      createCaseSnapshotServiceMock(store, clock, ids, audit),
    ),
    deadlines: guardDeadlineService(
      store,
      createDeadlineServiceMock(store, clock, ids),
    ),
    appointments: guardAppointmentService(
      store,
      createAppointmentServiceMock(store, clock, ids),
    ),
  });

  return Object.freeze({
    services,
    snapshot: () => snapshot(store),
  });
}
