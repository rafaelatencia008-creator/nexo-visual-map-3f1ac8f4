/**
 * LV-07.3.3 — Provas de tipo dos mocks estáveis (compile-only).
 *
 * Não executa em runtime. Verifica somente conformidade de tipos com
 * `satisfies` e `@ts-expect-error` verificáveis.
 */

import {
  createMockDomainEnvironment,
  type MockDomainEnvironment,
  type MockDomainOptions,
  type MockDomainServices,
  type MockDomainSnapshot,
} from "../src/domain/mocks";
import type { OrganizationService, CurrentUserService } from "../src/domain/services/organization-service";
import type { MembershipService } from "../src/domain/services/membership-service";
import type {
  ProfessionalProfileService,
  CredentialService,
} from "../src/domain/services/professional-service";
import type { CaseService } from "../src/domain/services/case-service";
import type {
  PersonService,
  CasePersonService,
  RelationshipService,
} from "../src/domain/services/person-service";
import type { AssignmentService } from "../src/domain/services/assignment-service";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceResult } from "../src/domain/services/result";
import type { Case } from "../src/domain/core/case";
import type { CaseId, OrganizationId, UserId, MembershipId } from "../src/domain/core/ids";
import type { Role } from "../src/domain/shared/work-context";
import type { Organization } from "../src/domain/core/organization";
import type { User, Membership } from "../src/domain/core/access";
import type {
  ProfessionalProfile,
  Credential,
} from "../src/domain/core/professional";
import type { Person } from "../src/domain/core/person";
import type {
  CasePerson,
  Relationship,
  Assignment,
} from "../src/domain/core/assignment";

// --- Fixture de compilação (nunca executa) ---
const env: MockDomainEnvironment = createMockDomainEnvironment();
const snap: MockDomainSnapshot = env.snapshot();
const services: MockDomainServices = env.services;

// TT01 — ambiente é MockDomainEnvironment
type TT01 = typeof env extends MockDomainEnvironment ? true : false;
const tt01: TT01 = true;
void tt01;

// TT02..TT11 — cada serviço satisfaz seu contrato
const _org = services.organization satisfies OrganizationService;
const _cur = services.currentUser satisfies CurrentUserService;
const _mem = services.memberships satisfies MembershipService;
const _pro = services.professionalProfiles satisfies ProfessionalProfileService;
const _cre = services.credentials satisfies CredentialService;
const _cas = services.cases satisfies CaseService;
const _per = services.persons satisfies PersonService;
const _cp = services.casePersons satisfies CasePersonService;
const _rel = services.relationships satisfies RelationshipService;
const _asn = services.assignments satisfies AssignmentService;
void _org; void _cur; void _mem; void _pro; void _cre;
void _cas; void _per; void _cp; void _rel; void _asn;

// TT12 — snapshot NUNCA expõe Map
type CasesIsMap = MockDomainSnapshot["cases"] extends Map<unknown, unknown> ? true : false;
const tt12: CasesIsMap = false;
void tt12;

// TT13 — MockDomainEnvironment não expõe `store`, `clock`, `ids`, `reset`
// @ts-expect-error — env.store não existe
env.store;
// @ts-expect-error — env.clock não existe
env.clock;
// @ts-expect-error — env.ids não existe
env.ids;
// @ts-expect-error — env.reset não existe
env.reset;

// TT14 — MockDomainOptions rejeita chave desconhecida
const opts: MockDomainOptions = { baseEpochMs: 0, tickMs: 1000 };
void opts;
// @ts-expect-error — chave 'seed' não faz parte das opções
const badOpts: MockDomainOptions = { seed: true };
void badOpts;

