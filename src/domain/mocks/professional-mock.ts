/**
 * ProfessionalProfileService + CredentialService — implementação em memória.
 */

import type { Credential, ProfessionalProfile } from "../core/professional";
import type {
  CredentialService,
  ProfessionalProfileService,
  ProfessionalListRequest,
  ChangeProfessionalStatusInput,
} from "../services/professional-service";
import type {
  CreateCredentialInput,
  CreateProfessionalProfileInput,
  UpdateCredentialStatusInput,
  UpdateProfessionalProfileInput,
} from "../services/inputs";
import type { ProfessionalProfileId } from "../core/ids";
import type { PageRequest, PageResult } from "../services/pagination";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import {
  validateCredential,
  validateProfessionalProfile,
} from "../core/validators";
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

export function createProfessionalProfileServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): ProfessionalProfileService {
  return {
    async getById(context, id) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const p = store.professionalProfiles.get(id);
      if (!p || p.organizationId !== v.data.context.organizationId) {
        return notFound<ProfessionalProfile>();
      }
      return { ok: true, data: deepClone(p) };
    },
    async list(
      context: ServiceContext,
      request: ProfessionalListRequest,
    ): Promise<ServiceResult<PageResult<ProfessionalProfile>>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      let items = Array.from(store.professionalProfiles.values()).filter(
        (p) => p.organizationId === orgId,
      );
      const f = request.filter;
      if (f?.areas && f.areas.length > 0) {
        items = items.filter((p) => f.areas!.includes(p.area));
      }
      if (f?.statuses && f.statuses.length > 0) {
        items = items.filter((p) => f.statuses!.includes(p.status));
      }
      const dir = request.sortDir ?? "asc";
      const field = request.sortBy ?? "createdAt";
      const pick =
        field === "area"
          ? (p: ProfessionalProfile) => p.area
          : field === "status"
            ? (p: ProfessionalProfile) => p.status
            : (p: ProfessionalProfile) => p.metadata.createdAt;
      items = sortStable(items, pick, dir);
      return paginateItems(items, request.page);
    },
    async create(context, input: CreateProfessionalProfileInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      if (!store.users.has(input.userId)) {
        return { ok: false, error: { code: "not_found", message: "user_not_found" } };
      }
      for (const p of store.professionalProfiles.values()) {
        if (p.organizationId === orgId && p.userId === input.userId && p.area === input.area) {
          return {
            ok: false,
            error: { code: "conflict", message: "duplicate_professional_profile" },
          };
        }
      }
      const now = clock.next();
      const next: ProfessionalProfile = {
        id: ids.next("professionalProfile"),
        organizationId: orgId,
        userId: input.userId,
        area: input.area,
        status: "active",
        metadata: { createdAt: now, updatedAt: now, version: 1 },
      };
      const check = validateProfessionalProfile(next);
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      store.professionalProfiles.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async update(
      context: ServiceContext,
      id: ProfessionalProfileId,
      input: UpdateProfessionalProfileInput,
    ) {
      return applyProfileMutation(store, clock, context, id, input.expectedVersion, (p) => ({
        ...p,
        ...(input.area !== undefined ? { area: input.area } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      }));
    },
    async changeStatus(context, input: ChangeProfessionalStatusInput) {
      return applyProfileMutation(
        store,
        clock,
        context,
        input.professionalProfileId,
        input.expectedVersion,
        (p) => ({ ...p, status: input.status }),
      );
    },
  };
}

function applyProfileMutation(
  store: MockStore,
  clock: MockClock,
  context: ServiceContext,
  id: ProfessionalProfileId,
  expectedVersion: number,
  mutate: (p: ProfessionalProfile) => ProfessionalProfile,
): ServiceResult<ProfessionalProfile> {
  const v = requireContext(store, context);
  if (!v.ok) return v;
  const current = store.professionalProfiles.get(id);
  if (!current || current.organizationId !== v.data.context.organizationId) {
    return notFound<ProfessionalProfile>();
  }
  if (expectedVersion !== current.metadata.version) {
    return {
      ok: false,
      error: {
        code: "conflict",
        message: "professional_profile_version_conflict",
        expectedVersion,
        actualVersion: current.metadata.version,
      },
    };
  }
  const updatedAt = clock.next();
  const mutated = mutate(current);
  const next: ProfessionalProfile = {
    ...mutated,
    metadata: {
      createdAt: current.metadata.createdAt,
      updatedAt,
      version: current.metadata.version + 1,
    },
  };
  const check = validateProfessionalProfile(next);
  if (!check.ok) {
    return { ok: false, error: { code: "validation_error", message: check.reason } };
  }
  store.professionalProfiles.set(next.id, next);
  return { ok: true, data: deepClone(next) };
}

export function createCredentialServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): CredentialService {
  return {
    async getById(context, id) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const c = store.credentials.get(id);
      if (!c || c.organizationId !== v.data.context.organizationId) {
        return notFound<Credential>();
      }
      return { ok: true, data: deepClone(c) };
    },
    async listByProfessionalProfile(
      context: ServiceContext,
      professionalProfileId: ProfessionalProfileId,
      page: PageRequest,
    ) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const prof = store.professionalProfiles.get(professionalProfileId);
      if (!prof || prof.organizationId !== orgId) {
        return notFound<PageResult<Credential>>();
      }
      const items = sortStable(
        Array.from(store.credentials.values()).filter(
          (c) =>
            c.organizationId === orgId &&
            c.professionalProfileId === professionalProfileId,
        ),
        (c) => c.metadata.createdAt,
        "asc",
      );
      return paginateItems(items, page);
    },
    async create(context, input: CreateCredentialInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const orgId = v.data.context.organizationId;
      const prof = store.professionalProfiles.get(input.professionalProfileId);
      if (!prof || prof.organizationId !== orgId) {
        return notFound<Credential>();
      }
      const now = clock.next();
      const next: Credential = {
        id: ids.next("credential"),
        organizationId: orgId,
        professionalProfileId: input.professionalProfileId,
        status: "not_informed",
        metadata: { createdAt: now, updatedAt: now, version: 1 },
      };
      const check = validateCredential(next, {
        professionalProfiles: Array.from(store.professionalProfiles.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      store.credentials.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
    async updateStatus(context, input: UpdateCredentialStatusInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const current = store.credentials.get(input.credentialId);
      if (!current || current.organizationId !== v.data.context.organizationId) {
        return notFound<Credential>();
      }
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "credential_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      const updatedAt = clock.next();
      const next: Credential = {
        ...current,
        status: input.status,
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validateCredential(next, {
        professionalProfiles: Array.from(store.professionalProfiles.values()),
      });
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      store.credentials.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
  };
}
