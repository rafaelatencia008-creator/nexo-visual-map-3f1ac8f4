/**
 * LV-07.4 (+ LV-07.4.1) — matriz de permissões, política mock e integração
 * de serviços.
 *
 * Este arquivo é somente leitura: nenhum teste escreve, apaga ou regenera
 * arquivos do projeto. Toda a manipulação de estado acontece dentro de
 * ambientes isolados criados por `createMockDomainEnvironment` ou de
 * stores controlados construídos com `createEmptyStore`.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  createMockDomainEnvironment,
  type MockDomainEnvironment,
  type MockDomainSnapshot,
} from "../src/domain/mocks";
import {
  PERMISSION_ACTIONS,
  type PermissionAction,
  type PermissionRequest,
} from "../src/domain/services/permissions";
import { ROLES, type Role } from "../src/domain/shared/work-context";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceError, ServiceResult } from "../src/domain/services/result";
import { buildDomainId } from "../src/domain/core/ids";
import type { MembershipId, OrganizationId, UserId } from "../src/domain/core/ids";
import type { IsoDate, IsoDateTime, EntityMetadata } from "../src/domain/core/common";
import type { PageRequest } from "../src/domain/services/pagination";
import type { Organization } from "../src/domain/core/organization";
import type { User, Membership } from "../src/domain/core/access";
import { createEmptyStore } from "../src/domain/mocks/store";
import { createPermissionPolicyMock } from "../src/domain/mocks/permission-mock";
import {
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_ALFA_SUSPENDED_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_USER_3_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_BETA_1_ID,
  SEED_PROF_ALFA_ID,
  SEED_PERSON_ALFA_1_ID,
  SEED_PERSON_ALFA_2_ID,
} from "../src/domain/mocks/seed";

// ============================================================================
// Helpers explícitos (sem caminhos que pulem asserções)
// ============================================================================

function unwrapOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) {
    throw new Error(
      `Esperado sucesso, recebido ${result.error.code}/${result.error.message}`,
    );
  }
  return result.data;
}

function unwrapError<T>(result: ServiceResult<T>): ServiceError {
  if (result.ok) {
    throw new Error("Esperado erro, recebido sucesso");
  }
  return result.error;
}

const OWNER_CONTEXT: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

const BETA_OWNER_CONTEXT: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};

const PAGE: PageRequest = { limit: 10 };

// Expectativa independente da matriz concreta.
const ADMIN_ACTIONS: readonly PermissionAction[] = [
  "organization.update",
  "membership.create",
  "membership.update",
  "membership.revoke",
];
const ALL_ROLES: readonly Role[] = [...ROLES];
const ADMIN_ROLES: readonly Role[] = ["proprietario", "administrador"];
const WRITE_ROLES: readonly Role[] = [
  "proprietario",
  "administrador",
  "profissional",
  "revisor",
  "colaborador",
];

function isReadOrListAction(action: PermissionAction): boolean {
  return action.endsWith(".read") || action.endsWith(".list");
}

function expectedRolesFor(action: PermissionAction): readonly Role[] {
  if (isReadOrListAction(action)) return ALL_ROLES;
  if (ADMIN_ACTIONS.includes(action)) return ADMIN_ROLES;
  return WRITE_ROLES;
}

type RoleSetup = { env: MockDomainEnvironment; context: ServiceContext };

async function setupRoleEnv(role: Role): Promise<RoleSetup> {
  const env = createMockDomainEnvironment();
  if (role === "proprietario") {
    return { env, context: OWNER_CONTEXT };
  }
  // Cria uma membership fictícia para USER_3 em ALFA já com o papel-alvo.
  const created = unwrapOk(
    await env.services.memberships.create(OWNER_CONTEXT, {
      userId: SEED_USER_3_ID,
      role,
    }),
  );
  const context: ServiceContext = {
    organizationId: SEED_ORG_ALFA_ID,
    userId: SEED_USER_3_ID,
    membershipId: created.id,
    role,
  };
  return { env, context };
}

function snapshotEqual(a: MockDomainSnapshot, b: MockDomainSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ============================================================================
// (1) Matriz completa: 40 ações × 6 papéis = 240 decisões
// ============================================================================

describe("LV-07.4 — matriz completa (40 ações × 6 papéis)", () => {
  const contexts = new Map<Role, RoleSetup>();

  beforeAll(async () => {
    for (const role of ROLES) {
      contexts.set(role, await setupRoleEnv(role));
    }
    expect(PERMISSION_ACTIONS.length).toBe(40);
    expect(ROLES.length).toBe(6);
  });

  for (const action of PERMISSION_ACTIONS) {
    it(`avalia ${action} nos seis papéis (independente da matriz)`, async () => {
      const expected = expectedRolesFor(action);
      for (const role of ROLES) {
        const entry = contexts.get(role);
        if (entry === undefined) {
          throw new Error(`setupRoleEnv(${role}) não produziu contexto`);
        }
        const setup: RoleSetup = entry;
        const decision = unwrapOk(
          await setup.env.services.permissions.evaluate(setup.context, {
            action,
          }),
        );
        const shouldAllow = expected.includes(role);
        expect(decision.allowed).toBe(shouldAllow);
        if (shouldAllow) {
          expect(decision.reason).toBeUndefined();
        } else {
          expect(decision.reason).toBe("role_not_allowed");
        }
      }
    });
  }
});

// ============================================================================
// (2) Cenários de erro de contexto (oito casos — código + mensagem exatos)
// ============================================================================

describe("LV-07.4 — erros de contexto", () => {
  it("A1) contexto estruturalmente inválido → unauthorized/invalid_context", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.permissions.evaluate(
        { foo: "bar" } as unknown as ServiceContext,
        { action: "organization.read" },
      ),
    );
    expect(err.code).toBe("unauthorized");
    expect(err.message).toBe("invalid_context");
  });

  it("A2) membership inexistente → unauthorized/membership_not_found", async () => {
    const env = createMockDomainEnvironment();
    const missing = buildDomainId("membership", "missing_x") as MembershipId;
    const err = unwrapError(
      await env.services.permissions.evaluate(
        { ...OWNER_CONTEXT, membershipId: missing },
        { action: "organization.read" },
      ),
    );
    expect(err.code).toBe("unauthorized");
    expect(err.message).toBe("membership_not_found");
  });

  it("A3) organização divergente do membership → forbidden/organization_mismatch", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.permissions.evaluate(
        { ...OWNER_CONTEXT, organizationId: SEED_ORG_BETA_ID },
        { action: "organization.read" },
      ),
    );
    expect(err.code).toBe("forbidden");
    expect(err.message).toBe("organization_mismatch");
  });

  it("A4) usuário divergente do membership → forbidden/user_mismatch", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.permissions.evaluate(
        { ...OWNER_CONTEXT, userId: SEED_USER_2_ID },
        { action: "organization.read" },
      ),
    );
    expect(err.code).toBe("forbidden");
    expect(err.message).toBe("user_mismatch");
  });

  it("A5) papel divergente do membership → forbidden/role_mismatch", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.permissions.evaluate(
        { ...OWNER_CONTEXT, role: "leitura" },
        { action: "organization.read" },
      ),
    );
    expect(err.code).toBe("forbidden");
    expect(err.message).toBe("role_mismatch");
  });

  it("A6) membership suspenso → forbidden/membership_not_active", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.permissions.evaluate(
        {
          organizationId: SEED_ORG_ALFA_ID,
          userId: SEED_USER_2_ID,
          membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
          role: "colaborador",
        },
        { action: "organization.read" },
      ),
    );
    expect(err.code).toBe("forbidden");
    expect(err.message).toBe("membership_not_active");
  });

  // ---- Store controlado para A7 e A8 --------------------------------------

  const T0: IsoDateTime = "2026-01-01T00:00:00.000Z" as IsoDateTime;
  const META: EntityMetadata = { createdAt: T0, updatedAt: T0, version: 1 };

  it("A7) organização inexistente no store → unauthorized/organization_not_found", async () => {
    const store = createEmptyStore();
    // Um usuário válido...
    const user: User = {
      id: SEED_USER_1_ID,
      status: "active",
      displayLabel: "u",
      metadata: META,
    };
    // Uma membership que aponta para uma organização inexistente no store.
    const orphanOrgId = buildDomainId("organization", "ghost") as OrganizationId;
    const membership: Membership = {
      id: SEED_MEM_ALFA_OWNER_ID,
      organizationId: orphanOrgId,
      userId: SEED_USER_1_ID,
      role: "proprietario",
      status: "active",
      metadata: META,
    };
    store.users.set(user.id, user);
    store.memberships.set(membership.id, membership);
    // Nenhum registro em `organizations`.

    const policy = createPermissionPolicyMock(store);
    const ctx: ServiceContext = {
      organizationId: orphanOrgId,
      userId: SEED_USER_1_ID,
      membershipId: SEED_MEM_ALFA_OWNER_ID,
      role: "proprietario",
    };
    const err = unwrapError(
      await policy.evaluate(ctx, { action: "organization.read" }),
    );
    expect(err.code).toBe("unauthorized");
    expect(err.message).toBe("organization_not_found");
  });

  it("A8) usuário inexistente no store → unauthorized/user_not_found", async () => {
    const store = createEmptyStore();
    // Uma organização válida...
    const org: Organization = {
      id: SEED_ORG_ALFA_ID,
      kind: "individual",
      displayName: "Org",
      status: "active",
      metadata: META,
    };
    // Uma membership que aponta para um usuário inexistente no store.
    const orphanUserId = buildDomainId("user", "ghost") as UserId;
    const membership: Membership = {
      id: SEED_MEM_ALFA_OWNER_ID,
      organizationId: SEED_ORG_ALFA_ID,
      userId: orphanUserId,
      role: "proprietario",
      status: "active",
      metadata: META,
    };
    store.organizations.set(org.id, org);
    store.memberships.set(membership.id, membership);
    // Nenhum registro em `users`.

    const policy = createPermissionPolicyMock(store);
    const ctx: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: orphanUserId,
      membershipId: SEED_MEM_ALFA_OWNER_ID,
      role: "proprietario",
    };
    const err = unwrapError(
      await policy.evaluate(ctx, { action: "organization.read" }),
    );
    expect(err.code).toBe("unauthorized");
    expect(err.message).toBe("user_not_found");
  });
});

// ============================================================================
// (3) Decisões da policy (três casos)
// ============================================================================

describe("LV-07.4 — decisões da PermissionPolicy", () => {
  it("B1) pedido de permissão inválido → validation_error/invalid_permission_request", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.permissions.evaluate(
        OWNER_CONTEXT,
        { action: "not.an.action" } as unknown as PermissionRequest,
      ),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_permission_request");
  });

  it("B2) decisão permitida devolve allowed=true sem reason", async () => {
    const env = createMockDomainEnvironment();
    const decision = unwrapOk(
      await env.services.permissions.evaluate(OWNER_CONTEXT, {
        action: "case.create",
      }),
    );
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBeUndefined();
  });

  it("B3) decisão negada devolve allowed=false com reason=role_not_allowed", async () => {
    const setup = await setupRoleEnv("leitura");
    const decision = unwrapOk(
      await setup.env.services.permissions.evaluate(setup.context, {
        action: "case.create",
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("role_not_allowed");
  });
});

// ============================================================================
// (4) Cenários administrativos (dois casos)
// ============================================================================

describe("LV-07.4 — ações administrativas", () => {
  it("C1) profissional não pode executar organization.update (sem efeito colateral)", async () => {
    const setup = await setupRoleEnv("profissional");
    const before = setup.env.snapshot();
    const err = unwrapError(
      await setup.env.services.organization.update(setup.context, {
        displayName: "novo nome",
        expectedVersion: 1,
      }),
    );
    expect(err.code).toBe("forbidden");
    expect(err.message).toBe("permission_denied");
    const after = setup.env.snapshot();
    expect(snapshotEqual(before, after)).toBe(true);
  });

  it("C2) administrador pode executar organization.update", async () => {
    const setup = await setupRoleEnv("administrador");
    const updated = unwrapOk(
      await setup.env.services.organization.update(setup.context, {
        displayName: "renomeada",
        expectedVersion: 1,
      }),
    );
    expect(updated.displayName).toBe("renomeada");
    expect(updated.metadata.version).toBe(2);
  });
});

// ============================================================================
// (5) Integração dos serviços — ambientes gêmeos A/B com papel `leitura`.
//     Sequência A: prep → snapshot → tentativa negada (contexto leitura) →
//     asserções de forbidden/permission_denied e snapshot inalterado →
//     operação válida como proprietário no MESMO ambiente A.
//     Sequência B: mesma prep → operação válida como proprietário (sem
//     tentativa negada). Comparação metadatal entre A e B.
// ============================================================================

/**
 * Cria dois ambientes idênticos (`envA` e `envB`), cada um com uma
 * membership de papel `leitura` para o mesmo usuário. Ambos consomem
 * exatamente um id (mock_0001) e um tick de relógio na preparação,
 * mantendo estado sincronizado.
 */
