/**
 * LV-07.4 — matriz de permissões, política mock e integração de serviços.
 *
 * Este arquivo é somente leitura: nenhum teste escreve, apaga ou regenera
 * arquivos do projeto. Toda a manipulação de estado acontece dentro de
 * ambientes isolados criados por `createMockDomainEnvironment`.
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
import { buildDomainId } from "../src/domain/core/ids";
import type {
  MembershipId,
  OrganizationId,
  UserId,
} from "../src/domain/core/ids";
import type { PageRequest } from "../src/domain/services/pagination";
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
  SEED_CP_ALFA_1_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_CRED_ALFA_ID,
} from "../src/domain/mocks/seed";

// ============================================================================
// Constantes e helpers
// ============================================================================

const OWNER_CONTEXT: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
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
  const created = await env.services.memberships.create(OWNER_CONTEXT, {
    userId: SEED_USER_3_ID,
    role,
  });
  if (!created.ok) {
    throw new Error(`setupRoleEnv(${role}): create membership failed`);
  }
  const context: ServiceContext = {
    organizationId: SEED_ORG_ALFA_ID,
    userId: SEED_USER_3_ID,
    membershipId: created.data.id,
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
    // Sanidade: 40 ações no catálogo.
    expect(PERMISSION_ACTIONS.length).toBe(40);
    expect(ROLES.length).toBe(6);
  });

  for (const action of PERMISSION_ACTIONS) {
    it(`avalia ${action} nos seis papéis (independente da matriz)`, async () => {
      const expected = expectedRolesFor(action);
      for (const role of ROLES) {
        const entry = contexts.get(role);
        expect(entry).toBeDefined();
        const setup = entry as RoleSetup;
        const decision = await setup.env.services.permissions.evaluate(
          setup.context,
          { action },
        );
        expect(decision.ok).toBe(true);
        expect(decision).toMatchObject({ ok: true });
        if (!decision.ok) continue; // exclusivamente para narrowing; nunca alcançado
        const shouldAllow = expected.includes(role);
        expect(decision.data.allowed).toBe(shouldAllow);
        if (shouldAllow) {
          expect(decision.data.reason).toBeUndefined();
        } else {
          expect(decision.data.reason).toBe("role_not_allowed");
        }
      }
    });
  }
});

// ============================================================================
// (2) Cenários de erro de contexto (oito casos)
// ============================================================================

describe("LV-07.4 — erros de contexto", () => {
  it("A1) contexto estruturalmente inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(
      { foo: "bar" } as unknown as ServiceContext,
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("A2) membership inexistente", async () => {
    const env = createMockDomainEnvironment();
    const missing = buildDomainId("membership", "missing_x") as MembershipId;
    const r = await env.services.permissions.evaluate(
      { ...OWNER_CONTEXT, membershipId: missing },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("A3) organização divergente do membership", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(
      { ...OWNER_CONTEXT, organizationId: SEED_ORG_BETA_ID },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("A4) usuário divergente do membership", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(
      { ...OWNER_CONTEXT, userId: SEED_USER_2_ID },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("A5) papel divergente do membership", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(
      { ...OWNER_CONTEXT, role: "leitura" },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("A6) membership suspenso", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(
      {
        organizationId: SEED_ORG_ALFA_ID,
        userId: SEED_USER_2_ID,
        membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
        role: "colaborador",
      },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("A7) organização inexistente no store", async () => {
    const env = createMockDomainEnvironment();
    const fakeOrg = buildDomainId("organization", "ghost") as OrganizationId;
    const r = await env.services.permissions.evaluate(
      { ...OWNER_CONTEXT, organizationId: fakeOrg },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    // membership check runs first — org divergente do membership → forbidden.
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("A8) usuário inexistente no store", async () => {
    const env = createMockDomainEnvironment();
    const fakeUser = buildDomainId("user", "ghost") as UserId;
    const r = await env.services.permissions.evaluate(
      { ...OWNER_CONTEXT, userId: fakeUser },
      { action: "organization.read" },
    );
    expect(r.ok).toBe(false);
    // Divergência user × membership → forbidden.
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });
});

// ============================================================================
// (3) Decisões da policy (três casos)
// ============================================================================

describe("LV-07.4 — decisões da PermissionPolicy", () => {
  it("B1) pedido de permissão inválido → validation_error/invalid_permission_request", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(
      OWNER_CONTEXT,
      { action: "not.an.action" } as unknown as PermissionRequest,
    );
    expect(r).toEqual({
      ok: false,
      error: {
        code: "validation_error",
        message: "invalid_permission_request",
      },
    });
  });

  it("B2) decisão permitida devolve allowed=true sem reason", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(OWNER_CONTEXT, {
      action: "case.create",
    });
    expect(r).toEqual({ ok: true, data: { allowed: true } });
  });

  it("B3) decisão negada devolve allowed=false com reason=role_not_allowed", async () => {
    const setup = await setupRoleEnv("leitura");
    const r = await setup.env.services.permissions.evaluate(setup.context, {
      action: "case.create",
    });
    expect(r).toEqual({
      ok: true,
      data: { allowed: false, reason: "role_not_allowed" },
    });
  });
});

// ============================================================================
// (4) Cenários administrativos (dois casos)
// ============================================================================

describe("LV-07.4 — ações administrativas", () => {
  it("C1) profissional não pode executar organization.update", async () => {
    const setup = await setupRoleEnv("profissional");
    const before = setup.env.snapshot();
    const r = await setup.env.services.organization.update(setup.context, {
      displayName: "novo nome",
      expectedVersion: 1,
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "forbidden", message: "permission_denied" },
    });
    const after = setup.env.snapshot();
    expect(snapshotEqual(before, after)).toBe(true);
  });

  it("C2) administrador pode executar organization.update", async () => {
    const setup = await setupRoleEnv("administrador");
    const r = await setup.env.services.organization.update(setup.context, {
      displayName: "renomeada",
      expectedVersion: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.displayName).toBe("renomeada");
      expect(r.data.metadata.version).toBe(2);
    }
  });
});

// ============================================================================
// (5) Integração dos serviços com papel `leitura`
//     — leitura permitida, escrita negada e ausência de efeitos colaterais.
// ============================================================================

async function makeLeituraSetup(): Promise<RoleSetup> {
  return setupRoleEnv("leitura");
}

/**
 * Confirma que a operação sem tentativa negada (env B) produz o mesmo
 * resultado que a mesma operação após uma tentativa negada (env A).
 * Só se aplica a operações que retornam uma entidade criada/atualizada
 * com metadata versionado.
 */
