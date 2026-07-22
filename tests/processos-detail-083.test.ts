/**
 * LV-08.3 — testes do resumo e checklist de prontidão de Processo.
 * LV-08.3.1 — testes adicionais de auditoria da rota, isCaseId,
 * carregamento paralelo e permissão real de papel `leitura`.
 *
 * Somente funções puras e superfície pública dos serviços do domínio.
 * Não renderiza React, não usa storage.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMockDomainEnvironment } from "../src/domain/mocks";
import {
  SEED_ASSIGN_ALFA_1_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_BETA_1_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_USER_3_ID,
} from "../src/domain/mocks/seed";
import { isActionAllowedForRole } from "../src/domain/mocks/permission-mock";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceError } from "../src/domain/services/result";
import { CASE_READINESS_ISSUES } from "../src/domain/services/case-service";
import type { Case } from "../src/domain/core/case";
import { isCaseId } from "../src/domain/core/ids";
import {
  CASE_READINESS_DESCRIPTIONS_PT,
  CASE_READINESS_LABELS_PT,
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
  CONFLICT_CHECK_LABELS_PT,
  DEADLINE_STATUS_LABELS_PT,
  OBJECT_DEFINED_LABELS_PT,
  buildCaseChecklistUpdateInput,
  caseToChecklistFormValues,
  getCaseReadinessProgress,
  mapCaseDetailError,
  type CaseChecklistUpdateInput,
} from "../src/features/processos/process-detail-model";

const DEMO_CONTEXT: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});

function unwrap<T>(r: { ok: true; data: T } | { ok: false; error: ServiceError }): T {
  if (!r.ok) throw new Error(`unexpected error: ${r.error.code}/${r.error.message}`);
  return r.data;
}

describe("LV-08.3 · rótulos e descrições", () => {
  it("cobre todos os itens de prontidão com rótulo em português", () => {
    for (const key of CASE_READINESS_ISSUES) {
      expect(typeof CASE_READINESS_LABELS_PT[key]).toBe("string");
      expect(CASE_READINESS_LABELS_PT[key].length).toBeGreaterThan(0);
    }
  });
  it("cobre todos os itens com descrição pública", () => {
    for (const key of CASE_READINESS_ISSUES) {
      expect(typeof CASE_READINESS_DESCRIPTIONS_PT[key]).toBe("string");
      expect(CASE_READINESS_DESCRIPTIONS_PT[key].length).toBeGreaterThan(0);
    }
  });
  it("expõe rótulos oficiais para prazo, conflito e objeto", () => {
    expect(DEADLINE_STATUS_LABELS_PT.not_reviewed).toBe("Não revisado");
    expect(DEADLINE_STATUS_LABELS_PT.extended).toBe("Prazo prorrogado");
    expect(DEADLINE_STATUS_LABELS_PT.expired).toBe("Prazo expirado");
    expect(CONFLICT_CHECK_LABELS_PT.no_conflict).toBe("Sem conflito identificado");
    expect(CONFLICT_CHECK_LABELS_PT.conflict_detected).toBe("Conflito identificado");
    expect(OBJECT_DEFINED_LABELS_PT.true).toBe("Definido");
    expect(OBJECT_DEFINED_LABELS_PT.false).toBe("A definir");
  });
  it("reaproveita os rótulos de status e confidencialidade da listagem", () => {
    expect(CASE_STATUS_LABELS_PT.draft).toBe("Rascunho");
    expect(CONFIDENTIALITY_LABELS_PT.standard.length).toBeGreaterThan(0);
  });
});

describe("LV-08.3 · progresso do checklist", () => {
  it("Alfa 1 (rascunho, incompleto) → 4 pendências, 1 concluído", async () => {
    const env = createMockDomainEnvironment();
    const view = unwrap(
      await env.services.cases.getReadiness(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const p = getCaseReadinessProgress(view);
    expect(p.total).toBe(5);
    expect(p.pending).toBe(4);
    expect(p.complete).toBe(1);
    expect(p.isReady).toBe(false);
    const set = new Set(view.issues);
    expect(set.has("professionalRoleDefined")).toBe(true);
    expect(set.has("objectDefined")).toBe(true);
    expect(set.has("deadlineReviewed")).toBe(true);
    expect(set.has("conflictOfInterestReviewed")).toBe(true);
    expect(set.has("confidentialityReviewed")).toBe(false);
  });
  it("Alfa 2 (ativo, completo) → 0 pendências, checklist pronto", async () => {
    const env = createMockDomainEnvironment();
    const view = unwrap(
      await env.services.cases.getReadiness(DEMO_CONTEXT, SEED_CASE_ALFA_2_ID),
    );
    const p = getCaseReadinessProgress(view);
    expect(p.pending).toBe(0);
    expect(p.complete).toBe(5);
    expect(p.isReady).toBe(true);
    expect(view.issues).toEqual([]);
  });
});

describe("LV-08.3 · form values e input restrito", () => {
  it("caseToChecklistFormValues reflete os três campos editáveis", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const v = caseToChecklistFormValues(c);
    expect(v).toEqual({
      objectDefined: false,
      deadlineStatus: "not_reviewed",
      conflictCheck: "not_reviewed",
    });
  });

  it("buildCaseChecklistUpdateInput → null quando nada mudou", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const v = caseToChecklistFormValues(c);
    expect(buildCaseChecklistUpdateInput(c, v)).toBeNull();
  });

  it("inclui apenas campos alterados + expectedVersion", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input = buildCaseChecklistUpdateInput(c, {
      objectDefined: true,
      deadlineStatus: c.deadlineStatus,
      conflictCheck: c.conflictCheck,
    });
    expect(input).toEqual({ objectDefined: true, expectedVersion: c.metadata.version });
  });

  it("nunca expõe id/organizationId/title/status/confidentiality/metadata", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input = buildCaseChecklistUpdateInput(c, {
      objectDefined: true,
      deadlineStatus: "reviewed",
      conflictCheck: "no_conflict",
    });
    expect(input).not.toBeNull();
    const keys = new Set(Object.keys(input!));
    for (const forbidden of [
      "id",
      "organizationId",
      "reference",
      "title",
      "status",
      "confidentiality",
      "metadata",
    ]) {
      expect(keys.has(forbidden)).toBe(false);
    }
    for (const allowed of ["objectDefined", "deadlineStatus", "conflictCheck", "expectedVersion"]) {
      expect(keys.has(allowed)).toBe(true);
    }
  });

  it("aceita todos os três campos quando todos mudam", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input = buildCaseChecklistUpdateInput(c, {
      objectDefined: true,
      deadlineStatus: "reviewed",
      conflictCheck: "no_conflict",
    });
    expect(input).toEqual({
      objectDefined: true,
      deadlineStatus: "reviewed",
      conflictCheck: "no_conflict",
      expectedVersion: c.metadata.version,
    });
  });
});

describe("LV-08.3 · mapCaseDetailError", () => {
  const cases: ReadonlyArray<[ServiceError["code"], string]> = [
    ["not_found", "not_found"],
    ["conflict", "conflict"],
    ["unauthorized", "unauthorized"],
    ["forbidden", "forbidden"],
    ["offline", "offline"],
    ["unavailable", "unavailable"],
    ["validation_error", "validation"],
    ["internal_error", "generic"],
  ];
  for (const [code, kind] of cases) {
    it(`código ${code} → kind ${kind}`, () => {
      const secret = "SEGREDOxyz123";
      const out = mapCaseDetailError({ code, message: secret } as ServiceError);
      expect(out.kind).toBe(kind as never);
      expect(typeof out.message).toBe("string");
      expect(out.message.length).toBeGreaterThan(0);
      expect(out.message).not.toContain(secret); // não vaza `message` interna
    });
  }
});

describe("LV-08.3 · atualização e concorrência", () => {
  it("atualização promove versão e recalcula checklist", async () => {
    const env = createMockDomainEnvironment();
    const before = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input = buildCaseChecklistUpdateInput(before, {
      objectDefined: true,
      deadlineStatus: "reviewed",
      conflictCheck: "no_conflict",
    })!;
    const updated = unwrap(
      await env.services.cases.update(DEMO_CONTEXT, before.id, input),
    );
    expect(updated.metadata.version).toBe(before.metadata.version + 1);
    expect(updated.objectDefined).toBe(true);
    expect(updated.deadlineStatus).toBe("reviewed");
    expect(updated.conflictCheck).toBe("no_conflict");
    const view = unwrap(
      await env.services.cases.getReadiness(DEMO_CONTEXT, before.id),
    );
    // Sem assignment ativo, permanece 1 pendência (professionalRoleDefined).
    expect(view.issues).toEqual(["professionalRoleDefined"]);
  });

  it("segunda atualização com versão antiga → conflict", async () => {
    const env = createMockDomainEnvironment();
    const original = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input: CaseChecklistUpdateInput = {
      objectDefined: true,
      expectedVersion: original.metadata.version,
    };
    unwrap(await env.services.cases.update(DEMO_CONTEXT, original.id, input));
    const second = await env.services.cases.update(DEMO_CONTEXT, original.id, {
      objectDefined: false,
      expectedVersion: original.metadata.version,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe("conflict");
    }
    // Nenhum efeito colateral em campos não incluídos no input.
    const after = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, original.id),
    );
    expect(after.deadlineStatus).toBe(original.deadlineStatus);
    expect(after.conflictCheck).toBe(original.conflictCheck);
  });

  it("caso de outra organização → not_found no escopo Alfa", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_BETA_1_ID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
    const r2 = await env.services.cases.getReadiness(
      DEMO_CONTEXT,
      SEED_CASE_BETA_1_ID,
    );
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe("not_found");
  });
});

describe("LV-08.3 · permissões", () => {
  it("papel proprietario permite case.update", () => {
    expect(isActionAllowedForRole("case.update", "proprietario")).toBe(true);
  });
  it("papel leitura bloqueia case.update", () => {
    expect(isActionAllowedForRole("case.update", "leitura")).toBe(false);
  });
  it("papel leitura mantém leitura de case.read", () => {
    expect(isActionAllowedForRole("case.read", "leitura")).toBe(true);
  });
  it("evaluate real via serviço concorda com a política pura", async () => {
    const env = createMockDomainEnvironment();
    const decision = unwrap(
      await env.services.permissions.evaluate(DEMO_CONTEXT, {
        action: "case.update",
        caseId: SEED_CASE_ALFA_1_ID,
      }),
    );
    expect(decision.allowed).toBe(true);
  });
});

describe("LV-08.3 · imutabilidade e neutralidade", () => {
  it("Case retornado por getById é uma cópia (mutação local não afeta o store)", async () => {
    const env = createMockDomainEnvironment();
    const c: Case = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    // mutação local:
    (c as { title: string }).title = "hackeado";
    const again = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    expect(again.title).not.toBe("hackeado");
  });
  it("descrições e rótulos não contêm nomes reais de partes ou PII", () => {
    const joined =
      Object.values(CASE_READINESS_LABELS_PT).join(" · ") +
      " · " +
      Object.values(CASE_READINESS_DESCRIPTIONS_PT).join(" · ");
    for (const forbidden of ["Silva", "João", "Maria", "CPF", "@", "555"]) {
      expect(joined.includes(forbidden)).toBe(false);
    }
  });
});

// ============================================================================
// LV-08.3.1 — testes adicionais
// ============================================================================

const ROUTE_PATH = resolve(
  __dirname,
  "..",
  "src",
  "routes",
  "app.processos.$id.index.tsx",
);

/**
 * Remove comentários de linha/bloco e normaliza whitespace do fonte para
 * evitar falsos positivos por comentários e depender da formatação exata.
 */
