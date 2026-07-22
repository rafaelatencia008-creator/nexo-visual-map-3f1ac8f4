/**
 * LV-07.3.1 — Provas de tipo dos mocks estáveis.
 *
 * Não executa em runtime. Verifica somente conformidade de tipos.
 * Usa `satisfies` e `@ts-expect-error` verificáveis.
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

// TT12 — snapshot expõe arrays readonly (não Array/Map)
type CasesArrOk = MockDomainSnapshot["cases"] extends readonly Case[] ? true : false;
const tt12: CasesArrOk = true;
void tt12;

// TT13 — snapshot NUNCA expõe Map
type CasesIsMap = MockDomainSnapshot["cases"] extends Map<unknown, unknown> ? true : false;
const tt13: CasesIsMap = false;
void tt13;

// TT14 — MockDomainEnvironment não expõe `store`, `clock`, `ids`, `reset`
type NoInternalKeys = keyof MockDomainEnvironment;
const tt14a: Exclude<NoInternalKeys, "services" | "snapshot"> = null as never;
void tt14a;
// @ts-expect-error — env.store não existe
env.store;
// @ts-expect-error — env.clock não existe
env.clock;
// @ts-expect-error — env.ids não existe
env.ids;
// @ts-expect-error — env.reset não existe
env.reset;

// TT15 — MockDomainOptions rejeita chave desconhecida
const opts: MockDomainOptions = { baseEpochMs: 0, tickMs: 1000 };
void opts;
// @ts-expect-error — chave 'seed' não faz parte das opções
const badOpts: MockDomainOptions = { seed: true };
void badOpts;

// TT16 — Todos os métodos exigem ServiceContext (não string, não objeto solto)
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

// TT17 — Branded IDs continuam obrigatórios (string bruta é recusada)
// @ts-expect-error — string bruta não é CaseId
services.cases.getById(ctx, "case_x");

// TT18 — DTO de criação de caso NÃO aceita `organizationId`, `id`, `metadata`
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
});
// @ts-expect-error — DTO não aceita organizationId
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
  organizationId: "org_y" as OrganizationId,
});
// @ts-expect-error — DTO não aceita id
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
  id: "case_z" as CaseId,
});
// @ts-expect-error — DTO não aceita metadata
services.cases.create(ctx, {
  reference: "REF",
  title: "T",
  confidentiality: "standard",
  metadata: {},
});

// TT19 — Métodos retornam Promise<ServiceResult<T>>
type CaseReturn = ReturnType<typeof services.cases.getById>;
type CaseIsPromise = CaseReturn extends Promise<ServiceResult<Case>> ? true : false;
const tt19: CaseIsPromise = true;
void tt19;

// TT20 — Snapshot é Readonly (assign a snapshot.cases falha)
const _readonlyProbe: TT20 = null as never;
type TT20 =
  Readonly<{ cases: readonly Case[] }> extends Pick<MockDomainSnapshot, "cases">
    ? true
    : false;
void _readonlyProbe;

// TT21 — MockDomainSnapshot mantém readonly em todos os arrays
const snapArr: readonly Case[] = snap.cases;
void snapArr;

// TT22 — createMockDomainEnvironment aceita zero argumentos e retorna
// exatamente MockDomainEnvironment (não uma união mais ampla)
type CreateReturn = ReturnType<typeof createMockDomainEnvironment>;
type CreateOk = CreateReturn extends MockDomainEnvironment
  ? MockDomainEnvironment extends CreateReturn
    ? true
    : false
  : false;
const tt22: CreateOk = true;
void tt22;
