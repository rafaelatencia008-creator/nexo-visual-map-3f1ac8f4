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

// TT12 — snapshot expõe arrays readonly reais (não Array mutável).
// Prova real: `push` não existe em `readonly T[]`.
type HasPush<T> = T extends { push: (...args: never[]) => number } ? true : false;
type CasesHasPush = HasPush<MockDomainSnapshot["cases"]>;
const tt12: CasesHasPush = false;
void tt12;
// @ts-expect-error — readonly arrays não têm .push
snap.cases.push({} as Case);
// @ts-expect-error — readonly arrays rejeitam atribuição indexada
snap.cases[0] = {} as Case;

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

// TT19 — Métodos retornam Promise<ServiceResult<T>>
type CaseReturn = ReturnType<typeof services.cases.getById>;
type CaseIsPromise = CaseReturn extends Promise<ServiceResult<Case>> ? true : false;
const tt19: CaseIsPromise = true;
void tt19;

// TT20 — Snapshot é Readonly a nível de propriedade (não permite reassign).
// @ts-expect-error — snapshot.cases não é atribuível
snap.cases = [] as unknown as MockDomainSnapshot["cases"];

// TT21 — MockDomainSnapshot mantém readonly em todos os arrays: aceitar
// somente `readonly` na coluna esquerda prova que o snapshot não expõe
// Array mutável.
const snapArr: readonly Case[] = snap.cases;
void snapArr;
// @ts-expect-error — não é atribuível a Array mutável
const _mutableProbe: Case[] = snap.cases;
void _mutableProbe;

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