function readRouteSourceStripped(): string {
  const raw = readFileSync(ROUTE_PATH, "utf-8");
  const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, " ");
  const noLine = noBlock.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return noLine.replace(/\s+/g, " ");
}

describe("LV-08.3.1 · isCaseId", () => {
  it("aceita SEED_CASE_ALFA_1_ID", () => {
    expect(isCaseId(SEED_CASE_ALFA_1_ID)).toBe(true);
  });
  it("rejeita uma string comum", () => {
    expect(isCaseId("qualquer-coisa")).toBe(false);
    expect(isCaseId("")).toBe(false);
    expect(isCaseId("123")).toBe(false);
  });
});

describe("LV-08.3.1 · view.issues respeita a ordem oficial", () => {
  it("a ordem relativa de view.issues segue CASE_READINESS_ISSUES", async () => {
    const env = createMockDomainEnvironment();
    const view = unwrap(
      await env.services.cases.getReadiness(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const orderIndex = new Map<string, number>(
      CASE_READINESS_ISSUES.map((k, i) => [k, i] as const),
    );
    const positions = view.issues.map((i) => orderIndex.get(i) ?? -1);
    for (const p of positions) expect(p).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
    }
  });
});

describe("LV-08.3.1 · builder de patch restrito", () => {
  it("altera somente deadlineStatus", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input = buildCaseChecklistUpdateInput(c, {
      objectDefined: c.objectDefined,
      deadlineStatus: "reviewed",
      conflictCheck: c.conflictCheck,
    });
    expect(input).toEqual({
      deadlineStatus: "reviewed",
      expectedVersion: c.metadata.version,
    });
  });
  it("altera somente conflictCheck", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const input = buildCaseChecklistUpdateInput(c, {
      objectDefined: c.objectDefined,
      deadlineStatus: c.deadlineStatus,
      conflictCheck: "no_conflict",
    });
    expect(input).toEqual({
      conflictCheck: "no_conflict",
      expectedVersion: c.metadata.version,
    });
  });
});

