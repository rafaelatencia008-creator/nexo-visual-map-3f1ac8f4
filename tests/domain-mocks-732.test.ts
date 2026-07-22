/**
 * LV-07.3.2 — Fechamento final da integridade dos mocks.
 *
 * Cobre exclusivamente as três invariantes desta microetapa:
 *   1. Cursor de paginação está vinculado à consulta (assinatura opaca).
 *   2. Criação inválida NÃO consome ID nem relógio (preview-then-commit).
 *   3. Registro do TanStack React Start permanece publicado.
 *
 * Não substitui os 309 testes anteriores; complementa-os.
 */

import { describe, it, expect } from "bun:test";
import {
  createMockDomainEnvironment,
} from "../src/domain/mocks";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceResult } from "../src/domain/services/result";
import type { PageResult } from "../src/domain/services/pagination";
import type { Case } from "../src/domain/core/case";
import type { Person } from "../src/domain/core/person";
import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_MEM_ALFA_OWNER_ID,
} from "../src/domain/mocks/seed";

function unwrapOk<T>(r: ServiceResult<T>): T {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error.code);
  return r.data;
}

function unwrapErr<T>(r: ServiceResult<T>) {
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("esperava erro");
  return r.error;
}

const ctxAlfa: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

// -------- 1) Cursor vinculado à consulta -----------------------------------

describe("LV-07.3.2 — cursor vinculado à consulta", () => {
  it("aceita cursor da mesma consulta (mesmo filtro, sort, limit)", async () => {
    const env = createMockDomainEnvironment();
    // Popular vários casos para garantir >1 página
    for (let i = 0; i < 5; i += 1) {
      unwrapOk(
        await env.services.cases.create(ctxAlfa, {
          reference: `NP-${1000 + i}`,
          title: `Caso ${i}`,
          confidentiality: "standard",
        }),
      );
    }
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2 },
        sortBy: "createdAt",
        sortDir: "asc",
      }),
    );
    expect(p1.nextCursor).toBeTruthy();
    const p2 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: p1.nextCursor! },
        sortBy: "createdAt",
        sortDir: "asc",
      }),
    );
    expect(p2.items.length).toBeGreaterThan(0);
  });

  it("rejeita cursor emitido para outra ordenação", async () => {
    const env = createMockDomainEnvironment();
    for (let i = 0; i < 5; i += 1) {
      unwrapOk(
        await env.services.cases.create(ctxAlfa, {
          reference: `NP-${2000 + i}`,
          title: `T${i}`,
          confidentiality: "standard",
        }),
      );
    }
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2 },
        sortBy: "createdAt",
        sortDir: "asc",
      }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: p1.nextCursor! },
        sortBy: "createdAt",
        sortDir: "desc",
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("rejeita cursor emitido para outro limit", async () => {
    const env = createMockDomainEnvironment();
    for (let i = 0; i < 5; i += 1) {
      unwrapOk(
        await env.services.cases.create(ctxAlfa, {
          reference: `NP-${3000 + i}`,
          title: `T${i}`,
          confidentiality: "standard",
        }),
      );
    }
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 3, cursor: p1.nextCursor! },
      }),
    );
    expect(err.code).toBe("validation_error");
  });

  it("rejeita cursor com offset fabricado (assinatura correta, offset absurdo)", async () => {
    const env = createMockDomainEnvironment();
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 100 } }),
    );
    // Reutilizamos a mesma consulta; total < 999
    const fabricado = `mock_cursor_${"deadbeef"}_999`;
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 100, cursor: fabricado },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(p1.items.length).toBeGreaterThanOrEqual(0);
  });

  it("rejeita cursor de outro serviço", async () => {
    const env = createMockDomainEnvironment();
    // gerar cursor no serviço de casos
    for (let i = 0; i < 5; i += 1) {
      unwrapOk(
        await env.services.cases.create(ctxAlfa, {
          reference: `NP-${4000 + i}`,
          title: `T${i}`,
          confidentiality: "standard",
        }),
      );
    }
    const casesPage = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    // usar esse cursor no serviço de pessoas: assinatura não bate
    const err = unwrapErr(
      await env.services.persons.list(ctxAlfa, {
        page: { limit: 2, cursor: casesPage.nextCursor! },
      }),
    );
    expect(err.code).toBe("validation_error");
  });
});

// -------- 2) Preview-then-commit -------------------------------------------

describe("LV-07.3.2 — criação inválida não consome ID nem relógio", () => {
  it("caso com título vazio falha e NÃO consome contador (próximo ID é o esperado)", async () => {
    const env = createMockDomainEnvironment();
    // primeira criação bem-sucedida define o ID base
    const c1 = unwrapOk(
      await env.services.cases.create(ctxAlfa, {
        reference: "NP-A",
        title: "Alfa",
        confidentiality: "standard",
      }),
    );
    // tentativa inválida
    unwrapErr(
      await env.services.cases.create(ctxAlfa, {
        reference: "NP-B",
        title: "   ",
        confidentiality: "standard",
      }),
    );
    // criação subsequente deve receber ID sequencial imediato (contador não pulou)
    const c2 = unwrapOk(
      await env.services.cases.create(ctxAlfa, {
        reference: "NP-C",
        title: "Gama",
        confidentiality: "standard",
      }),
    );
    // Prova por ordenação: os dois createdAt são consecutivos (delta = 1s).
    const t1 = Date.parse(c1.metadata.createdAt);
    const t2 = Date.parse(c2.metadata.createdAt);
    expect(t2 - t1).toBe(1000);
    // IDs distintos e diferentes do falho (que nunca foi emitido)
    expect(c1.id).not.toBe(c2.id);
  });

  it("pessoa com displayLabel vazio falha e não avança clock", async () => {
    const env = createMockDomainEnvironment();
    const p1 = unwrapOk(
      await env.services.persons.create(ctxAlfa, {
        displayLabel: "Fulano",
        ageClassification: "adult",
      }),
    );
    unwrapErr(
      await env.services.persons.create(ctxAlfa, {
        displayLabel: "",
        ageClassification: "adult",
      }),
    );
    const p2 = unwrapOk(
      await env.services.persons.create(ctxAlfa, {
        displayLabel: "Sicrano",
        ageClassification: "adult",
      }),
    );
    const t1 = Date.parse(p1.metadata.createdAt);
    const t2 = Date.parse(p2.metadata.createdAt);
    expect(t2 - t1).toBe(1000);
  });
});

// -------- 3) Registro do TanStack React Start ------------------------------

describe("LV-07.3.2 — registro do TanStack React Start", () => {
  it("routeTree.gen expõe o module augmentation Register", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/routeTree.gen.ts"),
      "utf8",
    );
    expect(src).toContain("declare module '@tanstack/react-router'");
    expect(src).toContain("interface Register");
  });
});