// TT15 — Todos os métodos exigem ServiceContext (não string, não objeto solto)
const ctx: ServiceContext = {
  organizationId: "org_x" as OrganizationId,
  userId: "usr_x" as UserId,
  membershipId: "mem_x" as MembershipId,
  role: "proprietario" as Role,
};
services.cases.getById(ctx, "case_x" as CaseId);
// @ts-expect-error — string não é ServiceContext
services.cases.getById("not_a_context", "case_x" as CaseId);
// @ts-expect-error — objeto solto sem os campos obrigatórios
services.cases.getById({}, "case_x" as CaseId);

// TT16 — Branded IDs continuam obrigatórios (string bruta é recusada)
// @ts-expect-error — string bruta não é CaseId
services.cases.getById(ctx, "case_x");

// TT17 — DTO de criação de caso NÃO aceita `organizationId`, `id`, `metadata`
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
});
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
  // @ts-expect-error — DTO não aceita organizationId
  organizationId: "org_y" as OrganizationId,
});
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
  // @ts-expect-error — DTO não aceita id
  id: "case_z" as CaseId,
});
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
  // @ts-expect-error — DTO não aceita metadata
  metadata: {},
});

// TT18 — Métodos retornam Promise<ServiceResult<T>>
type CaseReturn = ReturnType<typeof services.cases.getById>;
type CaseIsPromise = CaseReturn extends Promise<ServiceResult<Case>> ? true : false;
const tt18: CaseIsPromise = true;
void tt18;

// TT19 — createMockDomainEnvironment aceita zero argumentos e retorna
// exatamente MockDomainEnvironment (não uma união mais ampla)
type CreateReturn = ReturnType<typeof createMockDomainEnvironment>;
type CreateOk = CreateReturn extends MockDomainEnvironment
  ? MockDomainEnvironment extends CreateReturn
    ? true
    : false
  : false;
const tt19: CreateOk = true;
void tt19;

// ---------------------------------------------------------------------------
// TT20 — Readonly comprovado nos dez arrays do snapshot
// ---------------------------------------------------------------------------

type IsReadonlyArray<T> =
  T extends unknown[]
    ? false
    : T extends readonly unknown[]
      ? true
      : false;

type OrganizationsReadonly = IsReadonlyArray<MockDomainSnapshot["organizations"]>;
type UsersReadonly = IsReadonlyArray<MockDomainSnapshot["users"]>;
type MembershipsReadonly = IsReadonlyArray<MockDomainSnapshot["memberships"]>;
type ProfessionalProfilesReadonly =
  IsReadonlyArray<MockDomainSnapshot["professionalProfiles"]>;
type CredentialsReadonly = IsReadonlyArray<MockDomainSnapshot["credentials"]>;
type CasesReadonly = IsReadonlyArray<MockDomainSnapshot["cases"]>;
type PersonsReadonly = IsReadonlyArray<MockDomainSnapshot["persons"]>;
type CasePersonsReadonly = IsReadonlyArray<MockDomainSnapshot["casePersons"]>;
type RelationshipsReadonly = IsReadonlyArray<MockDomainSnapshot["relationships"]>;
type AssignmentsReadonly = IsReadonlyArray<MockDomainSnapshot["assignments"]>;

const organizationsReadonly: OrganizationsReadonly = true;
const usersReadonly: UsersReadonly = true;
const membershipsReadonly: MembershipsReadonly = true;
const professionalProfilesReadonly: ProfessionalProfilesReadonly = true;
const credentialsReadonly: CredentialsReadonly = true;
const casesReadonly: CasesReadonly = true;
const personsReadonly: PersonsReadonly = true;
const casePersonsReadonly: CasePersonsReadonly = true;
const relationshipsReadonly: RelationshipsReadonly = true;
const assignmentsReadonly: AssignmentsReadonly = true;
void organizationsReadonly;
void usersReadonly;
void membershipsReadonly;
void professionalProfilesReadonly;
void credentialsReadonly;
void casesReadonly;
void personsReadonly;
void casePersonsReadonly;
void relationshipsReadonly;
void assignmentsReadonly;

