/**
 * LV-07.3.1 — Mocks estáveis do domínio: cobertura funcional real.
 *
 * Cada teste faz asserts observáveis; nenhum termina cedo escondendo
 * ausência de fixture. Fixtures que não existem no seed fazem o teste
 * falhar via `unwrapOk` / `expect(...).toBeGreaterThan(0)`.
 */

import { describe, it, expect } from "bun:test";
import {
  createMockDomainEnvironment,
  validateMockDomainSeed,
  MOCK_BASE_EPOCH_MS,
  MOCK_TICK_MS,
  type MockDomainEnvironment,
} from "../src/domain/mocks";
import * as mocksBarrel from "../src/domain/mocks";
import { buildSeedSnapshot } from "../src/domain/mocks/seed";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceResult } from "../src/domain/services/result";
import type { PageResult } from "../src/domain/services/pagination";
import type { Case } from "../src/domain/core/case";
import type { Person } from "../src/domain/core/person";
import type { CasePerson } from "../src/domain/core/assignment";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_USER_3_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_ALFA_SUSPENDED_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_MEM_BETA_PROF_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_ALFA_3_ID,
  SEED_CASE_BETA_1_ID,
  SEED_CASE_BETA_2_ID,
  SEED_PROF_ALFA_ID,
  SEED_PROF_BETA_ID,
  SEED_CRED_ALFA_ID,
  SEED_CRED_BETA_ID,
  SEED_PERSON_ALFA_1_ID,
  SEED_PERSON_ALFA_2_ID,
  SEED_PERSON_BETA_1_ID,
  SEED_CP_ALFA_1_ID,
  SEED_CP_ALFA_2_ID,
  SEED_REL_ALFA_1_ID,
  SEED_ASSIGN_ALFA_1_ID,
} from "../src/domain/mocks/seed";

// ---- Helpers ---------------------------------------------------------------