async function assertNoSideEffect(
  attemptDenied: () => Promise<void>,
  runOwnerA: (env: MockDomainEnvironment) => Promise<unknown>,
  runOwnerB: (env: MockDomainEnvironment) => Promise<unknown>,
  envA: MockDomainEnvironment,
): Promise<void> {
  const snapBefore = envA.snapshot();
  await attemptDenied();
  const snapAfter = envA.snapshot();
  expect(snapshotEqual(snapBefore, snapAfter)).toBe(true);
  const envB = createMockDomainEnvironment();
  const a = await runOwnerA(envA);
  const b = await runOwnerB(envB);
  expect(a).toEqual(b);
}

describe("LV-07.4 — integração dos serviços", () => {
  it("D1) organização: leitura permitida, update negado", async () => {
    const s = await makeLeituraSetup();
    const read = await s.env.services.organization.getCurrent(s.context);
    expect(read.ok).toBe(true);

    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.organization.update(s.context, {
          displayName: "hack",
          expectedVersion: 1,
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.organization.update(OWNER_CONTEXT, {
          displayName: "canonical",
          expectedVersion: 1,
        }),
      (envB) =>
        envB.services.organization.update(OWNER_CONTEXT, {
          displayName: "canonical",
          expectedVersion: 1,
        }),
      s.env,
    );
  });

  it("D2) memberships: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.memberships.list(s.context, {
      page: PAGE,
    });
    expect(list.ok).toBe(true);

    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.memberships.create(s.context, {
          userId: SEED_USER_2_ID,
          role: "colaborador",
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      // Owner cria membership para USER_2 em ALFA — porém já existe (suspenso).
      // Usamos changeRole numa membership existente para gerar id/version comparáveis.
      (envA) =>
        envA.services.memberships.changeRole(OWNER_CONTEXT, {
          membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
          role: "revisor",
          expectedVersion: 1,
        }),
      (envB) =>
        envB.services.memberships.changeRole(OWNER_CONTEXT, {
          membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
          role: "revisor",
          expectedVersion: 1,
        }),
      s.env,
    );
  });

  it("D3) perfis profissionais: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.professionalProfiles.list(s.context, {
      page: PAGE,
    });
    expect(list.ok).toBe(true);

    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.professionalProfiles.create(s.context, {
          userId: SEED_USER_2_ID,
          area: "servico-social",
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.professionalProfiles.create(OWNER_CONTEXT, {
          userId: SEED_USER_2_ID,
          area: "servico-social",
        }),
      (envB) =>
        envB.services.professionalProfiles.create(OWNER_CONTEXT, {
          userId: SEED_USER_2_ID,
          area: "servico-social",
        }),
      s.env,
    );
  });

  it("D4) credenciais: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.credentials.listByProfessionalProfile(
      s.context,
      SEED_PROF_ALFA_ID,
      PAGE,
    );
    expect(list.ok).toBe(true);

    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.credentials.create(s.context, {
          professionalProfileId: SEED_PROF_ALFA_ID,
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.credentials.create(OWNER_CONTEXT, {
          professionalProfileId: SEED_PROF_ALFA_ID,
        }),
      (envB) =>
        envB.services.credentials.create(OWNER_CONTEXT, {
          professionalProfileId: SEED_PROF_ALFA_ID,
        }),
      s.env,
    );
  });

  it("D5) casos: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.cases.list(s.context, { page: PAGE });
    expect(list.ok).toBe(true);

    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.cases.create(s.context, {
          reference: "REF-NOVO-001",
          title: "Caso Novo",
          confidentiality: "standard",
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.cases.create(OWNER_CONTEXT, {
          reference: "REF-NOVO-001",
          title: "Caso Novo",
          confidentiality: "standard",
        }),
      (envB) =>
        envB.services.cases.create(OWNER_CONTEXT, {
          reference: "REF-NOVO-001",
          title: "Caso Novo",
          confidentiality: "standard",
        }),
      s.env,
    );
  });

  it("D6) pessoas: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.persons.list(s.context, { page: PAGE });
    expect(list.ok).toBe(true);

    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.persons.create(s.context, {
          displayLabel: "Nova Pessoa",
          ageClassification: "adult",
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.persons.create(OWNER_CONTEXT, {
          displayLabel: "Nova Pessoa",
          ageClassification: "adult",
        }),
      (envB) =>
        envB.services.persons.create(OWNER_CONTEXT, {
          displayLabel: "Nova Pessoa",
          ageClassification: "adult",
        }),
      s.env,
    );
  });

  it("D7) case-person: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.casePersons.listByCase(
      s.context,
      SEED_CASE_ALFA_2_ID,
      PAGE,
    );
    expect(list.ok).toBe(true);

    // Precisamos de um caso e pessoa que ainda não estejam vinculados.
    // ALFA_1 não tem case_persons no seed; usamos pessoa ALFA_1.
    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.casePersons.create(s.context, {
          caseId: SEED_CASE_ALFA_1_ID,
          personId: SEED_PERSON_ALFA_1_ID,
          role: "applicant",
          restrictedByDefault: false,
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.casePersons.create(OWNER_CONTEXT, {
          caseId: SEED_CASE_ALFA_1_ID,
          personId: SEED_PERSON_ALFA_1_ID,
          role: "applicant",
          restrictedByDefault: false,
        }),
      (envB) =>
        envB.services.casePersons.create(OWNER_CONTEXT, {
          caseId: SEED_CASE_ALFA_1_ID,
          personId: SEED_PERSON_ALFA_1_ID,
          role: "applicant",
          restrictedByDefault: false,
        }),
      s.env,
    );
  });

  it("D8) relacionamentos: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.relationships.listByCase(
      s.context,
      SEED_CASE_ALFA_2_ID,
      PAGE,
    );
    expect(list.ok).toBe(true);

    // create requer as pessoas vinculadas ao caso; ALFA_2 tem CP_1 e CP_2.
    // Um relacionamento parent_child já existe entre ALFA_1 e ALFA_2 no seed,
    // então usamos o inverso ALFA_2 → ALFA_1 (tipo sibling) para evitar duplicata.
    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.relationships.create(s.context, {
          caseId: SEED_CASE_ALFA_2_ID,
          fromPersonId: SEED_PERSON_ALFA_2_ID,
          toPersonId: SEED_PERSON_ALFA_1_ID,
          type: "sibling",
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.relationships.create(OWNER_CONTEXT, {
          caseId: SEED_CASE_ALFA_2_ID,
          fromPersonId: SEED_PERSON_ALFA_2_ID,
          toPersonId: SEED_PERSON_ALFA_1_ID,
          type: "sibling",
        }),
      (envB) =>
        envB.services.relationships.create(OWNER_CONTEXT, {
          caseId: SEED_CASE_ALFA_2_ID,
          fromPersonId: SEED_PERSON_ALFA_2_ID,
          toPersonId: SEED_PERSON_ALFA_1_ID,
          type: "sibling",
        }),
      s.env,
    );
  });

  it("D9) assignments: list permitido, create negado", async () => {
    const s = await makeLeituraSetup();
    const list = await s.env.services.assignments.listByCase(
      s.context,
      SEED_CASE_ALFA_2_ID,
      PAGE,
    );
    expect(list.ok).toBe(true);

    // ALFA_1 não tem assignment ativo para PROF_ALFA no seed.
    await assertNoSideEffect(
      async () => {
        const r = await s.env.services.assignments.create(s.context, {
          caseId: SEED_CASE_ALFA_1_ID,
          professionalProfileId: SEED_PROF_ALFA_ID,
          role: "lead_professional",
          startedOn: "2026-06-01" as never,
        });
        expect(r).toMatchObject({
          ok: false,
          error: { code: "forbidden", message: "permission_denied" },
        });
      },
      (envA) =>
        envA.services.assignments.create(OWNER_CONTEXT, {
          caseId: SEED_CASE_ALFA_1_ID,
          professionalProfileId: SEED_PROF_ALFA_ID,
          role: "lead_professional",
          startedOn: "2026-06-01" as never,
        }),
      (envB) =>
        envB.services.assignments.create(OWNER_CONTEXT, {
          caseId: SEED_CASE_ALFA_1_ID,
          professionalProfileId: SEED_PROF_ALFA_ID,
          role: "lead_professional",
          startedOn: "2026-06-01" as never,
        }),
      s.env,
    );
  });
});