async function prepareLeituraTwins(): Promise<{
  envA: MockDomainEnvironment;
  envB: MockDomainEnvironment;
  leituraContext: ServiceContext;
}> {
  const envA = createMockDomainEnvironment();
  const envB = createMockDomainEnvironment();
  const memA = unwrapOk(
    await envA.services.memberships.create(OWNER_CONTEXT, {
      userId: SEED_USER_3_ID,
      role: "leitura",
    }),
  );
  const memB = unwrapOk(
    await envB.services.memberships.create(OWNER_CONTEXT, {
      userId: SEED_USER_3_ID,
      role: "leitura",
    }),
  );
  // Ambos devem produzir o MESMO id (determinismo).
  expect(memA.id).toBe(memB.id);
  const leituraContext: ServiceContext = {
    organizationId: SEED_ORG_ALFA_ID,
    userId: SEED_USER_3_ID,
    membershipId: memA.id,
    role: "leitura",
  };
  return { envA, envB, leituraContext };
}

/**
 * Prova genérica de "tentativa negada não produz efeito colateral" e
 * "resultado válido em A é idêntico ao de B". Comparações comuns a todos
 * os casos (id/createdAt/updatedAt/version + snapshots finais equivalentes).
 */
type WithMetadata = { id: string; metadata: EntityMetadata };