describe("LV-08.3.1 · efeitos colaterais do checklist", () => {
  it("update do checklist não cria assignment novo", async () => {
    const env = createMockDomainEnvironment();
    const before = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    const beforeAssignments = unwrap(
      await env.services.assignments.listByCase(
        DEMO_CONTEXT,
        SEED_CASE_ALFA_1_ID,
        { page: { limit: 50 } },
      ),
    );
    const input = buildCaseChecklistUpdateInput(before, {
      objectDefined: true,
      deadlineStatus: "reviewed",
      conflictCheck: "no_conflict",
    })!;
    unwrap(await env.services.cases.update(DEMO_CONTEXT, before.id, input));
    const afterAssignments = unwrap(
      await env.services.assignments.listByCase(
        DEMO_CONTEXT,
        SEED_CASE_ALFA_1_ID,
        { page: { limit: 50 } },
      ),
    );
    expect(afterAssignments.items.length).toBe(beforeAssignments.items.length);
  });

  it("conflito por versão antiga mantém TODO o snapshot inalterado", async () => {
    const env = createMockDomainEnvironment();
    const original = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, SEED_CASE_ALFA_1_ID),
    );
    // Primeira atualização válida
    const firstInput: CaseChecklistUpdateInput = {
      objectDefined: true,
      expectedVersion: original.metadata.version,
    };
    const afterFirst = unwrap(
      await env.services.cases.update(DEMO_CONTEXT, original.id, firstInput),
    );
    const snapshot = { ...afterFirst };
    // Segunda tentativa com versão obsoleta
    const second = await env.services.cases.update(DEMO_CONTEXT, original.id, {
      deadlineStatus: "reviewed",
      conflictCheck: "no_conflict",
      objectDefined: false,
      expectedVersion: original.metadata.version,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("conflict");
    // Snapshot inteiro do processo permanece igual ao que foi retornado pela
    // primeira atualização (nenhum campo do input rejeitado vazou).
    const after = unwrap(
      await env.services.cases.getById(DEMO_CONTEXT, original.id),
    );
    expect(after.reference).toBe(snapshot.reference);
    expect(after.title).toBe(snapshot.title);
    expect(after.status).toBe(snapshot.status);
    expect(after.confidentiality).toBe(snapshot.confidentiality);
    expect(after.objectDefined).toBe(snapshot.objectDefined);
    expect(after.deadlineStatus).toBe(snapshot.deadlineStatus);
    expect(after.conflictCheck).toBe(snapshot.conflictCheck);
    expect(after.metadata.version).toBe(snapshot.metadata.version);
  });
});

