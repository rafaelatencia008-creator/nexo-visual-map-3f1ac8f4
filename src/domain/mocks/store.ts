/**
 * Estado mutável interno da camada de mocks. NÃO exportado pelo barrel.
 *
 * Cada `Map` preserva ordem de inserção; iterações produzem resultados
 * estáveis em execuções repetidas.
 */

import type { Organization } from "../core/organization";
import type { User, Membership } from "../core/access";
import type { ProfessionalProfile, Credential } from "../core/professional";
import type { Case } from "../core/case";
import type { Person } from "../core/person";
import type { CasePerson, Relationship, Assignment } from "../core/assignment";

export type MockStore = {
  organizations: Map<string, Organization>;
  users: Map<string, User>;
  memberships: Map<string, Membership>;
  professionalProfiles: Map<string, ProfessionalProfile>;
  credentials: Map<string, Credential>;
  cases: Map<string, Case>;
  persons: Map<string, Person>;
  casePersons: Map<string, CasePerson>;
  relationships: Map<string, Relationship>;
  assignments: Map<string, Assignment>;
};

export function createEmptyStore(): MockStore {
  return {
    organizations: new Map(),
    users: new Map(),
    memberships: new Map(),
    professionalProfiles: new Map(),
    credentials: new Map(),
    cases: new Map(),
    persons: new Map(),
    casePersons: new Map(),
    relationships: new Map(),
    assignments: new Map(),
  };
}
