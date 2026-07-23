/**
 * Guardas de permissão aplicadas aos serviços mock. Cada método é
 * embrulhado para exigir a permissão correspondente ANTES de qualquer
 * efeito colateral. A ordem final é: contexto → permissão → o serviço
 * interno re-valida contexto/recurso/input/conflito e só então comita.
 *
 * `currentUser.getCurrent` não recebe guarda porque o catálogo oficial
 * não possui uma ação `currentUser.read`. Ele continua exigindo contexto
 * válido através do serviço interno.
 */

import type { PermissionAction, PermissionRequest } from "../services/permissions";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { MockStore } from "./store";
import { requirePermission } from "./permission-validation";
import type { OrganizationService } from "../services/organization-service";
import type { MembershipService } from "../services/membership-service";
import type {
  ProfessionalProfileService,
  CredentialService,
} from "../services/professional-service";
import type { CaseService } from "../services/case-service";
import type {
  PersonService,
  CasePersonService,
  RelationshipService,
} from "../services/person-service";
import type { AssignmentService } from "../services/assignment-service";
import type { CasePlanService } from "../services/case-plan-service";
import type { CaseTimelineService } from "../services/case-timeline-service";
import { isCaseId, type CaseId } from "../core/ids";

async function enforce<T>(
  store: MockStore,
  context: ServiceContext,
  action: PermissionAction,
  delegate: () => Promise<ServiceResult<T>>,
): Promise<ServiceResult<T>> {
  const req: PermissionRequest = { action };
  const r = requirePermission(store, context, req);
  if (!r.ok) return { ok: false, error: r.error };
  return delegate();
}

function extractCaseId(input: unknown): CaseId | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const caseId = (input as Record<string, unknown>).caseId;

  return isCaseId(caseId) ? caseId : null;
}

async function enforceWithCase<T>(
  store: MockStore,
  context: ServiceContext,
  action: PermissionAction,
  caseId: CaseId,
  delegate: () => Promise<ServiceResult<T>>,
): Promise<ServiceResult<T>> {
  const req: PermissionRequest = { action, caseId };
  const r = requirePermission(store, context, req);
  if (!r.ok) return { ok: false, error: r.error };
  return delegate();
}

async function enforceFromInputCase<T>(
  store: MockStore,
  context: ServiceContext,
  action: PermissionAction,
  input: unknown,
  delegate: () => Promise<ServiceResult<T>>,
): Promise<ServiceResult<T>> {
  const caseId = extractCaseId(input);

  if (caseId !== null) {
    return enforceWithCase(store, context, action, caseId, delegate);
  }

  return enforce(store, context, action, delegate);
}


export function guardOrganizationService(
  store: MockStore,
  s: OrganizationService,
): OrganizationService {
  return {
    getCurrent: (ctx) =>
      enforce(store, ctx, "organization.read", () => s.getCurrent(ctx)),
    update: (ctx, input) =>
      enforce(store, ctx, "organization.update", () => s.update(ctx, input)),
  };
}

export function guardMembershipService(
  store: MockStore,
  s: MembershipService,
): MembershipService {
  return {
    getById: (ctx, id) =>
      enforce(store, ctx, "membership.read", () => s.getById(ctx, id)),
    list: (ctx, req) =>
      enforce(store, ctx, "membership.list", () => s.list(ctx, req)),
    create: (ctx, input) =>
      enforce(store, ctx, "membership.create", () => s.create(ctx, input)),
    changeRole: (ctx, input) =>
      enforce(store, ctx, "membership.update", () => s.changeRole(ctx, input)),
    changeStatus: (ctx, input) =>
      enforce(store, ctx, "membership.update", () =>
        s.changeStatus(ctx, input),
      ),
    revoke: (ctx, input) =>
      enforce(store, ctx, "membership.revoke", () => s.revoke(ctx, input)),
  };
}