async function proveTwins<T extends WithMetadata>(
  runDenied: (env: MockDomainEnvironment, ctx: ServiceContext) => Promise<ServiceResult<unknown>>,
  runValid: (env: MockDomainEnvironment) => Promise<ServiceResult<T>>,
  expectVersion: 1 | 2,
): Promise<{ a: T; b: T }> {
  const { envA, envB, leituraContext } = await prepareLeituraTwins();

  // Snapshot antes da tentativa negada (ambiente A).
  const snapBeforeDenied = envA.snapshot();

  // Tentativa negada exclusivamente no ambiente A.
  const denied = await runDenied(envA, leituraContext);
  const deniedErr = unwrapError(denied);
  expect(deniedErr.code).toBe("forbidden");
  expect(deniedErr.message).toBe("permission_denied");

  // Nenhum efeito colateral: snapshot inalterado.
  const snapAfterDenied = envA.snapshot();
  expect(snapshotEqual(snapBeforeDenied, snapAfterDenied)).toBe(true);

  // Operação válida como proprietário no MESMO ambiente A.
  const a = unwrapOk(await runValid(envA));
  // Mesma operação em ambiente B (que nunca sofreu tentativa negada).
  const b = unwrapOk(await runValid(envB));

  // Comparação metadatal exigida.
  expect(a.id).toBe(b.id);
  expect(a.metadata.createdAt).toBe(b.metadata.createdAt);
  expect(a.metadata.updatedAt).toBe(b.metadata.updatedAt);
  expect(a.metadata.version).toBe(b.metadata.version);
  expect(a.metadata.version).toBe(expectVersion);

  // Snapshots finais equivalentes entre A e B.
  expect(snapshotEqual(envA.snapshot(), envB.snapshot())).toBe(true);

  return { a, b };
}

