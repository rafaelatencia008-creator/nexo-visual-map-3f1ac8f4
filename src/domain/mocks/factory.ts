/**
 * Fábrica pública dos mocks de domínio — LV-07.3.
 *
 * Cada chamada devolve um ambiente totalmente isolado. Nenhuma instância
 * global é criada aqui. O store, o relógio e o gerador de IDs ficam
 * fechados por closure e não são acessíveis do lado de fora.
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
import {
  MOCK_DOMAIN_OPTIONS_ALLOWED_KEYS,
  type MockDomainEnvironment,
  type MockDomainOptions,
  type MockDomainServices,
  type MockDomainSnapshot,
} from "./types";
import { hasOnlyAllowedKeys, containsForbiddenKey } from "../core/common";

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
  }) as MockDomainSnapshot;
}

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

  const services: MockDomainServices = Object.freeze({
    organization: createOrganizationServiceMock(store, clock),
    currentUser: createCurrentUserServiceMock(store),
    memberships: createMembershipServiceMock(store, clock, ids),
    professionalProfiles: createProfessionalProfileServiceMock(store, clock, ids),
    credentials: createCredentialServiceMock(store, clock, ids),
    cases: createCaseServiceMock(store, clock, ids),
    persons: createPersonServiceMock(store, clock, ids),
    casePersons: createCasePersonServiceMock(store, clock, ids),
    relationships: createRelationshipServiceMock(store, clock, ids),
    assignments: createAssignmentServiceMock(store, clock, ids),
  });

  return Object.freeze({
    services,
    snapshot: () => snapshot(store),
  });
}
