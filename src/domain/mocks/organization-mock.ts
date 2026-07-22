/**
 * OrganizationService e CurrentUserService — implementação em memória.
 */

import type { Organization } from "../core/organization";
import type { User } from "../core/access";
import type {
  OrganizationService,
  CurrentUserService,
} from "../services/organization-service";
import type { UpdateOrganizationInput } from "../services/inputs";
import type { ServiceContext } from "../services/context";
import type { ServiceResult } from "../services/result";
import { validateOrganization } from "../core/validators";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import { requireContext } from "./context-validation";

export function createOrganizationServiceMock(
  store: MockStore,
  clock: MockClock,
): OrganizationService {
  return {
    async getCurrent(context: ServiceContext): Promise<ServiceResult<Organization>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      return { ok: true, data: deepClone(v.data.organization) };
    },
    async update(
      context: ServiceContext,
      input: UpdateOrganizationInput,
    ): Promise<ServiceResult<Organization>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const current = v.data.organization;
      if (input.expectedVersion !== current.metadata.version) {
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "organization_version_conflict",
            expectedVersion: input.expectedVersion,
            actualVersion: current.metadata.version,
          },
        };
      }
      const updatedAt = clock.next();
      const next: Organization = {
        ...current,
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        metadata: {
          createdAt: current.metadata.createdAt,
          updatedAt,
          version: current.metadata.version + 1,
        },
      };
      const check = validateOrganization(next);
      if (!check.ok) {
        return { ok: false, error: { code: "validation_error", message: check.reason } };
      }
      store.organizations.set(next.id, next);
      return { ok: true, data: deepClone(next) };
    },
  };
}

export function createCurrentUserServiceMock(store: MockStore): CurrentUserService {
  return {
    async getCurrent(context: ServiceContext): Promise<ServiceResult<User>> {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      return { ok: true, data: deepClone(v.data.user) };
    },
  };
}