describe("LV-07.4 — integração dos serviços (ambientes gêmeos A/B)", () => {
  it("D1) organization.update — negado para `leitura`, válido para proprietário", async () => {
    const input = { displayName: "canonical", expectedVersion: 1 as 1 };
    const { a } = await proveTwins(
      (env, ctx) => env.services.organization.update(ctx, input),
      (env) => env.services.organization.update(OWNER_CONTEXT, input),
      2,
    );
    // createdAt preservado, updatedAt avançado.
    expect(a.metadata.createdAt).not.toBe(a.metadata.updatedAt);
    expect(a.id).toBe(SEED_ORG_ALFA_ID);
  });

  it("D2) memberships.changeRole — negado para `leitura`, válido para proprietário (mesmo método e input)", async () => {
    const input = {
      membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
      role: "revisor" as const,
      expectedVersion: 1 as 1,
    };
    const { a } = await proveTwins(
      (env, ctx) => env.services.memberships.changeRole(ctx, input),
      (env) => env.services.memberships.changeRole(OWNER_CONTEXT, input),
      2,
    );
    expect(a.id).toBe(SEED_MEM_ALFA_SUSPENDED_ID);
    expect(a.metadata.createdAt).not.toBe(a.metadata.updatedAt);
  });

  it("D3) professionalProfiles.create — negado para `leitura`, válido para proprietário", async () => {
    const input = { userId: SEED_USER_2_ID, area: "servico-social" as const };
    await proveTwins(
      (env, ctx) => env.services.professionalProfiles.create(ctx, input),
      (env) => env.services.professionalProfiles.create(OWNER_CONTEXT, input),
      1,
    );
  });

  it("D4) credentials.create — negado para `leitura`, válido para proprietário", async () => {
    const input = { professionalProfileId: SEED_PROF_ALFA_ID };
    await proveTwins(
      (env, ctx) => env.services.credentials.create(ctx, input),
      (env) => env.services.credentials.create(OWNER_CONTEXT, input),
      1,
    );
  });

  it("D5) cases.create — negado para `leitura`, válido para proprietário", async () => {
    const input = {
      reference: "REF-D5-001",
      title: "Caso D5",
      confidentiality: "standard" as const,
    };
    await proveTwins(
      (env, ctx) => env.services.cases.create(ctx, input),
      (env) => env.services.cases.create(OWNER_CONTEXT, input),
      1,
    );
  });

  it("D6) persons.create — negado para `leitura`, válido para proprietário", async () => {
    const input = {
      displayLabel: "Nova Pessoa D6",
      ageClassification: "adult" as const,
    };
    await proveTwins(
      (env, ctx) => env.services.persons.create(ctx, input),
      (env) => env.services.persons.create(OWNER_CONTEXT, input),
      1,
    );
  });

  it("D7) casePersons.create — negado para `leitura`, válido para proprietário", async () => {
    const input = {
      caseId: SEED_CASE_ALFA_1_ID,
      personId: SEED_PERSON_ALFA_1_ID,
      role: "applicant" as const,
      restrictedByDefault: false,
    };
    await proveTwins(
      (env, ctx) => env.services.casePersons.create(ctx, input),
      (env) => env.services.casePersons.create(OWNER_CONTEXT, input),
      1,
    );
  });

  it("D8) relationships.create — negado para `leitura`, válido para proprietário", async () => {
    const input = {
      caseId: SEED_CASE_ALFA_2_ID,
      fromPersonId: SEED_PERSON_ALFA_2_ID,
      toPersonId: SEED_PERSON_ALFA_1_ID,
      type: "sibling" as const,
    };
    await proveTwins(
      (env, ctx) => env.services.relationships.create(ctx, input),
      (env) => env.services.relationships.create(OWNER_CONTEXT, input),
      1,
    );
  });

  it("D9) assignments.create — negado para `leitura`, válido para proprietário", async () => {
    const startedOn = "2026-06-01" as IsoDate;
    const input = {
      caseId: SEED_CASE_ALFA_1_ID,
      professionalProfileId: SEED_PROF_ALFA_ID,
      role: "lead_professional" as const,
      startedOn,
    };
    await proveTwins(
      (env, ctx) => env.services.assignments.create(ctx, input),
      (env) => env.services.assignments.create(OWNER_CONTEXT, input),
      1,
    );
  });
});