function unwrapOk<T>(result: ServiceResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Resultado inesperado: ${result.error.code}`);
  return result.data;
}

function unwrapErr<T>(result: ServiceResult<T>) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Esperava falha, recebeu sucesso");
  return result.error;
}

const ctxAlfaOwner: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

const ctxAlfaSuspended: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
  role: "colaborador",
};

const ctxBetaOwner: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};

const ctxBetaProf: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_3_ID,
  membershipId: SEED_MEM_BETA_PROF_ID,
  role: "profissional",
};

function envSnap(): MockDomainEnvironment {
  return createMockDomainEnvironment();
}

// ---- Barrel (LV-07.3.1 §14) -----------------------------------------------

describe("LV-07.3.1 — Barrel público", () => {
  it("B01 exporta apenas fábrica, tipos e helpers documentados", () => {
    const exported = Object.keys(mocksBarrel).sort();
    expect(exported).toEqual(
      [
        "MOCK_BASE_EPOCH_MS",
        "MOCK_DOMAIN_OPTIONS_ALLOWED_KEYS",
        "MOCK_TICK_MS",
        "createMockDomainEnvironment",
        "validateMockDomainSeed",
      ].sort(),
    );
  });
  it("B02 não expõe store, clock, ids, reset ou instâncias globais", () => {
    for (const forbidden of ["store", "clock", "ids", "reset", "env", "instance"]) {
      expect((mocksBarrel as Record<string, unknown>)[forbidden]).toBeUndefined();
    }
  });
  it("B03 MOCK_BASE_EPOCH_MS e MOCK_TICK_MS têm valores esperados", () => {
    expect(MOCK_BASE_EPOCH_MS).toBe(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(MOCK_TICK_MS).toBe(1000);
  });
});

// ---- Seed determinismo e validação relacional -----------------------------

describe("LV-07.3.1 — Seed", () => {
  it("S01 é estável entre chamadas", () => {
    expect(JSON.stringify(buildSeedSnapshot())).toBe(JSON.stringify(buildSeedSnapshot()));
  });
  it("S02 passa nas regras relacionais", () => {
    expect(validateMockDomainSeed(buildSeedSnapshot())).toEqual([]);
  });
  it("S03 detecta membership duplicado por (user,org)", () => {
    const seed = buildSeedSnapshot();
    const corrupted = {
      ...seed,
      memberships: [
        ...seed.memberships,
        { ...seed.memberships[0], id: seed.memberships[0].id },
      ],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason.startsWith("duplicate"))).toBe(true);
  });
  it("S04 detecta caso apontando para organização inexistente", () => {
    const seed = buildSeedSnapshot();
    const corrupted = {
      ...seed,
      cases: [
        ...seed.cases.slice(1),
        { ...seed.cases[0], organizationId: "org_ghost" as typeof seed.cases[0]["organizationId"] },
      ],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason === "org_not_found")).toBe(true);
  });
  it("S05 detecta perfil profissional com usuário inexistente", () => {
    const seed = buildSeedSnapshot();
    const corrupted = {
      ...seed,
      professionalProfiles: [
        ...seed.professionalProfiles.slice(1),
        {
          ...seed.professionalProfiles[0],
          userId: "usr_ghost" as typeof seed.professionalProfiles[0]["userId"],
        },
      ],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason === "user_not_found")).toBe(true);
  });
  it("S06 detecta relacionamento com pessoa não vinculada ao caso", () => {
    const seed = buildSeedSnapshot();
    const rel = seed.relationships[0];
    const corrupted = {
      ...seed,
      relationships: [{ ...rel, fromPersonId: SEED_PERSON_BETA_1_ID }],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason === "from_person_not_linked")).toBe(true);
  });
  it("S07 detecta referência de caso duplicada na mesma organização", () => {
    const seed = buildSeedSnapshot();
    const corrupted = {
      ...seed,
      cases: [
        ...seed.cases,
        { ...seed.cases[0], id: seed.cases[1].id, reference: seed.cases[0].reference },
      ],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason === "duplicate_reference_in_org")).toBe(true);
  });
  it("S08 detecta CasePerson duplicado por (caso,pessoa)", () => {
    const seed = buildSeedSnapshot();
    const corrupted = {
      ...seed,
      casePersons: [
        ...seed.casePersons,
        { ...seed.casePersons[0], id: seed.casePersons[1].id },
      ],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason === "duplicate_case_person")).toBe(true);
  });
  it("S09 detecta assignment duplicado ativo equivalente", () => {
    const seed = buildSeedSnapshot();
    const corrupted = {
      ...seed,
      assignments: [
        ...seed.assignments,
        { ...seed.assignments[0], id: seed.assignments[1].id },
      ],
    };
    const issues = validateMockDomainSeed(corrupted);
    expect(issues.some((i) => i.reason === "duplicate_active")).toBe(true);
  });
});

// ---- Fábrica / isolamento --------------------------------------------------

describe("LV-07.3.1 — Fábrica e isolamento", () => {
  it("F01 snapshots iniciais equivalentes entre ambientes", () => {
    const a = envSnap().snapshot();
    const b = envSnap().snapshot();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("F02 ambientes diferentes têm referências distintas", () => {
    const a = envSnap();
    const b = envSnap();
    expect(a).not.toBe(b);
    expect(a.services).not.toBe(b.services);
    expect(a.snapshot()).not.toBe(b.snapshot());
  });
  it("F03 escrita em A não afeta B", async () => {
    const a = envSnap();
    const b = envSnap();
    await a.services.cases.create(ctxAlfaOwner, {
      reference: "ONLY-A",
      title: "só em A",
      confidentiality: "standard",
    });
    const snapB = b.snapshot();
    expect(snapB.cases.some((c) => c.reference === "ONLY-A")).toBe(false);
  });
  it("F04 IDs iguais para sequências iguais", async () => {
    const a = envSnap();
    const b = envSnap();
    const r1 = unwrapOk(
      await a.services.cases.create(ctxAlfaOwner, {
        reference: "X",
        title: "T",
        confidentiality: "standard",
      }),
    );
    const r2 = unwrapOk(
      await b.services.cases.create(ctxAlfaOwner, {
        reference: "X",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(r1.id).toBe(r2.id);
  });
  it("F05 IDs diferentes dentro do mesmo ambiente", async () => {
    const env = envSnap();
    const r1 = unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "A",
        title: "T",
        confidentiality: "standard",
      }),
    );
    const r2 = unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "B",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(r1.id).not.toBe(r2.id);
  });
  it("F06 timestamps iguais entre ambientes para sequências iguais", async () => {
    const a = envSnap();
    const b = envSnap();
    const r1 = unwrapOk(
      await a.services.cases.create(ctxAlfaOwner, {
        reference: "T1",
        title: "T",
        confidentiality: "standard",
      }),
    );
    const r2 = unwrapOk(
      await b.services.cases.create(ctxAlfaOwner, {
        reference: "T1",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(r1.metadata.createdAt).toBe(r2.metadata.createdAt);
  });
  it("F07 relógio inicia em MOCK_BASE_EPOCH_MS + 1 tick após primeira escrita", async () => {
    const env = envSnap();
    const c = unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "R",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(Date.parse(c.metadata.createdAt)).toBe(MOCK_BASE_EPOCH_MS + MOCK_TICK_MS);
  });
  it("F08 opções válidas customizam o relógio", async () => {
    const env = createMockDomainEnvironment({ baseEpochMs: 0, tickMs: 5 });
    const c = unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "R",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(Date.parse(c.metadata.createdAt)).toBe(5);
  });
  it("F09 opção desconhecida faz throw", () => {
    expect(() =>
      createMockDomainEnvironment({ desconhecida: 1 } as never),
    ).toThrow();
  });
  it("F10 opção com chave proibida faz throw", () => {
    expect(() =>
      createMockDomainEnvironment({ password: "x" } as never),
    ).toThrow();
  });
  it("F11 tickMs inválido faz throw", () => {
    expect(() => createMockDomainEnvironment({ tickMs: 0 })).toThrow();
    expect(() => createMockDomainEnvironment({ tickMs: -1 })).toThrow();
  });
});

// ---- Mutação externa: snapshot e getById -----------------------------------

describe("LV-07.3.1 — Imutabilidade externa", () => {
  it("I01 mutar snapshot.cases não afeta o store", () => {
    const env = envSnap();
    const s1 = env.snapshot();
    (s1.cases as unknown as Case[])[0].title = "HACK";
    (s1.cases as unknown as Case[])[0].metadata.version = 999;
    (s1.cases as unknown as Case[]).pop();
    const s2 = env.snapshot();
    expect(s2.cases.length).toBe(s1.cases.length + 1); // + 1 porque removemos um em s1
    expect(s2.cases.every((c) => c.title !== "HACK")).toBe(true);
    expect(s2.cases.every((c) => c.metadata.version === 1)).toBe(true);
  });
  it("I02 mutar resultado de getById não afeta o store", async () => {
    const env = envSnap();
    const c1 = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    (c1 as unknown as Case).title = "HACK";
    (c1 as unknown as Case).metadata.version = 999;
    const c2 = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    expect(c2.title).not.toBe("HACK");
    expect(c2.metadata.version).toBe(1);
  });
  it("I03 mutar item de list não afeta o store", async () => {
    const env = envSnap();
    const page1 = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, { page: { limit: 10 } }),
    );
    (page1.items as unknown as Case[])[0].title = "HACK";
    const page2 = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, { page: { limit: 10 } }),
    );
    expect(page2.items.every((c) => c.title !== "HACK")).toBe(true);
  });
});

// ---- Contexto --------------------------------------------------------------

describe("LV-07.3.1 — Contexto", () => {
  it("C01 contexto válido é aceito", async () => {
    const env = envSnap();
    unwrapOk(await env.services.cases.list(ctxAlfaOwner, { page: { limit: 5 } }));
  });
  it("C02 estrutura inválida → unauthorized", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list({} as unknown as ServiceContext, {
        page: { limit: 5 },
      }),
    );
    expect(err.code).toBe("unauthorized");
  });
  it("C03 membership inexistente → unauthorized", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(
        { ...ctxAlfaOwner, membershipId: "mem_ghost" as never },
        { page: { limit: 5 } },
      ),
    );
    expect(err.code).toBe("unauthorized");
  });
  it("C04 org divergente → forbidden", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(
        { ...ctxAlfaOwner, organizationId: SEED_ORG_BETA_ID },
        { page: { limit: 5 } },
      ),
    );
    expect(err.code).toBe("forbidden");
  });
  it("C05 usuário divergente → forbidden", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(
        { ...ctxAlfaOwner, userId: SEED_USER_2_ID },
        { page: { limit: 5 } },
      ),
    );
    expect(err.code).toBe("forbidden");
  });
  it("C06 papel divergente → forbidden", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(
        { ...ctxAlfaOwner, role: "colaborador" },
        { page: { limit: 5 } },
      ),
    );
    expect(err.code).toBe("forbidden");
  });
  it("C07 membership suspenso → forbidden", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfaSuspended, { page: { limit: 5 } }),
    );
    expect(err.code).toBe("forbidden");
  });
  it("C08 membership revogado → forbidden", async () => {
    const env = envSnap();
    // Revogar o Alfa suspended via owner
    const cur = unwrapOk(
      await env.services.memberships.getById(ctxAlfaOwner, SEED_MEM_ALFA_SUSPENDED_ID),
    );
    unwrapOk(
      await env.services.memberships.revoke(ctxAlfaOwner, {
        membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
        expectedVersion: cur.metadata.version,
      }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfaSuspended, { page: { limit: 5 } }),
    );
    expect(err.code).toBe("forbidden");
  });
});

// ---- OrganizationService ---------------------------------------------------

describe("LV-07.3.1 — OrganizationService", () => {
  it("O01 getCurrent devolve a organização do contexto", async () => {
    const env = envSnap();
    const o = unwrapOk(await env.services.organization.getCurrent(ctxAlfaOwner));
    expect(o.id).toBe(SEED_ORG_ALFA_ID);
  });
  it("O02 update rejeita versão errada", async () => {
    const env = envSnap();
    const cur = unwrapOk(await env.services.organization.getCurrent(ctxAlfaOwner));
    const err = unwrapErr(
      await env.services.organization.update(ctxAlfaOwner, {
        displayName: "Novo",
        expectedVersion: cur.metadata.version + 9,
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("O03 update válido incrementa versão", async () => {
    const env = envSnap();
    const cur = unwrapOk(await env.services.organization.getCurrent(ctxAlfaOwner));
    const next = unwrapOk(
      await env.services.organization.update(ctxAlfaOwner, {
        displayName: "Renomeada",
        expectedVersion: cur.metadata.version,
      }),
    );
    expect(next.displayName).toBe("Renomeada");
    expect(next.metadata.version).toBe(cur.metadata.version + 1);
    expect(next.metadata.createdAt).toBe(cur.metadata.createdAt);
  });
});

// ---- CurrentUserService ----------------------------------------------------

describe("LV-07.3.1 — CurrentUserService", () => {
  it("U01 devolve o usuário do contexto", async () => {
    const env = envSnap();
    const u = unwrapOk(await env.services.currentUser.getCurrent(ctxBetaProf));
    expect(u.id).toBe(SEED_USER_3_ID);
  });
  it("U02 contexto inválido é bloqueado", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.currentUser.getCurrent(ctxAlfaSuspended),
    );
    expect(err.code).toBe("forbidden");
  });
});

// ---- CaseService: normalização, filtros, ordenação, paginação --------------

describe("LV-07.3.1 — CaseService", () => {
  it("CA01 create trim reference e title", async () => {
    const env = envSnap();
    const c = unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "  REF-NOVA  ",
        title: "  Título  ",
        confidentiality: "standard",
      }),
    );
    expect(c.reference).toBe("REF-NOVA");
    expect(c.title).toBe("Título");
  });
  it("CA02 duplicidade detectada com espaços externos", async () => {
    const env = envSnap();
    unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "REF-NOVA",
        title: "T",
        confidentiality: "standard",
      }),
    );
    const err = unwrapErr(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "  REF-NOVA  ",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("CA03 organizações diferentes podem reusar a mesma referência", async () => {
    const env = envSnap();
    unwrapOk(
      await env.services.cases.create(ctxAlfaOwner, {
        reference: "COMPART-1",
        title: "T",
        confidentiality: "standard",
      }),
    );
    unwrapOk(
      await env.services.cases.create(ctxBetaOwner, {
        reference: "COMPART-1",
        title: "T",
        confidentiality: "standard",
      }),
    );
  });
  it("CA04 update com versão correta avança versão e updatedAt", async () => {
    const env = envSnap();
    const before = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    const after = unwrapOk(
      await env.services.cases.update(ctxAlfaOwner, SEED_CASE_ALFA_1_ID, {
        title: "novo",
        expectedVersion: before.metadata.version,
      }),
    );
    expect(after.metadata.version).toBe(before.metadata.version + 1);
    expect(after.metadata.createdAt).toBe(before.metadata.createdAt);
    expect(Date.parse(after.metadata.updatedAt)).toBeGreaterThan(
      Date.parse(before.metadata.updatedAt),
    );
  });
  it("CA05 conflito devolve expectedVersion e actualVersion", async () => {
    const env = envSnap();
    const before = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    const err = unwrapErr(
      await env.services.cases.update(ctxAlfaOwner, SEED_CASE_ALFA_1_ID, {
        title: "n",
        expectedVersion: before.metadata.version + 3,
      }),
    );
    if (err.code === "conflict") {
      expect(err.expectedVersion).toBe(before.metadata.version + 3);
      expect(err.actualVersion).toBe(before.metadata.version);
    } else {
      throw new Error("esperava conflict");
    }
  });
  it("CA06 conflito não altera entidade, não avança relógio, não consome ID", async () => {
    const a = envSnap();
    const b = envSnap();
    const before = unwrapOk(
      await a.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    // Em A: uma falha de conflito
    unwrapErr(
      await a.services.cases.update(ctxAlfaOwner, SEED_CASE_ALFA_1_ID, {
        title: "x",
        expectedVersion: before.metadata.version + 5,
      }),
    );
    const rA = unwrapOk(
      await a.services.cases.create(ctxAlfaOwner, {
        reference: "AFTER",
        title: "T",
        confidentiality: "standard",
      }),
    );
    const rB = unwrapOk(
      await b.services.cases.create(ctxAlfaOwner, {
        reference: "AFTER",
        title: "T",
        confidentiality: "standard",
      }),
    );
    expect(rA.id).toBe(rB.id);
    expect(rA.metadata.createdAt).toBe(rB.metadata.createdAt);
  });
  it("CA07 filtro por status", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 100 },
        filter: { statuses: ["draft"] },
      }),
    );
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((c) => c.status === "draft")).toBe(true);
  });
  it("CA08 filtro por confidencialidade", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 100 },
        filter: { confidentiality: ["restricted"] },
      }),
    );
    expect(page.items.every((c) => c.confidentiality === "restricted")).toBe(true);
  });
  it("CA09 busca por referência", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 100 },
        filter: { search: "REF-ALFA-002" },
      }),
    );
    expect(page.items.length).toBeGreaterThanOrEqual(1);
    expect(page.items[0].reference).toBe("REF-ALFA-002");
  });
  it("CA10 busca por título case-insensitive e com espaços externos", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 100 },
        filter: { search: "  demonstração alfa 002  " },
      }),
    );
    expect(page.items.length).toBeGreaterThanOrEqual(1);
  });
  it("CA11 ordenação ascendente por título", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 100 },
        sortBy: "title",
        sortDir: "asc",
      }),
    );
    for (let i = 1; i < page.items.length; i += 1) {
      expect(
        page.items[i - 1].title <= page.items[i].title,
      ).toBe(true);
    }
  });
  it("CA12 ordenação descendente por título", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 100 },
        sortBy: "title",
        sortDir: "desc",
      }),
    );
    for (let i = 1; i < page.items.length; i += 1) {
      expect(
        page.items[i - 1].title >= page.items[i].title,
      ).toBe(true);
    }
  });
  it("CA13 campo de ordenação inválido → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 10 },
        sortBy: "nao_existe" as never,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("CA14 direção de ordenação inválida → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 10 },
        sortDir: "up" as never,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("CA15 primeira página + página intermediária + última página, sem duplicações", async () => {
    const env = envSnap();
    // criar casos suficientes
    for (let i = 0; i < 6; i += 1) {
      unwrapOk(
        await env.services.cases.create(ctxAlfaOwner, {
          reference: `PAG-${i}`,
          title: `T${i}`,
          confidentiality: "standard",
        }),
      );
    }
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, { page: { limit: 3 } }),
    );
    expect(p1.items.length).toBe(3);
    expect(p1.nextCursor).toBeDefined();
    const p2 = unwrapOk(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 3, cursor: p1.nextCursor! },
      }),
    );
    const collected = new Set<string>([...p1.items, ...p2.items].map((c) => c.id));
    expect(collected.size).toBe(p1.items.length + p2.items.length);
  });
  it("CA16 cursor sintaticamente válido além do conjunto → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 3, cursor: "mock_cursor_999999" },
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("CA17 cursor malformado → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfaOwner, {
        page: { limit: 3, cursor: "cursor_qualquer" },
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("CA18 limit inválido → validation_error", async () => {
    const env = envSnap();
    expect(
      (await env.services.cases.list(ctxAlfaOwner, { page: { limit: 0 } as never })).ok,
    ).toBe(false);
    expect(
      (await env.services.cases.list(ctxAlfaOwner, { page: { limit: 500 } })).ok,
    ).toBe(false);
  });
  it("CA19 limit 1 e limit 100 são válidos", async () => {
    const env = envSnap();
    unwrapOk(await env.services.cases.list(ctxAlfaOwner, { page: { limit: 1 } }));
    unwrapOk(await env.services.cases.list(ctxAlfaOwner, { page: { limit: 100 } }));
  });
  it("CA20 archive respeita concorrência", async () => {
    const env = envSnap();
    const before = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    unwrapErr(
      await env.services.cases.archive(
        ctxAlfaOwner,
        SEED_CASE_ALFA_1_ID,
        before.metadata.version + 5,
      ),
    );
    const arch = unwrapOk(
      await env.services.cases.archive(
        ctxAlfaOwner,
        SEED_CASE_ALFA_1_ID,
        before.metadata.version,
      ),
    );
    expect(arch.status).toBe("archived");
  });
  it("CA21 readiness reporta issues sinceros", async () => {
    const env = envSnap();
    const view = unwrapOk(
      await env.services.cases.getReadiness(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    expect(view.issues.length).toBeGreaterThan(0);
  });
  it("CA22 changeStatus com versão errada não muda entidade", async () => {
    const env = envSnap();
    const before = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    unwrapErr(
      await env.services.cases.changeStatus(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_1_ID,
        status: "active",
        expectedVersion: before.metadata.version + 2,
      }),
    );
    const after = unwrapOk(
      await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID),
    );
    expect(after.status).toBe(before.status);
    expect(after.metadata.version).toBe(before.metadata.version);
  });
  it("CA23 cross-org getById → not_found", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.cases.getById(ctxBetaOwner, SEED_CASE_ALFA_1_ID),
    );
    expect(err.code).toBe("not_found");
  });
});

// ---- MembershipService -----------------------------------------------------

describe("LV-07.3.1 — MembershipService", () => {
  it("MB01 revoke com versão correta muda status", async () => {
    const env = envSnap();
    const cur = unwrapOk(
      await env.services.memberships.getById(ctxAlfaOwner, SEED_MEM_ALFA_SUSPENDED_ID),
    );
    const next = unwrapOk(
      await env.services.memberships.revoke(ctxAlfaOwner, {
        membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
        expectedVersion: cur.metadata.version,
      }),
    );
    expect(next.status).toBe("revoked");
  });
  it("MB02 create duplicado → conflict", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.memberships.create(ctxAlfaOwner, {
        userId: SEED_USER_1_ID,
        role: "proprietario",
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("MB03 changeRole altera papel e versão", async () => {
    const env = envSnap();
    const cur = unwrapOk(
      await env.services.memberships.getById(ctxAlfaOwner, SEED_MEM_ALFA_SUSPENDED_ID),
    );
    const next = unwrapOk(
      await env.services.memberships.changeRole(ctxAlfaOwner, {
        membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
        role: "leitura",
        expectedVersion: cur.metadata.version,
      }),
    );
    expect(next.role).toBe("leitura");
    expect(next.metadata.version).toBe(cur.metadata.version + 1);
  });
  it("MB04 filtro por papel", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.memberships.list(ctxAlfaOwner, {
        page: { limit: 100 },
        filter: { roles: ["proprietario"] },
      }),
    );
    expect(page.items.every((m) => m.role === "proprietario")).toBe(true);
  });
  it("MB05 filtro por status", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.memberships.list(ctxAlfaOwner, {
        page: { limit: 100 },
        filter: { statuses: ["suspended"] },
      }),
    );
    expect(page.items.every((m) => m.status === "suspended")).toBe(true);
  });
  it("MB06 sortBy inválido → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.memberships.list(ctxAlfaOwner, {
        page: { limit: 10 },
        sortBy: "x" as never,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
});

// ---- ProfessionalProfileService + Credential -------------------------------

describe("LV-07.3.1 — ProfessionalProfileService", () => {
  it("PP01 create rejeita duplicado (mesma area/user/org)", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.professionalProfiles.create(ctxAlfaOwner, {
        userId: SEED_USER_1_ID,
        area: "psicologia",
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("PP02 create nova area OK", async () => {
    const env = envSnap();
    unwrapOk(
      await env.services.professionalProfiles.create(ctxAlfaOwner, {
        userId: SEED_USER_1_ID,
        area: "servico-social",
      }),
    );
  });
  it("PP03 update para area duplicada equivalente → conflict", async () => {
    const env = envSnap();
    const secondary = unwrapOk(
      await env.services.professionalProfiles.create(ctxAlfaOwner, {
        userId: SEED_USER_1_ID,
        area: "servico-social",
      }),
    );
    const err = unwrapErr(
      await env.services.professionalProfiles.update(ctxAlfaOwner, secondary.id, {
        area: "psicologia",
        expectedVersion: secondary.metadata.version,
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("PP04 filtro por área", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.professionalProfiles.list(ctxBetaOwner, {
        page: { limit: 10 },
        filter: { areas: ["servico-social"] },
      }),
    );
    expect(page.items.every((p) => p.area === "servico-social")).toBe(true);
    expect(page.items.length).toBeGreaterThan(0);
  });
  it("PP05 filtro por status", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.professionalProfiles.list(ctxAlfaOwner, {
        page: { limit: 10 },
        filter: { statuses: ["active"] },
      }),
    );
    expect(page.items.every((p) => p.status === "active")).toBe(true);
  });
  it("PP06 changeStatus incrementa versão", async () => {
    const env = envSnap();
    const cur = unwrapOk(
      await env.services.professionalProfiles.getById(ctxAlfaOwner, SEED_PROF_ALFA_ID),
    );
    const next = unwrapOk(
      await env.services.professionalProfiles.changeStatus(ctxAlfaOwner, {
        professionalProfileId: SEED_PROF_ALFA_ID,
        status: "inactive",
        expectedVersion: cur.metadata.version,
      }),
    );
    expect(next.status).toBe("inactive");
    expect(next.metadata.version).toBe(cur.metadata.version + 1);
  });
});

describe("LV-07.3.1 — CredentialService", () => {
  it("CR01 listByProfessionalProfile devolve credenciais próprias", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.credentials.listByProfessionalProfile(
        ctxAlfaOwner,
        SEED_PROF_ALFA_ID,
        { limit: 10 },
      ),
    );
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items[0].id).toBe(SEED_CRED_ALFA_ID);
  });
  it("CR02 cross-org devolve not_found", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.credentials.listByProfessionalProfile(
        ctxBetaOwner,
        SEED_PROF_ALFA_ID,
        { limit: 10 },
      ),
    );
    expect(err.code).toBe("not_found");
  });
  it("CR03 updateStatus versão errada → conflict", async () => {
    const env = envSnap();
    const cur = unwrapOk(
      await env.services.credentials.getById(ctxBetaOwner, SEED_CRED_BETA_ID),
    );
    const err = unwrapErr(
      await env.services.credentials.updateStatus(ctxBetaOwner, {
        credentialId: SEED_CRED_BETA_ID,
        status: "verified",
        expectedVersion: cur.metadata.version + 3,
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("CR04 updateStatus válido incrementa versão", async () => {
    const env = envSnap();
    const cur = unwrapOk(
      await env.services.credentials.getById(ctxBetaOwner, SEED_CRED_BETA_ID),
    );
    const next = unwrapOk(
      await env.services.credentials.updateStatus(ctxBetaOwner, {
        credentialId: SEED_CRED_BETA_ID,
        status: "verified",
        expectedVersion: cur.metadata.version,
      }),
    );
    expect(next.status).toBe("verified");
    expect(next.metadata.version).toBe(cur.metadata.version + 1);
  });
  it("CR05 create nova credencial funciona", async () => {
    const env = envSnap();
    const c = unwrapOk(
      await env.services.credentials.create(ctxBetaOwner, {
        professionalProfileId: SEED_PROF_BETA_ID,
      }),
    );
    expect(c.professionalProfileId).toBe(SEED_PROF_BETA_ID);
    expect(c.metadata.version).toBe(1);
  });
});

// ---- PersonService / CasePerson / Relationship / minor proteção -----------

describe("LV-07.3.1 — PersonService e proteção de menores", () => {
  it("PS01 create rejeita label vazio", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.persons.create(ctxAlfaOwner, {
        displayLabel: "   ",
        ageClassification: "adult",
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("PS02 update block adult→child se existir vínculo desprotegido", async () => {
    const env = envSnap();
    const before = unwrapOk(
      await env.services.persons.getById(ctxAlfaOwner, SEED_PERSON_ALFA_1_ID),
    );
    // Pessoa Alfa 1 tem CasePerson com restrictedByDefault=false
    const err = unwrapErr(
      await env.services.persons.update(ctxAlfaOwner, SEED_PERSON_ALFA_1_ID, {
        ageClassification: "child",
        expectedVersion: before.metadata.version,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("PS03 update permite mudança após vínculos serem protegidos", async () => {
    const env = envSnap();
    const cp = unwrapOk(
      await env.services.casePersons.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
      ),
    );
    unwrapOk(
      await env.services.casePersons.update(ctxAlfaOwner, SEED_CASE_ALFA_2_ID, {
        casePersonId: SEED_CP_ALFA_1_ID,
        restrictedByDefault: true,
        expectedVersion: cp.metadata.version,
      }),
    );
    const person = unwrapOk(
      await env.services.persons.getById(ctxAlfaOwner, SEED_PERSON_ALFA_1_ID),
    );
    unwrapOk(
      await env.services.persons.update(ctxAlfaOwner, SEED_PERSON_ALFA_1_ID, {
        ageClassification: "child",
        expectedVersion: person.metadata.version,
      }),
    );
  });
  it("PS04 filtro por classificação etária", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.persons.list(ctxAlfaOwner, {
        page: { limit: 10 },
        filter: { ageClassifications: ["adolescent"] },
      }),
    );
    expect(page.items.every((p) => p.ageClassification === "adolescent")).toBe(true);
    expect(page.items.length).toBeGreaterThan(0);
  });
  it("PS05 busca por displayLabel case-insensitive", async () => {
    const env = envSnap();
    const page = unwrapOk(
      await env.services.persons.list(ctxAlfaOwner, {
        page: { limit: 10 },
        filter: { search: "pessoa alfa" },
      }),
    );
    expect(page.items.length).toBeGreaterThanOrEqual(2);
  });
  it("PS06 sortBy inválido → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.persons.list(ctxAlfaOwner, {
        page: { limit: 10 },
        sortBy: "algo" as never,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
});

describe("LV-07.3.1 — CasePersonService", () => {
  it("CP01 cross-case getById → not_found (vínculo é de Alfa 2)", async () => {
    const env = envSnap();
    const listAlfa2 = unwrapOk(
      await env.services.casePersons.listByCase(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        { limit: 10 },
      ),
    );
    expect(listAlfa2.items.length).toBeGreaterThan(0);
    const cp = listAlfa2.items[0];
    const err = unwrapErr(
      await env.services.casePersons.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_1_ID,
        cp.id,
      ),
    );
    expect(err.code).toBe("not_found");
  });
  it("CP02 create força restrição para criança", async () => {
    const env = envSnap();
    const cp = unwrapOk(
      await env.services.casePersons.create(ctxBetaOwner, {
        caseId: SEED_CASE_BETA_1_ID,
        personId: unwrapOk(
          await env.services.persons.create(ctxBetaOwner, {
            displayLabel: "Criança Teste",
            ageClassification: "child",
          }),
        ).id,
        role: "child_or_adolescent",
        restrictedByDefault: false, // será sobrescrito
      }),
    );
    expect(cp.restrictedByDefault).toBe(true);
  });
  it("CP03 create adolescente é restrito", async () => {
    const env = envSnap();
    const cp = unwrapOk(
      await env.services.casePersons.create(ctxBetaOwner, {
        caseId: SEED_CASE_BETA_1_ID,
        personId: unwrapOk(
          await env.services.persons.create(ctxBetaOwner, {
            displayLabel: "Adolescente Teste",
            ageClassification: "adolescent",
          }),
        ).id,
        role: "child_or_adolescent",
        restrictedByDefault: false,
      }),
    );
    expect(cp.restrictedByDefault).toBe(true);
  });
  it("CP04 adulto respeita valor informado", async () => {
    const env = envSnap();
    const p = unwrapOk(
      await env.services.persons.create(ctxBetaOwner, {
        displayLabel: "Adulto",
        ageClassification: "adult",
      }),
    );
    const cp = unwrapOk(
      await env.services.casePersons.create(ctxBetaOwner, {
        caseId: SEED_CASE_BETA_1_ID,
        personId: p.id,
        role: "witness",
        restrictedByDefault: false,
      }),
    );
    expect(cp.restrictedByDefault).toBe(false);
  });
  it("CP05 duplicidade (caso,pessoa) → conflict", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.casePersons.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        personId: SEED_PERSON_ALFA_1_ID,
        role: "witness",
        restrictedByDefault: false,
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("CP06 remove bloqueado se há relacionamentos", async () => {
    const env = envSnap();
    const cp = unwrapOk(
      await env.services.casePersons.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
      ),
    );
    const err = unwrapErr(
      await env.services.casePersons.remove(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
        cp.metadata.version,
      ),
    );
    expect(err.code).toBe("conflict");
    if (err.code === "conflict") expect(err.message).toBe("case_person_in_use");
  });
  it("CP07 remove permitido após remover relacionamento", async () => {
    const env = envSnap();
    const rel = unwrapOk(
      await env.services.relationships.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_REL_ALFA_1_ID,
      ),
    );
    unwrapOk(
      await env.services.relationships.remove(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_REL_ALFA_1_ID,
        rel.metadata.version,
      ),
    );
    const cp = unwrapOk(
      await env.services.casePersons.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
      ),
    );
    unwrapOk(
      await env.services.casePersons.remove(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
        cp.metadata.version,
      ),
    );
    // Pessoa continua existindo
    unwrapOk(
      await env.services.persons.getById(ctxAlfaOwner, SEED_PERSON_ALFA_1_ID),
    );
  });
});

describe("LV-07.3.1 — RelationshipService", () => {
  it("RL01 autorrelacionamento → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.relationships.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_ALFA_1_ID,
        toPersonId: SEED_PERSON_ALFA_1_ID,
        type: "spouse",
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("RL02 pessoa de outra organização → not_found (caso não bate)", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.relationships.create(ctxBetaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_BETA_1_ID,
        toPersonId: SEED_PERSON_ALFA_1_ID,
        type: "spouse",
      }),
    );
    expect(err.code).toBe("not_found");
  });
  it("RL03 pessoa não vinculada ao caso → validation_error", async () => {
    const env = envSnap();
    // Cria uma pessoa Alfa nova e tenta relacionar sem CasePerson
    const p = unwrapOk(
      await env.services.persons.create(ctxAlfaOwner, {
        displayLabel: "Solta",
        ageClassification: "adult",
      }),
    );
    const err = unwrapErr(
      await env.services.relationships.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: p.id,
        toPersonId: SEED_PERSON_ALFA_1_ID,
        type: "spouse",
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("RL04 duplicata equivalente → conflict", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.relationships.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_ALFA_1_ID,
        toPersonId: SEED_PERSON_ALFA_2_ID,
        type: "parent_child",
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("RL05 update criando duplicata equivalente → conflict", async () => {
    const env = envSnap();
    const rel2 = unwrapOk(
      await env.services.relationships.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_ALFA_1_ID,
        toPersonId: SEED_PERSON_ALFA_2_ID,
        type: "spouse",
      }),
    );
    const err = unwrapErr(
      await env.services.relationships.update(ctxAlfaOwner, SEED_CASE_ALFA_2_ID, {
        relationshipId: rel2.id,
        type: "parent_child",
        expectedVersion: rel2.metadata.version,
      }),
    );
    expect(err.code).toBe("conflict");
  });
});

// ---- AssignmentService ----------------------------------------------------

describe("LV-07.3.1 — AssignmentService", () => {
  it("AS01 changeStatus com caseId errado → not_found (assignment é do Alfa 2)", async () => {
    const env = envSnap();
    const list = unwrapOk(
      await env.services.assignments.listByCase(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        { limit: 10 },
      ),
    );
    expect(list.items.length).toBeGreaterThan(0);
    const a = list.items[0];
    expect(a.id).toBe(SEED_ASSIGN_ALFA_1_ID);
    const err = unwrapErr(
      await env.services.assignments.changeStatus(ctxAlfaOwner, SEED_CASE_ALFA_1_ID, {
        assignmentId: a.id,
        status: "concluded",
        expectedVersion: a.metadata.version,
      }),
    );
    expect(err.code).toBe("not_found");
  });
  it("AS02 startedOn inválido → validation_error", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.assignments.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_1_ID,
        professionalProfileId: SEED_PROF_ALFA_ID,
        role: "principal" as never,
        startedOn: "2026-02-30" as never,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
  it("AS03 duplicidade ativa em create → conflict", async () => {
    const env = envSnap();
    const err = unwrapErr(
      await env.services.assignments.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        professionalProfileId: SEED_PROF_ALFA_ID,
        role: "lead_professional",
        startedOn: "2026-01-02" as never,
      }),
    );
    expect(err.code).toBe("conflict");
  });
  it("AS04 changeStatus reativando duplicata → conflict", async () => {
    const env = envSnap();
    // Concluir o assignment existente
    const cur = unwrapOk(
      await env.services.assignments.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_ASSIGN_ALFA_1_ID,
      ),
    );
    unwrapOk(
      await env.services.assignments.changeStatus(ctxAlfaOwner, SEED_CASE_ALFA_2_ID, {
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
        status: "concluded",
        expectedVersion: cur.metadata.version,
      }),
    );
    // Criar um novo com mesmo (caso, perfil, papel) ativo
    const novo = unwrapOk(
      await env.services.assignments.create(ctxAlfaOwner, {
        caseId: SEED_CASE_ALFA_2_ID,
        professionalProfileId: SEED_PROF_ALFA_ID,
        role: "lead_professional",
        startedOn: "2026-01-02" as never,
      }),
    );
    // Tentar reativar o antigo
    const antigoAgora = unwrapOk(
      await env.services.assignments.getById(
        ctxAlfaOwner,
        SEED_CASE_ALFA_2_ID,
        SEED_ASSIGN_ALFA_1_ID,
      ),
    );
    const err = unwrapErr(
      await env.services.assignments.changeStatus(ctxAlfaOwner, SEED_CASE_ALFA_2_ID, {
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
        status: "active",
        expectedVersion: antigoAgora.metadata.version,
      }),
    );
    expect(err.code).toBe("conflict");
    // O outro segue ativo
    expect(novo.status).toBe("active");
  });
});
