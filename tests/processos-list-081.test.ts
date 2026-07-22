/**
 * LV-08.1 — testes da lista funcional de processos.
 *
 * Só toca funções puras (`process-list-model`) e a superfície pública dos
 * serviços do domínio oficial. Não renderiza React, não usa storage.
 */

import { describe, it, expect } from "bun:test";
import {
  createMockDomainEnvironment,
} from "../src/domain/mocks";
import type { ServiceContext } from "../src/domain/services/context";
import {
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_USER_3_ID,
} from "../src/domain/mocks/seed";
import {
  buildCaseListRequest,
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
  DEFAULT_SORT_ID,
  PROCESS_SORT_OPTIONS,
  mapServiceErrorToMessage,
  summarizeReadiness,
} from "../src/features/processos/process-list-model";
import {
  CASE_STATUSES,
  CONFIDENTIALITY_LEVELS,
  type Case,
} from "../src/domain/core/case";
import type { ServiceError, ServiceResult } from "../src/domain/services/result";
import type { PageResult } from "../src/domain/services/pagination";

const ALFA_CTX: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

const BETA_CTX: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};

function unwrap<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error(`Erro inesperado: ${r.error.code}/${r.error.message}`);
  return r.data;
}

function baseFilter() {
  return {
    search: "",
    status: "all" as const,
    confidentiality: "all" as const,
    sortId: DEFAULT_SORT_ID,
  };
}

describe("LV-08.1 — buildCaseListRequest (função pura)", () => {
  it("15) construção não inclui filtros vazios", () => {
    const req = buildCaseListRequest(baseFilter());
    expect(req.filter).toBeUndefined();
    expect(req.page.limit).toBeGreaterThan(0);
    expect(req.sortBy).toBe("updatedAt");
    expect(req.sortDir).toBe("desc");
  });

  it("apenas busca preenchida vira filter.search sem trim no campo original", () => {
    const req = buildCaseListRequest({ ...baseFilter(), search: "  alfa  " });
    expect(req.filter?.search).toBe("alfa");
    expect(req.filter?.statuses).toBeUndefined();
    expect(req.filter?.confidentiality).toBeUndefined();
  });

  it("apenas status vira filter.statuses = [status]", () => {
    const req = buildCaseListRequest({ ...baseFilter(), status: "active" });
    expect(req.filter?.statuses).toEqual(["active"]);
  });

  it("apenas confidencialidade vira filter.confidentiality = [nivel]", () => {
    const req = buildCaseListRequest({
      ...baseFilter(),
      confidentiality: "high",
    });
    expect(req.filter?.confidentiality).toEqual(["high"]);
  });

  it("cursor é repassado sem interpretação (opacidade)", () => {
    const opaque = "mock_cursor_deadbeef_8";
    const req = buildCaseListRequest({ ...baseFilter(), cursor: opaque });
    expect(req.page.cursor).toBe(opaque);
  });

  it("cada sortId produz sortBy/sortDir declarados", () => {
    for (const o of PROCESS_SORT_OPTIONS) {
      const req = buildCaseListRequest({ ...baseFilter(), sortId: o.id });
      expect(req.sortBy).toBe(o.sortBy);
      expect(req.sortDir).toBe(o.sortDir);
    }
  });
});

describe("LV-08.1 — labels", () => {
  it("16) labels cobrem todos os CASE_STATUSES", () => {
    for (const s of CASE_STATUSES) {
      expect(typeof CASE_STATUS_LABELS_PT[s]).toBe("string");
      expect(CASE_STATUS_LABELS_PT[s].length).toBeGreaterThan(0);
    }
    expect(Object.keys(CASE_STATUS_LABELS_PT).length).toBe(CASE_STATUSES.length);
  });

  it("17) labels cobrem todos os CONFIDENTIALITY_LEVELS", () => {
    for (const c of CONFIDENTIALITY_LEVELS) {
      expect(typeof CONFIDENTIALITY_LABELS_PT[c]).toBe("string");
      expect(CONFIDENTIALITY_LABELS_PT[c].length).toBeGreaterThan(0);
    }
    expect(Object.keys(CONFIDENTIALITY_LABELS_PT).length).toBe(
      CONFIDENTIALITY_LEVELS.length,
    );
  });
});

