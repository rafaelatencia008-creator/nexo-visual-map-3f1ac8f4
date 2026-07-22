/**
 * LV-08.2 — testes da criação funcional de processos.
 *
 * Só toca funções puras (`process-create-model`) e a superfície pública
 * do domínio oficial. Nada de React.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMockDomainEnvironment } from "../src/domain/mocks";
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
  buildCreateCaseInput,
  decideProcessCreateExit,
  mapCreateCaseError,
  type ProcessCreateFormValues,
} from "../src/features/processos/process-create-model";
import type { ServiceError, ServiceResult } from "../src/domain/services/result";
import type { Case } from "../src/domain/core/case";

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

function values(over: Partial<ProcessCreateFormValues> = {}): ProcessCreateFormValues {
  return {
    reference: "PROC-NEW-001",
    title: "Novo processo de teste",
    confidentiality: "standard",
    ...over,
  };
}

describe("LV-08.2 — buildCreateCaseInput (função pura)", () => {
  it("1) aplica trim à referência", () => {
    const input = buildCreateCaseInput(values({ reference: "  PROC-1  " }));
    expect(input.reference).toBe("PROC-1");
  });

  it("2) aplica trim ao título", () => {
    const input = buildCreateCaseInput(values({ title: "  Título X  " }));
    expect(input.title).toBe("Título X");
  });

  it("3) preserva a confidencialidade", () => {
    for (const level of ["standard", "restricted", "high"] as const) {
      const input = buildCreateCaseInput(values({ confidentiality: level }));
      expect(input.confidentiality).toBe(level);
    }
  });

  it("4) não retorna campos além dos três oficiais", () => {
    const input = buildCreateCaseInput(values());
    expect(Object.keys(input).sort()).toEqual(
      ["confidentiality", "reference", "title"].sort(),
    );
  });
});

describe("LV-08.2 — integração cases.create", () => {
  it("5) criação pertence à organização do contexto", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrap(
      await env.services.cases.create(ALFA_CTX, buildCreateCaseInput(values())),
    );
    expect(created.organizationId).toBe(SEED_ORG_ALFA_ID);
  });

  it("6) criação define status draft", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.create(ALFA_CTX, buildCreateCaseInput(values())),
    );
    expect(c.status).toBe("draft");
  });

  it("7) criação define conflictCheck not_reviewed", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.create(ALFA_CTX, buildCreateCaseInput(values())),
    );
    expect(c.conflictCheck).toBe("not_reviewed");
  });

  it("8) criação define objectDefined false", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.create(ALFA_CTX, buildCreateCaseInput(values())),
    );
    expect(c.objectDefined).toBe(false);
  });

  it("9) criação define deadlineStatus not_reviewed", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.create(ALFA_CTX, buildCreateCaseInput(values())),
    );
    expect(c.deadlineStatus).toBe("not_reviewed");
  });

  it("10) criação define metadata.version = 1", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.create(ALFA_CTX, buildCreateCaseInput(values())),
    );
    expect(c.metadata.version).toBe(1);
    expect(typeof c.metadata.createdAt).toBe("string");
    expect(typeof c.metadata.updatedAt).toBe("string");
  });

  it("11) processo criado aparece em cases.list no mesmo ambiente", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrap(
      await env.services.cases.create(
        ALFA_CTX,
        buildCreateCaseInput(values({ reference: "PROC-VISIBLE-01" })),
      ),
    );
    const page = unwrap(
      await env.services.cases.list(ALFA_CTX, {
        page: { limit: 100 },
        sortBy: "updatedAt",
        sortDir: "desc",
        filter: { search: "PROC-VISIBLE-01" },
      }),
    );
    expect(page.items.some((c) => c.id === created.id)).toBe(true);
  });

  it("12) processo criado em Alfa não aparece para Beta", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrap(
      await env.services.cases.create(
        ALFA_CTX,
        buildCreateCaseInput(values({ reference: "PROC-ONLY-ALFA" })),
      ),
    );
    const beta = unwrap(
      await env.services.cases.list(BETA_CTX, {
        page: { limit: 100 },
        sortBy: "updatedAt",
        sortDir: "desc",
      }),
    );
    expect(beta.items.some((c) => c.id === created.id)).toBe(false);
    for (const c of beta.items) {
      expect(c.organizationId).toBe(SEED_ORG_BETA_ID);
    }
  });

  it("13) a mesma referência pode existir em organizações diferentes", async () => {
    const env = createMockDomainEnvironment();
    const ref = "PROC-SHARED-REF";
    const a = await env.services.cases.create(
      ALFA_CTX,
      buildCreateCaseInput(values({ reference: ref })),
    );
    const b = await env.services.cases.create(
      BETA_CTX,
      buildCreateCaseInput(values({ reference: ref })),
    );
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("14) referência duplicada na mesma organização retorna conflict/duplicate_case_reference", async () => {
    const env = createMockDomainEnvironment();
    const ref = "PROC-DUP-001";
    unwrap(
      await env.services.cases.create(
        ALFA_CTX,
        buildCreateCaseInput(values({ reference: ref })),
      ),
    );
    const dup = await env.services.cases.create(
      ALFA_CTX,
      buildCreateCaseInput(values({ reference: ref })),
    );
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.error.code).toBe("conflict");
      expect(dup.error.message).toBe("duplicate_case_reference");
    }
  });

  it("15) referência formada só de espaços retorna erro no campo reference", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.create(ALFA_CTX, {
      reference: "   ",
      title: "Título válido",
      confidentiality: "standard",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("validation_error");
      const fe = "fieldErrors" in r.error ? r.error.fieldErrors : undefined;
      expect(fe?.reference).toBeDefined();
    }
  });

  it("16) título formado só de espaços retorna erro no campo title", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.create(ALFA_CTX, {
      reference: "PROC-OK",
      title: "   ",
      confidentiality: "standard",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("validation_error");
      const fe = "fieldErrors" in r.error ? r.error.fieldErrors : undefined;
      expect(fe?.title).toBeDefined();
    }
  });

  it("17) papel leitura recebe forbidden/permission_denied", async () => {
    const env = createMockDomainEnvironment();
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
    const r = await env.services.cases.create(
      readerCtx,
      buildCreateCaseInput(values({ reference: "PROC-DENIED-01" })),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("forbidden");
      expect(r.error.message).toBe("permission_denied");
    }
  });

  it("18) tentativa negada não altera o snapshot", async () => {
    const env = createMockDomainEnvironment();
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
    const before = env.snapshot().cases.length;
    const r = await env.services.cases.create(
      readerCtx,
      buildCreateCaseInput(values({ reference: "PROC-DENIED-02" })),
    );
    expect(r.ok).toBe(false);
    const after = env.snapshot().cases.length;
    expect(after).toBe(before);
  });
});

describe("LV-08.2 — mapCreateCaseError", () => {
  it("19) converte duplicidade em erro público do campo reference", () => {
    const pub = mapCreateCaseError({
      code: "conflict",
      message: "duplicate_case_reference",
    });
    expect(pub.fieldErrors?.reference).toBeDefined();
    expect(pub.fieldErrors?.reference).toMatch(/referência/i);
  });

  it("20) mensagens públicas não contêm código ou mensagem interna", () => {
    const errors: ServiceError[] = [
      { code: "conflict", message: "duplicate_case_reference" },
      {
        code: "validation_error",
        message: "invalid_case_input",
        fieldErrors: { reference: ["empty"], title: ["empty"] },
      },
      { code: "unauthorized", message: "invalid_context" },
      { code: "forbidden", message: "permission_denied" },
      { code: "offline", message: "offline" },
      { code: "unavailable", message: "svc" },
      { code: "internal_error", message: "boom" },
      { code: "not_found", message: "resource_not_found" },
    ];
    const forbiddenTokens = [
      "duplicate_case_reference",
      "invalid_case_input",
      "permission_denied",
      "invalid_context",
      "resource_not_found",
      "empty",
    ];
    for (const err of errors) {
      const pub = mapCreateCaseError(err);
      const all = [pub.message, ...Object.values(pub.fieldErrors ?? {})].join(
        " | ",
      );
      for (const token of forbiddenTokens) {
        expect(all.includes(token)).toBe(false);
      }
    }
  });

  it("21) validation_error com fieldErrors mapeia por campo", () => {
    const pub = mapCreateCaseError({
      code: "validation_error",
      message: "invalid_case_input",
      fieldErrors: { reference: ["empty"] },
    });
    expect(pub.fieldErrors?.reference).toMatch(/referência/i);
  });

  it("22) forbidden gera mensagem pública específica", () => {
    const pub = mapCreateCaseError({
      code: "forbidden",
      message: "permission_denied",
    });
    expect(pub.message).toMatch(/permissão/i);
  });
});

describe("LV-08.2 — auditoria da rota /app/processos/novo", () => {
  const src = readFileSync(
    resolve(process.cwd(), "src/routes/app.processos.novo.tsx"),
    "utf8",
  );

  it("23) não importa @/lib/mock/data", () => {
    expect(src.includes("@/lib/mock/data")).toBe(false);
  });

  it("24) não importa @/lib/mock/types", () => {
    expect(src.includes("@/lib/mock/types")).toBe(false);
  });

  it("25) utiliza useMockDomain e cases.create", () => {
    expect(src.includes("useMockDomain")).toBe(true);
    expect(src.includes("cases.create")).toBe(true);
  });
});

// Marca de compilação: garante que os tipos combinam sem drift.
void (null as unknown as Case);
