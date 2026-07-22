/**
 * MembershipService — implementação em memória.
 */

import type { Membership } from "../core/access";
import type { MembershipId } from "../core/ids";
import {
  MEMBERSHIP_SORT_FIELDS,
  type MembershipService,
  type MembershipListRequest,
} from "../services/membership-service";
import type {
  ChangeMembershipRoleInput,
  ChangeMembershipStatusInput,
  CreateMembershipInput,
  RevokeMembershipInput,
} from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import type { PageResult } from "../services/pagination";
import { validateMembership } from "../core/validators";
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

export function createMembershipServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): MembershipService {
  return {
    async getById(context, membershipId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const m = store.memberships.get(membershipId);
      if (!m || m.organizationId !== v.data.context.organizationId) {
        return notFound<Membership>();
      }
      return { ok: true, data: deepClone(m) };
    },
    async list(
      context: ServiceContext,
      request: MembershipListRequest,
    ): Promise<ServiceResult<PageResult<Membership>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const sortCheck = validateSort(request.sortBy, request.sortDir, MEMBERSHIP_SORT_FIELDS);
      if (!sortCheck.ok) return sortCheck;
      const orgId = v.data.context.organizationId;
      let items = Array.from(store.memberships.values()).filter(
        (m) => m.organizationId === orgId,
      );
      const f = request.filter;
      if (f?.roles && f.roles.length > 0) {
        items = items.filter((m) => f.roles!.includes(m.role));
      }
      if (f?.statuses && f.statuses.length > 0) {
        items = items.filter((m) => f.statuses!.includes(m.status));
      }
      const dir = request.sortDir ?? "asc";
      const field = request.sortBy ?? "createdAt";
      const pick =
        field === "role"
          ? (m: Membership) => m.role
          : field === "status"
            ? (m: Membership) => m.status
            : (m: Membership) => m.metadata.createdAt;
      items = sortStable(items, pick, dir);
      return paginateItems(items, request.page);
    },
    async create(context, input: CreateMembershipInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      if (!store.users.has(input.userId)) {
        return { ok: false, error: { code: "not_found", message: "user_not_found" } };
      }
      for (const m of store.memberships.values()) {
        if (m.organizationId === orgId && m.userId === input.userId) {
          return {
            ok: false,
            error: { code: "conflict", message: "duplicate_membership" },
          };
        }
      }
      const id = ids.next("membership");
      const now = clock.next();
      const next: Membership = {
        id,
        organizationId: orgId,
        userId: input.userId,
        role: input.role,
        status: "active",
        metadata: { createdAt: now, updatedAt: now, version: 1 },
      };
      const check = validateMembership(next, {
        users: Array.from(store.users.values()),
        organizations: Array.from(store.organizations.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      store.memberships.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async changeRole(context, input: ChangeMembershipRoleInput) {
      return applyMembershipMutation(store, clock, context, input.membershipId, input.expectedVersion, (m) => ({
        ...m,
        role: input.role,
      }));
    },
    async changeStatus(context, input: ChangeMembershipStatusInput) {
      return applyMembershipMutation(store, clock, context, input.membershipId, input.expectedVersion, (m) => ({
        ...m,
        status: input.status,
      }));
    },
    async revoke(context, input: RevokeMembershipInput) {
      return applyMembershipMutation(store, clock, context, input.membershipId, input.expectedVersion, (m) => ({
        ...m,
        status: "revoked",
      }));
    },
  };
}

function applyMembershipMutation(
  store: MockStore,
  clock: MockClock,
  context: ServiceContext,
  membershipId: MembershipId,
  expectedVersion: number,
  mutate: (m: Membership) => Membership,
): ServiceResult<Membership> {
  const v = requireContext(store, context);
  if (!v.ok) return v;
  const current = store.memberships.get(membershipId);
  if (!current || current.organizationId !== v.data.context.organizationId) {
    return notFound<Membership>();
  }
  if (expectedVersion !== current.metadata.version) {
    return {
      ok: false,
      error: {
        code: "conflict",
        message: "membership_version_conflict",
        expectedVersion,
        actualVersion: current.metadata.version,
      },
    };
  }
  const mutated = mutate(current);
  const preview: Membership = {
    ...mutated,
    metadata: {
      createdAt: current.metadata.createdAt,
      updatedAt: current.metadata.updatedAt,
      version: current.metadata.version + 1,
    },
  };
  const check = validateMembership(preview, {
    users: Array.from(store.users.values()),
    organizations: Array.from(store.organizations.values()),
  });
  if (!check.ok) {
    return { ok: false, error: { code: "validation_error", message: check.reason } };
  }
  const next: Membership = {
    ...preview,
    metadata: {
      createdAt: current.metadata.createdAt,
      updatedAt: clock.next(),
      version: current.metadata.version + 1,
    },
  };
  store.memberships.set(next.id, next);
  return { ok: true, data: deepClone(next) };
}