describe("LV-08.1 — mapServiceErrorToMessage", () => {
  const cases: { err: ServiceError; forbidden: RegExp }[] = [
    { err: { code: "unauthorized", message: "invalid_context" }, forbidden: /invalid_context/ },
    { err: { code: "forbidden", message: "permission_denied" }, forbidden: /permission_denied/ },
    { err: { code: "offline", message: "offline" }, forbidden: /offline/ },
    { err: { code: "unavailable", message: "svc" }, forbidden: /svc/ },
    { err: { code: "internal_error", message: "boom" }, forbidden: /boom/ },
    { err: { code: "validation_error", message: "invalid_filter" }, forbidden: /invalid_filter/ },
  ];
  it("18) converte cada código em mensagem pública sem revelar dados internos", () => {
    for (const c of cases) {
      const msg = mapServiceErrorToMessage(c.err);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
      // Nenhuma mensagem interna vaza no texto público.
      expect(c.forbidden.test(msg)).toBe(false);
      // Textos são em português.
      expect(/[A-Z]/.test(msg)).toBe(true);
    }
  });
});

describe("LV-08.1 — summarizeReadiness", () => {
  const base: Case = {
    id: "case_test" as unknown as Case["id"],
    organizationId: SEED_ORG_ALFA_ID,
    reference: "R",
    title: "T",
    status: "draft",
    confidentiality: "standard",
    conflictCheck: "no_conflict",
    objectDefined: true,
    deadlineStatus: "reviewed",
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z" as Case["metadata"]["createdAt"],
      updatedAt: "2026-01-01T00:00:00.000Z" as Case["metadata"]["updatedAt"],
      version: 1,
    },
  };
  it("ready quando os três atributos exigidos estão consolidados", () => {
    expect(summarizeReadiness(base)).toBe("ready");
  });
  it("review quando qualquer um dos três não foi consolidado", () => {
    expect(summarizeReadiness({ ...base, objectDefined: false })).toBe("review");
    expect(summarizeReadiness({ ...base, deadlineStatus: "not_reviewed" })).toBe(
      "review",
    );
    expect(summarizeReadiness({ ...base, conflictCheck: "not_reviewed" })).toBe(
      "review",
    );
  });
});

describe("LV-08.1 — integração cases.list (isolamento organizacional)", () => {
  it("1) contexto Alfa lista apenas casos da organização Alfa", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({ ...baseFilter(), limit: 100 });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBeGreaterThan(0);
    for (const c of page.items) {
      expect(c.organizationId).toBe(SEED_ORG_ALFA_ID);
    }
  });

  it("2) casos da organização Beta não aparecem para Alfa", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({ ...baseFilter(), limit: 100 });
    const alfa = unwrap(await env.services.cases.list(ALFA_CTX, req));
    const beta = unwrap(await env.services.cases.list(BETA_CTX, req));
    for (const c of alfa.items) {
      expect(c.organizationId).not.toBe(SEED_ORG_BETA_ID);
    }
    // E o inverso: Beta também não vê Alfa.
    for (const c of beta.items) {
      expect(c.organizationId).not.toBe(SEED_ORG_ALFA_ID);
    }
  });

  it("3) papel `leitura` pode listar casos", async () => {
    const env = createMockDomainEnvironment();
    // Cria uma membership `leitura` sobre USER_3 na Alfa.
    const created = unwrap(
      await env.services.memberships.create(ALFA_CTX, {
        userId: SEED_USER_3_ID,
        role: "leitura",
      }),
    );
    const readerCtx: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_3_ID,
      membershipId: created.id,
      role: "leitura",
    };
    const page = unwrap(
      await env.services.cases.list(
        readerCtx,
        buildCaseListRequest({ ...baseFilter(), limit: 100 }),
      ),
    );
    expect(page.items.length).toBeGreaterThan(0);
  });
});