export function guardProfessionalProfileService(
  store: MockStore,
  s: ProfessionalProfileService,
): ProfessionalProfileService {
  return {
    getById: (ctx, id) =>
      enforce(store, ctx, "professionalProfile.read", () =>
        s.getById(ctx, id),
      ),
    list: (ctx, req) =>
      enforce(store, ctx, "professionalProfile.list", () => s.list(ctx, req)),
    create: (ctx, input) =>
      enforce(store, ctx, "professionalProfile.create", () =>
        s.create(ctx, input),
      ),
    update: (ctx, id, input) =>
      enforce(store, ctx, "professionalProfile.update", () =>
        s.update(ctx, id, input),
      ),
    changeStatus: (ctx, input) =>
      enforce(store, ctx, "professionalProfile.update", () =>
        s.changeStatus(ctx, input),
      ),
  };
}

export function guardCredentialService(
  store: MockStore,
  s: CredentialService,
): CredentialService {
  return {
    getById: (ctx, id) =>
      enforce(store, ctx, "credential.read", () => s.getById(ctx, id)),
    listByProfessionalProfile: (ctx, id, page) =>
      enforce(store, ctx, "credential.list", () =>
        s.listByProfessionalProfile(ctx, id, page),
      ),
    create: (ctx, input) =>
      enforce(store, ctx, "credential.create", () => s.create(ctx, input)),
    updateStatus: (ctx, input) =>
      enforce(store, ctx, "credential.update", () =>
        s.updateStatus(ctx, input),
      ),
  };
}

export function guardCaseService(
  store: MockStore,
  s: CaseService,
): CaseService {
  return {
    getById: (ctx, id) =>
      enforce(store, ctx, "case.read", () => s.getById(ctx, id)),
    list: (ctx, req) => enforce(store, ctx, "case.list", () => s.list(ctx, req)),
    create: (ctx, input) =>
      enforce(store, ctx, "case.create", () => s.create(ctx, input)),
    update: (ctx, id, input) =>
      enforce(store, ctx, "case.update", () => s.update(ctx, id, input)),
    changeStatus: (ctx, input) =>
      enforce(store, ctx, "case.changeStatus", () =>
        s.changeStatus(ctx, input),
      ),
    archive: (ctx, id, v) =>
      enforce(store, ctx, "case.archive", () => s.archive(ctx, id, v)),
    getReadiness: (ctx, id) =>
      enforce(store, ctx, "case.read", () => s.getReadiness(ctx, id)),
  };
}

export function guardPersonService(
  store: MockStore,
  s: PersonService,
): PersonService {
  return {
    getById: (ctx, id) =>
      enforce(store, ctx, "person.read", () => s.getById(ctx, id)),
    list: (ctx, req) =>
      enforce(store, ctx, "person.list", () => s.list(ctx, req)),
    create: (ctx, input) =>
      enforce(store, ctx, "person.create", () => s.create(ctx, input)),
    update: (ctx, id, input) =>
      enforce(store, ctx, "person.update", () => s.update(ctx, id, input)),
  };
}

export function guardCasePersonService(
  store: MockStore,
  s: CasePersonService,
): CasePersonService {
  return {
    getById: (ctx, cid, id) =>
      enforce(store, ctx, "casePerson.read", () => s.getById(ctx, cid, id)),
    listByCase: (ctx, cid, page) =>
      enforce(store, ctx, "casePerson.list", () =>
        s.listByCase(ctx, cid, page),
      ),
    create: (ctx, input) =>
      enforce(store, ctx, "casePerson.create", () => s.create(ctx, input)),
    update: (ctx, cid, input) =>
      enforce(store, ctx, "casePerson.update", () => s.update(ctx, cid, input)),
    remove: (ctx, cid, id, v) =>
      enforce(store, ctx, "casePerson.remove", () =>
        s.remove(ctx, cid, id, v),
      ),
  };
}

