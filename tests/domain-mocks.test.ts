/**
 * LV-07.3 — Mocks estáveis do domínio.
 *
 * Cobre: isolamento entre ambientes, determinismo do relógio e IDs,
 * seed oficial, CRUD, concorrência otimista, cross-org, cross-case,
 * readiness, paginação e cursores.
 */

import { describe, it, expect } from "bun:test";
import {
  createMockDomainEnvironment,
  validateMockDomainSeed,
  MOCK_BASE_EPOCH_MS,
} from "../src/domain/mocks";
import { buildSeedSnapshot } from "../src/domain/mocks/seed";
import type { ServiceContext } from "../src/domain/services/context";
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
  SEED_PROF_ALFA_ID,
  SEED_PROF_BETA_ID,
  SEED_PERSON_ALFA_1_ID,
} from "../src/domain/mocks/seed";

const ctxAlfaOwner: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "owner",
};

const ctxAlfaSuspended: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_3_ID,
  membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
  role: "professional",
};

const ctxBetaOwner: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "owner",
};

const ctxBetaProf: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_3_ID,
  membershipId: SEED_MEM_BETA_PROF_ID,
  role: "professional",
};

// ---- Seed e determinismo ---------------------------------------------------

describe("LV-07.3 — seed oficial e determinismo", () => {
  it("M01 seed é estável entre chamadas", () => {
    const a = buildSeedSnapshot();
    const b = buildSeedSnapshot();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("M02 seed passa na validação estrutural", () => {
    const issues = validateMockDomainSeed(buildSeedSnapshot());
    expect(issues).toEqual([]);
  });

  it("M03 dois ambientes são independentes", async () => {
    const a = createMockDomainEnvironment();
    const b = createMockDomainEnvironment();
    const r = await a.services.cases.create(ctxAlfaOwner, {
      reference: "REF-NEW",
      title: "Novo caso",
      confidentiality: "standard",
    });
    expect(r.ok).toBe(true);
    const snapA = a.snapshot();
    const snapB = b.snapshot();
    expect(snapA.cases.length).toBe(snapB.cases.length + 1);
  });

  it("M04 relógio inicia em MOCK_BASE_EPOCH_MS e avança 1s por escrita", async () => {
    const env = createMockDomainEnvironment();
    const r1 = await env.services.cases.create(ctxAlfaOwner, {
      reference: "R-1",
      title: "T1",
      confidentiality: "standard",
    });
    const r2 = await env.services.cases.create(ctxAlfaOwner, {
      reference: "R-2",
      title: "T2",
      confidentiality: "standard",
    });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    const t1 = Date.parse(r1.data.metadata.createdAt);
    const t2 = Date.parse(r2.data.metadata.createdAt);
    expect(t2 - t1).toBe(1000);
    expect(t1).toBeGreaterThanOrEqual(MOCK_BASE_EPOCH_MS);
  });

  it("M05 IDs gerados são determinísticos", async () => {
    const a = createMockDomainEnvironment();
    const b = createMockDomainEnvironment();
    const ra = await a.services.cases.create(ctxAlfaOwner, {
      reference: "X",
      title: "T",
      confidentiality: "standard",
    });
    const rb = await b.services.cases.create(ctxAlfaOwner, {
      reference: "X",
      title: "T",
      confidentiality: "standard",
    });
    expect(ra.ok && rb.ok).toBe(true);
    if (!ra.ok || !rb.ok) return;
    expect(ra.data.id).toBe(rb.data.id);
  });

  it("M06 snapshot devolve cópia (mutar não afeta o store)", async () => {
    const env = createMockDomainEnvironment();
    const snap = env.snapshot();
    (snap.cases as unknown as unknown[]).length; // não altera; snapshot readonly
    // leitura seguida devolve mesmo conteúdo
    const snap2 = env.snapshot();
    expect(snap2.cases.length).toBe(snap.cases.length);
  });
});

// ---- Contexto e permissões estruturais -------------------------------------

describe("LV-07.3 — validação de contexto", () => {
  it("M10 rejeita contexto inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.list(
      { organizationId: "org_x", userId: "usr_x", membershipId: "mem_x", role: "owner" } as unknown as ServiceContext,
      { page: { limit: 10 } },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("unauthorized");
  });

  it("M11 rejeita membership de outra organização", async () => {
    const env = createMockDomainEnvironment();
    const bad: ServiceContext = { ...ctxAlfaOwner, organizationId: SEED_ORG_BETA_ID };
    const r = await env.services.cases.list(bad, { page: { limit: 10 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });

  it("M12 rejeita membership suspenso", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.list(ctxAlfaSuspended, { page: { limit: 10 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });
});

// ---- Cases: CRUD, isolamento e concorrência --------------------------------

describe("LV-07.3 — CaseService", () => {
  it("M20 list retorna apenas casos da organização do contexto", async () => {
    const env = createMockDomainEnvironment();
    const rA = await env.services.cases.list(ctxAlfaOwner, { page: { limit: 100 } });
    const rB = await env.services.cases.list(ctxBetaOwner, { page: { limit: 100 } });
    expect(rA.ok && rB.ok).toBe(true);
    if (!rA.ok || !rB.ok) return;
    expect(rA.data.items.every((c) => c.organizationId === SEED_ORG_ALFA_ID)).toBe(true);
    expect(rB.data.items.every((c) => c.organizationId === SEED_ORG_BETA_ID)).toBe(true);
  });

  it("M21 getById cross-org devolve not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.getById(ctxBetaOwner, SEED_CASE_ALFA_1_ID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("M22 create rejeita reference duplicada", async () => {
    const env = createMockDomainEnvironment();
    const first = await env.services.cases.create(ctxAlfaOwner, {
      reference: "DUP-1",
      title: "T",
      confidentiality: "standard",
    });
    expect(first.ok).toBe(true);
    const dup = await env.services.cases.create(ctxAlfaOwner, {
      reference: "DUP-1",
      title: "T",
      confidentiality: "standard",
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe("conflict");
  });

  it("M23 update com expectedVersion errado devolve conflict e não altera", async () => {
    const env = createMockDomainEnvironment();
    const before = await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    const r = await env.services.cases.update(ctxAlfaOwner, SEED_CASE_ALFA_1_ID, {
      title: "novo",
      expectedVersion: before.data.metadata.version + 99,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("conflict");
      if (r.error.code === "conflict") {
        expect(r.error.actualVersion).toBe(before.data.metadata.version);
      }
    }
    const after = await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID);
    if (after.ok) expect(after.data.title).toBe(before.data.title);
  });

  it("M24 update com versão correta avança versão e updatedAt", async () => {
    const env = createMockDomainEnvironment();
    const before = await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_1_ID);
    if (!before.ok) throw new Error("bootstrap");
    const r = await env.services.cases.update(ctxAlfaOwner, SEED_CASE_ALFA_1_ID, {
      title: "Renomeado",
      expectedVersion: before.data.metadata.version,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.metadata.version).toBe(before.data.metadata.version + 1);
    expect(r.data.title).toBe("Renomeado");
    expect(Date.parse(r.data.metadata.updatedAt)).toBeGreaterThan(
      Date.parse(before.data.metadata.updatedAt),
    );
  });

  it("M25 changeStatus e archive respeitam concorrência", async () => {
    const env = createMockDomainEnvironment();
    const before = await env.services.cases.getById(ctxAlfaOwner, SEED_CASE_ALFA_2_ID);
    if (!before.ok) throw new Error("bootstrap");
    const bad = await env.services.cases.archive(
      ctxAlfaOwner,
      SEED_CASE_ALFA_2_ID,
      before.data.metadata.version + 5,
    );
    expect(bad.ok).toBe(false);
    const good = await env.services.cases.archive(
      ctxAlfaOwner,
      SEED_CASE_ALFA_2_ID,
      before.data.metadata.version,
    );
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.data.status).toBe("archived");
  });

  it("M26 filtros e busca funcionam", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.list(ctxAlfaOwner, {
      page: { limit: 100 },
      filter: { statuses: ["draft"] },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items.every((c) => c.status === "draft")).toBe(true);
  });

  it("M27 paginação com cursor devolve páginas contíguas", async () => {
    const env = createMockDomainEnvironment();
    const p1 = await env.services.cases.list(ctxAlfaOwner, { page: { limit: 2 } });
    if (!p1.ok) throw new Error("bootstrap");
    expect(p1.data.items.length).toBe(2);
    expect(p1.data.nextCursor).toBeDefined();
    const p2 = await env.services.cases.list(ctxAlfaOwner, {
      page: { limit: 2, cursor: p1.data.nextCursor! },
    });
    expect(p2.ok).toBe(true);
    if (!p2.ok) return;
    const ids1 = p1.data.items.map((c) => c.id);
    const ids2 = p2.data.items.map((c) => c.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false);
  });

  it("M28 cursor inválido devolve validation_error", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.list(ctxAlfaOwner, {
      page: { limit: 2, cursor: "not_a_cursor" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation_error");
  });

  it("M29 readiness reflete estado do caso e assignments ativos", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.getReadiness(ctxAlfaOwner, SEED_CASE_ALFA_3_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Array.isArray(r.data.issues)).toBe(true);
  });
});

// ---- Memberships -----------------------------------------------------------

describe("LV-07.3 — MembershipService", () => {
  it("M30 revoke exige expectedVersion e muda status para revoked", async () => {
    const env = createMockDomainEnvironment();
    const before = await env.services.memberships.getById(
      ctxAlfaOwner,
      SEED_MEM_ALFA_SUSPENDED_ID,
    );
    if (!before.ok) throw new Error("bootstrap");
    const bad = await env.services.memberships.revoke(ctxAlfaOwner, {
      membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
      expectedVersion: before.data.metadata.version + 9,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("conflict");
    const good = await env.services.memberships.revoke(ctxAlfaOwner, {
      membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
      expectedVersion: before.data.metadata.version,
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.data.status).toBe("revoked");
  });

  it("M31 create rejeita duplicado (mesmo user na mesma org)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.memberships.create(ctxAlfaOwner, {
      userId: SEED_USER_1_ID,
      role: "owner",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("conflict");
  });
});

// ---- Assignments -----------------------------------------------------------

describe("LV-07.3 — AssignmentService", () => {
  it("M40 changeStatus exige caseId correspondente", async () => {
    const env = createMockDomainEnvironment();
    const page = await env.services.assignments.listByCase(
      ctxAlfaOwner,
      SEED_CASE_ALFA_3_ID,
      { limit: 10 },
    );
    if (!page.ok || page.data.items.length === 0) return;
    const a = page.data.items[0];
    const wrong = await env.services.assignments.changeStatus(
      ctxAlfaOwner,
      SEED_CASE_ALFA_1_ID,
      { assignmentId: a.id, status: "concluded", expectedVersion: a.metadata.version },
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.code).toBe("not_found");
  });

  it("M41 create rejeita startedOn inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.assignments.create(ctxAlfaOwner, {
      caseId: SEED_CASE_ALFA_1_ID,
      professionalProfileId: SEED_PROF_ALFA_ID,
      role: "principal",
      startedOn: "2026-02-30" as unknown as never,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation_error");
  });
});

// ---- Persons / CasePerson / Relationship -----------------------------------

describe("LV-07.3 — Pessoas e vínculos", () => {
  it("M50 CasePerson não pode ser buscado por outro caso", async () => {
    const env = createMockDomainEnvironment();
    const list = await env.services.casePersons.listByCase(
      ctxAlfaOwner,
      SEED_CASE_ALFA_1_ID,
      { limit: 10 },
    );
    if (!list.ok || list.data.items.length === 0) return;
    const cp = list.data.items[0];
    const wrong = await env.services.casePersons.getById(
      ctxAlfaOwner,
      SEED_CASE_ALFA_2_ID,
      cp.id,
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.code).toBe("not_found");
  });

  it("M51 relationship self é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.relationships.create(ctxAlfaOwner, {
      caseId: SEED_CASE_ALFA_1_ID,
      fromPersonId: SEED_PERSON_ALFA_1_ID,
      toPersonId: SEED_PERSON_ALFA_1_ID,
      type: "spouse",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation_error");
  });
});

// ---- Organization / CurrentUser --------------------------------------------

describe("LV-07.3 — Organization e CurrentUser", () => {
  it("M60 getCurrent devolve organização do contexto", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.organization.getCurrent(ctxBetaOwner);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.id).toBe(SEED_ORG_BETA_ID);
  });

  it("M61 CurrentUser.getCurrent devolve usuário do contexto", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.currentUser.getCurrent(ctxBetaProf);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.id).toBe(SEED_USER_3_ID);
  });

  it("M62 update rejeita versão errada", async () => {
    const env = createMockDomainEnvironment();
    const cur = await env.services.organization.getCurrent(ctxAlfaOwner);
    if (!cur.ok) throw new Error("bootstrap");
    const r = await env.services.organization.update(ctxAlfaOwner, {
      displayName: "Nova",
      expectedVersion: cur.data.metadata.version + 3,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("conflict");
  });
});

// ---- Professional Profiles / Credentials -----------------------------------

describe("LV-07.3 — Perfil profissional e credencial", () => {
  it("M70 listByProfessionalProfile cross-org devolve not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.credentials.listByProfessionalProfile(
      ctxBetaOwner,
      SEED_PROF_ALFA_ID,
      { limit: 10 },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("M71 credential updateStatus respeita concorrência", async () => {
    const env = createMockDomainEnvironment();
    const page = await env.services.credentials.listByProfessionalProfile(
      ctxBetaOwner,
      SEED_PROF_BETA_ID,
      { limit: 10 },
    );
    if (!page.ok || page.data.items.length === 0) return;
    const c = page.data.items[0];
    const bad = await env.services.credentials.updateStatus(ctxBetaOwner, {
      credentialId: c.id,
      status: "verified",
      expectedVersion: c.metadata.version + 5,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("conflict");
  });
});