describe("LV-08.1 — integração cases.list (busca e filtros)", () => {
  it("4) busca por referência", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      search: "REF-ALFA-002",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBe(1);
    expect(page.items[0]!.reference).toBe("REF-ALFA-002");
  });

  it("5) busca por título", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      search: "Demonstração Alfa 003",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBe(1);
    expect(page.items[0]!.reference).toBe("REF-ALFA-003");
  });

  it("6) filtro por status", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      status: "active",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBeGreaterThan(0);
    for (const c of page.items) expect(c.status).toBe("active");
  });

  it("7) filtro por confidencialidade", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      confidentiality: "high",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBeGreaterThan(0);
    for (const c of page.items) expect(c.confidentiality).toBe("high");
  });

  it("13) combinação de busca + status", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      search: "Alfa",
      status: "completed",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBeGreaterThan(0);
    for (const c of page.items) {
      expect(c.status).toBe("completed");
      expect(c.title.toLowerCase()).toContain("alfa");
    }
  });

  it("14) estado vazio por filtro (referência inexistente)", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      search: "REF-INEXISTENTE-XYZ",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    expect(page.items.length).toBe(0);
    expect(page.total).toBe(0);
    // No entanto, sem filtros a organização tem casos.
    const total = unwrap(
      await env.services.cases.list(
        ALFA_CTX,
        buildCaseListRequest({ ...baseFilter(), limit: 100 }),
      ),
    );
    expect(total.items.length).toBeGreaterThan(0);
  });
});

describe("LV-08.1 — integração cases.list (ordenação)", () => {
  it("8) ordenação por referência asc", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      sortId: "reference-asc",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    for (let i = 1; i < page.items.length; i += 1) {
      expect(page.items[i - 1]!.reference <= page.items[i]!.reference).toBe(true);
    }
  });

  it("9) ordenação por título asc", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      sortId: "title-asc",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    for (let i = 1; i < page.items.length; i += 1) {
      expect(page.items[i - 1]!.title <= page.items[i]!.title).toBe(true);
    }
  });

  it("10) ordenação por data (createdAt asc = mais antigos primeiro)", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      sortId: "created-asc",
      limit: 100,
    });
    const page = unwrap(await env.services.cases.list(ALFA_CTX, req));
    for (let i = 1; i < page.items.length; i += 1) {
      expect(
        page.items[i - 1]!.metadata.createdAt <= page.items[i]!.metadata.createdAt,
      ).toBe(true);
    }
  });
});

describe("LV-08.1 — paginação por cursor opaco", () => {
  it("11) primeira página com limite pequeno gera nextCursor quando há mais itens", async () => {
    const env = createMockDomainEnvironment();
    const req = buildCaseListRequest({
      ...baseFilter(),
      sortId: "reference-asc",
      limit: 1,
    });
    const page: PageResult<Case> = unwrap(
      await env.services.cases.list(ALFA_CTX, req),
    );
    expect(page.items.length).toBe(1);
    expect(typeof page.nextCursor).toBe("string");
    expect((page.total ?? 0) > 1).toBe(true);
  });

  it("12) o cursor é reenviado sem interpretação — retorna a próxima página coerente", async () => {
    const env = createMockDomainEnvironment();
    const first = unwrap(
      await env.services.cases.list(
        ALFA_CTX,
        buildCaseListRequest({
          ...baseFilter(),
          sortId: "reference-asc",
          limit: 1,
        }),
      ),
    );
    expect(first.nextCursor).toBeDefined();
    const second = unwrap(
      await env.services.cases.list(
        ALFA_CTX,
        buildCaseListRequest({
          ...baseFilter(),
          sortId: "reference-asc",
          limit: 1,
          cursor: first.nextCursor,
        }),
      ),
    );
    expect(second.items.length).toBe(1);
    expect(second.items[0]!.reference).not.toBe(first.items[0]!.reference);
  });
});