// ============================================================================
// (6) Ordem dos erros nos serviços: contexto → permissão → recurso → input →
//     versão → commit. Provas para as quatro invariantes do pedido.
// ============================================================================

describe("LV-07.4 — ordem dos erros nos serviços", () => {
  it("E1) recurso de outra organização retorna not_found/resource_not_found (permissão existe)", async () => {
    const env = createMockDomainEnvironment();
    // Proprietário de ALFA consultando um case de BETA — mesma ação permitida,
    // mas o recurso não existe no escopo dele.
    const err = unwrapError(
      await env.services.cases.getById(OWNER_CONTEXT, SEED_CASE_BETA_1_ID),
    );
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("resource_not_found");
  });

  it("E2) papel sem ação recebe forbidden/permission_denied ANTES de qualquer consulta de recurso", async () => {
    const setup = await setupRoleEnv("leitura");
    // O contexto leitura tenta CRIAR um caso apontando para uma referência
    // válida — mesmo que o input fosse aceito e o recurso disponível, a
    // permissão deve barrar antes.
    const err = unwrapError(
      await setup.env.services.cases.create(setup.context, {
        reference: "REF-E2",
        title: "Caso E2",
        confidentiality: "standard",
      }),
    );
    expect(err.code).toBe("forbidden");
    expect(err.message).toBe("permission_denied");

    // Também deve barrar leitura tentando ler recurso de outra organização —
    // a permissão vem antes de mesmo procurar o recurso. Como `case.read` é
    // permitido para todos os papéis, esse cenário não se aplica; usamos
    // uma ação restrita: `case.update`.
    const err2 = unwrapError(
      await setup.env.services.cases.update(
        setup.context,
        SEED_CASE_BETA_1_ID,
        { title: "x", expectedVersion: 1 },
      ),
    );
    expect(err2.code).toBe("forbidden");
    expect(err2.message).toBe("permission_denied");
  });

  it("E3) conflito de versão retorna conflict (permissão + recurso válidos)", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapError(
      await env.services.organization.update(OWNER_CONTEXT, {
        displayName: "novo",
        expectedVersion: 999, // versão errada
      }),
    );
    expect(err.code).toBe("conflict");
  });

  it("E4) input inválido retorna validation_error quando a permissão existe", async () => {
    const env = createMockDomainEnvironment();
    // Reference vazia deve falhar por validação. Owner tem permission.
    const err = unwrapError(
      await env.services.cases.create(OWNER_CONTEXT, {
        reference: "   ",
        title: "Sem referência",
        confidentiality: "standard",
      }),
    );
    expect(err.code).toBe("validation_error");
  });

  it("E5) BETA_OWNER_CONTEXT também demonstra isolamento cross-org", async () => {
    const env = createMockDomainEnvironment();
    // Owner de BETA tenta ler case da ALFA → resource_not_found.
    const err = unwrapError(
      await env.services.cases.getById(BETA_OWNER_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("resource_not_found");
  });
});