export function guardRelationshipService(
  store: MockStore,
  s: RelationshipService,
): RelationshipService {
  return {
    getById: (ctx, cid, id) =>
      enforce(store, ctx, "relationship.read", () => s.getById(ctx, cid, id)),
    listByCase: (ctx, cid, page) =>
      enforce(store, ctx, "relationship.list", () =>
        s.listByCase(ctx, cid, page),
      ),
    create: (ctx, input) =>
      enforce(store, ctx, "relationship.create", () => s.create(ctx, input)),
    update: (ctx, cid, input) =>
      enforce(store, ctx, "relationship.update", () =>
        s.update(ctx, cid, input),
      ),
    remove: (ctx, cid, id, v) =>
      enforce(store, ctx, "relationship.remove", () =>
        s.remove(ctx, cid, id, v),
      ),
  };
}

export function guardAssignmentService(
  store: MockStore,
  s: AssignmentService,
): AssignmentService {
  return {
    getById: (ctx, cid, id) =>
      enforce(store, ctx, "assignment.read", () => s.getById(ctx, cid, id)),
    listByCase: (ctx, cid, page) =>
      enforce(store, ctx, "assignment.list", () =>
        s.listByCase(ctx, cid, page),
      ),
    create: (ctx, input) =>
      enforce(store, ctx, "assignment.create", () => s.create(ctx, input)),
    update: (ctx, cid, input) =>
      enforce(store, ctx, "assignment.update", () =>
        s.update(ctx, cid, input),
      ),
    changeStatus: (ctx, cid, input) =>
      enforce(store, ctx, "assignment.changeStatus", () =>
        s.changeStatus(ctx, cid, input),
      ),
  };
}

export function guardCasePlanService(
  store: MockStore,
  s: CasePlanService,
): CasePlanService {
  return {
    getById: (ctx, cid, id) =>
      enforceWithCase(store, ctx, "casePlanItem.read", cid, () =>
        s.getById(ctx, cid, id),
      ),
    listByCase: (ctx, cid, page) =>
      enforceWithCase(store, ctx, "casePlanItem.list", cid, () =>
        s.listByCase(ctx, cid, page),
      ),
    create: (ctx, input) =>
      enforceFromInputCase(store, ctx, "casePlanItem.create", input, () =>
        s.create(ctx, input),
      ),
    update: (ctx, cid, input) =>
      enforceWithCase(store, ctx, "casePlanItem.update", cid, () =>
        s.update(ctx, cid, input),
      ),
    changeStatus: (ctx, cid, input) =>
      enforceWithCase(store, ctx, "casePlanItem.changeStatus", cid, () =>
        s.changeStatus(ctx, cid, input),
      ),
    remove: (ctx, cid, id, v) =>
      enforceWithCase(store, ctx, "casePlanItem.remove", cid, () =>
        s.remove(ctx, cid, id, v),
      ),
  };
}

export function guardCaseTimelineService(
  store: MockStore,
  s: CaseTimelineService,
): CaseTimelineService {
  return {
    getById: (ctx, cid, id) =>
      enforceWithCase(store, ctx, "caseTimelineEntry.read", cid, () =>
        s.getById(ctx, cid, id),
      ),
    listByCase: (ctx, cid, page) =>
      enforceWithCase(store, ctx, "caseTimelineEntry.list", cid, () =>
        s.listByCase(ctx, cid, page),
      ),
    create: (ctx, input) =>
      enforceFromInputCase(store, ctx, "caseTimelineEntry.create", input, () =>
        s.create(ctx, input),
      ),
    update: (ctx, cid, input) =>
      enforceWithCase(store, ctx, "caseTimelineEntry.update", cid, () =>
        s.update(ctx, cid, input),
      ),
    remove: (ctx, cid, id, v) =>
      enforceWithCase(store, ctx, "caseTimelineEntry.remove", cid, () =>
        s.remove(ctx, cid, id, v),
      ),
  };
}