// TT21 — Provas negativas reais: (1) atribuição de propriedade,
// (2) `.push`, (3) atribuição indexada, (4) conversão para array mutável.

// --- organizations
// @ts-expect-error — reassign de propriedade readonly
snap.organizations = [] as unknown as MockDomainSnapshot["organizations"];
// @ts-expect-error — .push não existe em readonly array
snap.organizations.push({} as Organization);
// @ts-expect-error — atribuição indexada rejeitada
snap.organizations[0] = {} as Organization;
// @ts-expect-error — não é atribuível a Array mutável
const _mutOrgs: Organization[] = snap.organizations;
void _mutOrgs;

// --- users
// @ts-expect-error
snap.users = [] as unknown as MockDomainSnapshot["users"];
// @ts-expect-error
snap.users.push({} as User);
// @ts-expect-error
snap.users[0] = {} as User;
// @ts-expect-error
const _mutUsers: User[] = snap.users;
void _mutUsers;

// --- memberships
// @ts-expect-error
snap.memberships = [] as unknown as MockDomainSnapshot["memberships"];
// @ts-expect-error
snap.memberships.push({} as Membership);
// @ts-expect-error
snap.memberships[0] = {} as Membership;
// @ts-expect-error
const _mutMems: Membership[] = snap.memberships;
void _mutMems;

// --- professionalProfiles
// @ts-expect-error
snap.professionalProfiles = [] as unknown as MockDomainSnapshot["professionalProfiles"];
// @ts-expect-error
snap.professionalProfiles.push({} as ProfessionalProfile);
// @ts-expect-error
snap.professionalProfiles[0] = {} as ProfessionalProfile;
// @ts-expect-error
const _mutProfs: ProfessionalProfile[] = snap.professionalProfiles;
void _mutProfs;

// --- credentials
// @ts-expect-error
snap.credentials = [] as unknown as MockDomainSnapshot["credentials"];
// @ts-expect-error
snap.credentials.push({} as Credential);
// @ts-expect-error
snap.credentials[0] = {} as Credential;
// @ts-expect-error
const _mutCreds: Credential[] = snap.credentials;
void _mutCreds;

// --- cases
// @ts-expect-error
snap.cases = [] as unknown as MockDomainSnapshot["cases"];
// @ts-expect-error
snap.cases.push({} as Case);
// @ts-expect-error
snap.cases[0] = {} as Case;
// @ts-expect-error
const _mutCases: Case[] = snap.cases;
void _mutCases;

// --- persons
// @ts-expect-error
snap.persons = [] as unknown as MockDomainSnapshot["persons"];
// @ts-expect-error
snap.persons.push({} as Person);
// @ts-expect-error
snap.persons[0] = {} as Person;
// @ts-expect-error
const _mutPersons: Person[] = snap.persons;
void _mutPersons;

// --- casePersons
// @ts-expect-error
snap.casePersons = [] as unknown as MockDomainSnapshot["casePersons"];
// @ts-expect-error
snap.casePersons.push({} as CasePerson);
// @ts-expect-error
snap.casePersons[0] = {} as CasePerson;
// @ts-expect-error
const _mutCP: CasePerson[] = snap.casePersons;
void _mutCP;

// --- relationships
// @ts-expect-error
snap.relationships = [] as unknown as MockDomainSnapshot["relationships"];
// @ts-expect-error
snap.relationships.push({} as Relationship);
// @ts-expect-error
snap.relationships[0] = {} as Relationship;
// @ts-expect-error
const _mutRels: Relationship[] = snap.relationships;
void _mutRels;

// --- assignments
// @ts-expect-error
snap.assignments = [] as unknown as MockDomainSnapshot["assignments"];
// @ts-expect-error
snap.assignments.push({} as Assignment);
// @ts-expect-error
snap.assignments[0] = {} as Assignment;
// @ts-expect-error
const _mutAsn: Assignment[] = snap.assignments;
void _mutAsn;