describe("LV-08.3.1 · permissão real com papel `leitura`", () => {
  it("evaluate retorna allowed:false para membership de leitura válida", async () => {
    const env = createMockDomainEnvironment();
    // Cria uma membership real de leitura via API pública, sem tocar no store.
    const created = unwrap(
      await env.services.memberships.create(DEMO_CONTEXT, {
        userId: SEED_USER_3_ID,
        role: "leitura",
      }),
    );
    expect(created.role).toBe("leitura");
    expect(created.status).toBe("active");
    const readerContext: ServiceContext = Object.freeze({
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_3_ID,
      membershipId: created.id,
      role: "leitura",
    });
    const decision = unwrap(
      await env.services.permissions.evaluate(readerContext, {
        action: "case.update",
        caseId: SEED_CASE_ALFA_1_ID,
      }),
    );
    expect(decision.allowed).toBe(false);
    // Confere que leitura ainda pode ler o processo.
    const readDecision = unwrap(
      await env.services.permissions.evaluate(readerContext, {
        action: "case.read",
        caseId: SEED_CASE_ALFA_1_ID,
      }),
    );
    expect(readDecision.allowed).toBe(true);
  });
});

describe("LV-08.3.1 · auditoria da rota app.processos.$id.index.tsx", () => {
  const src = readRouteSourceStripped();

  it("não contém `loader:`", () => {
    expect(/\bloader\s*:/.test(src)).toBe(false);
  });
  it("não contém `Route.useLoaderData`", () => {
    expect(src.includes("Route.useLoaderData")).toBe(false);
    expect(src.includes("useLoaderData")).toBe(false);
  });
  it("valida `params.id` com `isCaseId`", () => {
    expect(src.includes("Route.useParams()")).toBe(true);
    expect(/isCaseId\s*\(\s*rawId\s*\)/.test(src)).toBe(true);
  });
  it("possui as três consultas dentro do mesmo Promise.all", () => {
    const match = src.match(/Promise\.all\s*\(\s*\[([\s\S]*?)\]\s*\)/);
    expect(match).not.toBeNull();
    const inside = match![1]!;
    expect(inside.includes("cases.getById")).toBe(true);
    expect(inside.includes("cases.getReadiness")).toBe(true);
    expect(inside.includes("permissions.evaluate")).toBe(true);
  });
  it("trata explicitamente `permissionResult.ok === false`", () => {
    expect(/!\s*permissionResult\.ok|permissionResult\.ok\s*===\s*false/.test(src)).toBe(true);
    // e não converte silenciosamente em somente-leitura
    expect(/canEdit\s*=\s*false\s*;\s*setState/.test(src)).toBe(false);
  });
  it("não importa `@/lib/mock/data`", () => {
    expect(src.includes("@/lib/mock/data")).toBe(false);
  });
  it("não importa `@/lib/mock/types`", () => {
    expect(src.includes("@/lib/mock/types")).toBe(false);
  });
  it("continua usando `useMockDomain`", () => {
    expect(src.includes("useMockDomain(")).toBe(true);
    expect(src.includes('from "@/components/app/MockDomainProvider"')).toBe(true);
  });
  it("continua usando `cases.update`", () => {
    expect(src.includes("environment.services.cases.update")).toBe(true);
  });
  it("não usa `notFound()` nem `throw notFound`", () => {
    expect(src.includes("throw notFound")).toBe(false);
    expect(/from\s+"@tanstack\/react-router"[^;]*notFound/.test(src)).toBe(false);
  });
});

// Uso da constante para evitar "não utilizado" caso o import fique elegível
void SEED_ASSIGN_ALFA_1_ID;
void SEED_MEM_ALFA_OWNER_ID;
void SEED_USER_1_ID;

