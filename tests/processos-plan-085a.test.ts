/**
 * LV-08.5A + LV-08.5A.1 — testes de fundação para Plano e Cronologia.
 */

import { describe, it, expect } from "bun:test";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_USER_3_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_BETA_2_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_ASSIGN_BETA_1_ID,
  SEED_PLAN_ALFA_1_ID,
  SEED_PLAN_ALFA_2_ID,
  SEED_PLAN_ALFA_3_ID,
  SEED_PLAN_BETA_1_ID,
  SEED_PLAN_BETA_2_ID,
  SEED_TL_ALFA_1_ID,
  SEED_TL_ALFA_2_ID,
  SEED_TL_ALFA_3_ID,
  SEED_TL_BETA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import { PERMISSION_ACTIONS } from "@/domain/services/permissions";
import {
  CASE_PLAN_ITEM_KINDS,
  CASE_PLAN_ITEM_STATUSES,
  CASE_PLAN_ITEM_PRIORITIES,
  CASE_TIMELINE_ENTRY_KINDS,
  CASE_PLAN_ITEM_TITLE_MAX,
  CASE_PLAN_ITEM_DESCRIPTION_MAX,
  CASE_TIMELINE_ENTRY_TITLE_MAX,
  CASE_TIMELINE_ENTRY_DESCRIPTION_MAX,
  isCasePlanItem,
  isCaseTimelineEntry,
} from "@/domain/core/case-plan";
import {
  createCasePlanItemId,
  createCaseTimelineEntryId,
  isCasePlanItemId,
  isCaseTimelineEntryId,
} from "@/domain/core/ids";
import type { IsoDate } from "@/domain/core/common";
import type { ServiceResult } from "@/domain/services/result";
import type { Membership } from "@/domain/core/access";

const OWNER_ALFA: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};
const OWNER_BETA: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};
const PAGE = { limit: 20 };

function unwrapOk<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error(`esperado ok: ${JSON.stringify(r.error)}`);
  return r.data;
}
function expectFail<T>(
  r: ServiceResult<T>,
  code: "validation_error" | "not_found" | "forbidden" | "conflict",
): void {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.code).toBe(code);
}

async function createLeituraContext(): Promise<{
  env: ReturnType<typeof createMockDomainEnvironment>;
  ctx: ServiceContext;
}> {
  const env = createMockDomainEnvironment();
  const mem = unwrapOk<Membership>(
    await env.services.memberships.create(OWNER_ALFA, {
      userId: SEED_USER_3_ID,
      role: "leitura",
    }),
  );
  return {
    env,
    ctx: {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_3_ID,
      membershipId: mem.id,
      role: "leitura",
    },
  };
}

// ---------------------------------------------------------------------------
// Catálogos e IDs
// ---------------------------------------------------------------------------

describe("LV-08.5A · catálogos e IDs", () => {
  it("catálogos oficiais estão congelados e completos", () => {
    expect(CASE_PLAN_ITEM_KINDS).toEqual(["activity", "pending"]);
    expect(CASE_PLAN_ITEM_STATUSES).toEqual([
      "planned",
      "in_progress",
      "blocked",
      "completed",
      "cancelled",
    ]);
    expect(CASE_PLAN_ITEM_PRIORITIES).toEqual(["low", "normal", "high"]);
    expect(CASE_TIMELINE_ENTRY_KINDS).toEqual(["milestone", "note"]);
    expect(CASE_PLAN_ITEM_TITLE_MAX).toBe(160);
    expect(CASE_TIMELINE_ENTRY_TITLE_MAX).toBe(160);
    expect(CASE_PLAN_ITEM_DESCRIPTION_MAX).toBe(2000);
    expect(CASE_TIMELINE_ENTRY_DESCRIPTION_MAX).toBe(2000);
  });

  it("catálogo de permissões contém as 11 ações de plano/cronologia", () => {
    const added = [
      "casePlanItem.read",
      "casePlanItem.list",
      "casePlanItem.create",
      "casePlanItem.update",
      "casePlanItem.changeStatus",
      "casePlanItem.remove",
      "caseTimelineEntry.read",
      "caseTimelineEntry.list",
      "caseTimelineEntry.create",
      "caseTimelineEntry.update",
      "caseTimelineEntry.remove",
    ] as const;
    for (const a of added) expect(PERMISSION_ACTIONS.includes(a)).toBe(true);
  });

  // 1
  it("fábrica positiva de CasePlanItemId gera prefixo oficial", () => {
    const id = createCasePlanItemId("alfa_x");
    expect(id.startsWith("planItem_")).toBe(true);
    expect(isCasePlanItemId(id)).toBe(true);
  });
  // 2
  it("fábrica positiva de CaseTimelineEntryId gera prefixo oficial", () => {
    const id = createCaseTimelineEntryId("alfa_y");
    expect(id.startsWith("timelineEntry_")).toBe(true);
    expect(isCaseTimelineEntryId(id)).toBe(true);
  });
  // 3
  it("guardas positivas reconhecem os dois IDs seed", () => {
    expect(isCasePlanItemId(SEED_PLAN_ALFA_1_ID)).toBe(true);
    expect(isCaseTimelineEntryId(SEED_TL_ALFA_1_ID)).toBe(true);
  });
  // 4
  it("guarda negativa cruzada rejeita ID do outro tipo", () => {
    expect(isCasePlanItemId(SEED_TL_ALFA_1_ID)).toBe(false);
    expect(isCaseTimelineEntryId(SEED_PLAN_ALFA_1_ID)).toBe(false);
  });
  // 5
  it("somente o prefixo (sem sufixo) é rejeitado", () => {
    expect(isCasePlanItemId("planItem_")).toBe(false);
    expect(isCaseTimelineEntryId("timelineEntry_")).toBe(false);
  });
  // 6
  it("sufixo com caractere inválido é rejeitado", () => {
    expect(isCasePlanItemId("planItem_com espaço")).toBe(false);
    expect(isCaseTimelineEntryId("timelineEntry_@x")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

const validMeta = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
} as const;

describe("LV-08.5A.1 · entidades e guardas", () => {
  // 7
  it("item de plano válido é aceito pelo guarda", () => {
    const item = {
      id: SEED_PLAN_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "Título válido",
      status: "planned",
      priority: "normal",
      metadata: validMeta,
    };
    expect(isCasePlanItem(item)).toBe(true);
  });
  // 8
  it("cronologia válida é aceita pelo guarda", () => {
    const t = {
      id: SEED_TL_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "milestone",
      occurredOn: "2026-01-05",
      title: "Marco",
      metadata: validMeta,
    };
    expect(isCaseTimelineEntry(t)).toBe(true);
  });
  // 9
  it("título vazio é rejeitado", () => {
    expect(
      isCasePlanItem({
        id: SEED_PLAN_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "   ",
        status: "planned",
        priority: "normal",
        metadata: validMeta,
      }),
    ).toBe(false);
  });
  // 10
  it("título acima de 160 é rejeitado", () => {
    expect(
      isCasePlanItem({
        id: SEED_PLAN_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "x".repeat(161),
        status: "planned",
        priority: "normal",
        metadata: validMeta,
      }),
    ).toBe(false);
  });
  // 11
  it("descrição vazia é rejeitada", () => {
    expect(
      isCasePlanItem({
        id: SEED_PLAN_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Título",
        description: "   ",
        status: "planned",
        priority: "normal",
        metadata: validMeta,
      }),
    ).toBe(false);
  });
  // 12
  it("descrição acima de 2000 é rejeitada", () => {
    expect(
      isCaseTimelineEntry({
        id: SEED_TL_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "note",
        occurredOn: "2026-01-01",
        title: "Ok",
        description: "x".repeat(2001),
        metadata: validMeta,
      }),
    ).toBe(false);
  });
  // 13
  it("data inválida é rejeitada (30 de fevereiro)", () => {
    expect(
      isCaseTimelineEntry({
        id: SEED_TL_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "note",
        occurredOn: "2026-02-30",
        title: "Impossível",
        metadata: validMeta,
      }),
    ).toBe(false);
  });
  // 14
  it("chave desconhecida na entidade é rejeitada", () => {
    expect(
      isCasePlanItem({
        id: SEED_PLAN_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Ok",
        status: "planned",
        priority: "normal",
        metadata: validMeta,
        extra: 1,
      }),
    ).toBe(false);
  });
  // 15
  it("chave proibida aninhada é rejeitada", () => {
    expect(
      isCasePlanItem({
        id: SEED_PLAN_ALFA_1_ID,
        organizationId: SEED_ORG_ALFA_ID,
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Ok",
        status: "planned",
        priority: "normal",
        metadata: { ...validMeta, token: "leaky" },
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Inputs estritos
// ---------------------------------------------------------------------------

describe("LV-08.5A.1 · inputs estritos em runtime", () => {
  // 16
  it("create plano rejeita chave `status`", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "X",
      priority: "normal",
      status: "in_progress",
    } as unknown as Parameters<typeof env.services.casePlan.create>[1]);
    expectFail(r, "validation_error");
  });
  // 17
  it("create plano rejeita chave `metadata`", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "X",
      priority: "normal",
      metadata: validMeta,
    } as unknown as Parameters<typeof env.services.casePlan.create>[1]);
    expectFail(r, "validation_error");
  });
  // 18
  it("update plano rejeita chave desconhecida", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      title: "Novo",
      expectedVersion: 1,
      foo: "x",
    } as unknown as Parameters<typeof env.services.casePlan.update>[2]);
    expectFail(r, "validation_error");
  });
  // 19
  it("changeStatus rejeita chave desconhecida", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.changeStatus(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      {
        planItemId: SEED_PLAN_ALFA_1_ID,
        status: "completed",
        expectedVersion: 1,
        bar: 2,
      } as unknown as Parameters<typeof env.services.casePlan.changeStatus>[2],
    );
    expectFail(r, "validation_error");
  });
  // 20
  it("create cronologia rejeita chave `metadata`", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "note",
      occurredOn: "2026-01-20" as IsoDate,
      title: "X",
      metadata: validMeta,
    } as unknown as Parameters<typeof env.services.caseTimeline.create>[1]);
    expectFail(r, "validation_error");
  });
  // 21
  it("update cronologia rejeita chave desconhecida", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.update(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      {
        timelineEntryId: SEED_TL_ALFA_1_ID,
        title: "Novo",
        expectedVersion: 1,
        zzz: true,
      } as unknown as Parameters<typeof env.services.caseTimeline.update>[2],
    );
    expectFail(r, "validation_error");
  });
  // 22
  it("expectedVersion ausente é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      title: "Novo",
    } as unknown as Parameters<typeof env.services.casePlan.update>[2]);
    expectFail(r, "validation_error");
  });
  // 23
  it("expectedVersion não inteiro é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      title: "Novo",
      expectedVersion: 1.5,
    });
    expectFail(r, "validation_error");
  });
  // 24
  it("remoção com versão inválida (0) é rejeitada", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_PLAN_ALFA_1_ID,
      0,
    );
    expectFail(r, "validation_error");
  });
  it("input nulo é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(
      OWNER_ALFA,
      null as unknown as Parameters<typeof env.services.casePlan.create>[1],
    );
    expectFail(r, "validation_error");
  });
  it("input array é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.create(
      OWNER_ALFA,
      [] as unknown as Parameters<typeof env.services.caseTimeline.create>[1],
    );
    expectFail(r, "validation_error");
  });
  it("chave proibida (token) no input é rejeitada", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "X",
      priority: "normal",
      token: "leak",
    } as unknown as Parameters<typeof env.services.casePlan.create>[1]);
    expectFail(r, "validation_error");
  });
});

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

describe("LV-08.5A.1 · seeds corrigidos", () => {
  // 25
  it("Alfa 1 começa sem itens de plano", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_1_ID, PAGE),
    );
    expect(page.items.length).toBe(0);
  });
  // 26
  it("Alfa 1 começa sem cronologia", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.caseTimeline.listByCase(
        OWNER_ALFA,
        SEED_CASE_ALFA_1_ID,
        PAGE,
      ),
    );
    expect(page.items.length).toBe(0);
  });
  // 27
  it("Alfa 2 possui três itens de plano", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, PAGE),
    );
    expect(page.items.length).toBe(3);
  });
  // 28
  it("Alfa 2 possui uma atividade in_progress", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, PAGE),
    );
    const inProgress = page.items.filter(
      (p) => p.kind === "activity" && p.status === "in_progress",
    );
    expect(inProgress.length).toBe(1);
    expect(inProgress[0]!.assignmentId).toBe(SEED_ASSIGN_ALFA_1_ID);
  });
  // 29
  it("Alfa 2 possui uma atividade planned", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, PAGE),
    );
    expect(
      page.items.filter((p) => p.kind === "activity" && p.status === "planned")
        .length,
    ).toBe(1);
  });
  // 30
  it("Alfa 2 possui uma pendência blocked", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, PAGE),
    );
    expect(
      page.items.filter((p) => p.kind === "pending" && p.status === "blocked")
        .length,
    ).toBe(1);
  });
  // 31
  it("Alfa 2 possui três entradas de cronologia com datas distintas", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.caseTimeline.listByCase(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        PAGE,
      ),
    );
    expect(page.items.length).toBe(3);
    const dates = page.items.map((t) => t.occurredOn);
    expect(new Set(dates).size).toBe(3);
    expect(page.items.map((t) => t.id)).toEqual([
      SEED_TL_ALFA_3_ID,
      SEED_TL_ALFA_2_ID,
      SEED_TL_ALFA_1_ID,
    ]);
  });
  // 32
  it("Beta possui plano (2) e cronologia (1)", async () => {
    const env = createMockDomainEnvironment();
    const p = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_BETA, SEED_CASE_BETA_2_ID, PAGE),
    );
    const t = unwrapOk(
      await env.services.caseTimeline.listByCase(
        OWNER_BETA,
        SEED_CASE_BETA_2_ID,
        PAGE,
      ),
    );
    expect(p.items.length).toBe(2);
    expect(t.items.length).toBeGreaterThanOrEqual(1);
    expect(p.items.some((i) => i.id === SEED_PLAN_BETA_1_ID)).toBe(true);
    expect(p.items.some((i) => i.id === SEED_PLAN_BETA_2_ID)).toBe(true);
    expect(t.items.some((i) => i.id === SEED_TL_BETA_1_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Plano
// ---------------------------------------------------------------------------

describe("LV-08.5A.1 · CasePlanService", () => {
  // 33
  it("criação define status planned e version 1", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.casePlan.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Nova",
        priority: "normal",
      }),
    );
    expect(created.status).toBe("planned");
    expect(created.metadata.version).toBe(1);
  });
  // 34
  it("atualização de título incrementa versão", async () => {
    const env = createMockDomainEnvironment();
    const upd = unwrapOk(
      await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: SEED_PLAN_ALFA_1_ID,
        title: "Título revisado",
        expectedVersion: 1,
      }),
    );
    expect(upd.title).toBe("Título revisado");
    expect(upd.metadata.version).toBe(2);
  });
  // 35
  it("remoção de descrição com null é aceita", async () => {
    const env = createMockDomainEnvironment();
    // adiciona descrição primeiro
    const withDesc = unwrapOk(
      await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: SEED_PLAN_ALFA_1_ID,
        description: "Alguma descrição",
        expectedVersion: 1,
      }),
    );
    expect(withDesc.description).toBe("Alguma descrição");
    const cleared = unwrapOk(
      await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: SEED_PLAN_ALFA_1_ID,
        description: null,
        expectedVersion: 2,
      }),
    );
    expect(cleared.description).toBeUndefined();
  });
  // 36
  it("remoção de prazo com null é aceita", async () => {
    const env = createMockDomainEnvironment();
    const cleared = unwrapOk(
      await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: SEED_PLAN_ALFA_1_ID,
        dueOn: null,
        expectedVersion: 1,
      }),
    );
    expect(cleared.dueOn).toBeUndefined();
  });
  // 37
  it("remoção de assignment com null é aceita", async () => {
    const env = createMockDomainEnvironment();
    const cleared = unwrapOk(
      await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: SEED_PLAN_ALFA_1_ID,
        assignmentId: null,
        expectedVersion: 1,
      }),
    );
    expect(cleared.assignmentId).toBeUndefined();
  });
  // 38
  it("assignment válido do próprio caso é aceito", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.casePlan.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Com assignment",
        priority: "normal",
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      }),
    );
    expect(created.assignmentId).toBe(SEED_ASSIGN_ALFA_1_ID);
  });
  // 39
  it("assignment de outro processo é bloqueado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "activity",
      title: "X",
      priority: "normal",
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expectFail(r, "validation_error");
    if (!r.ok) expect(r.error.message).toBe("assignment_not_in_case");
  });
  // 40
  it("assignment de outra organização é bloqueado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "X",
      priority: "normal",
      assignmentId: SEED_ASSIGN_BETA_1_ID,
    });
    expectFail(r, "validation_error");
  });
  // 41
  it("mudança de status incrementa versão", async () => {
    const env = createMockDomainEnvironment();
    const r = unwrapOk(
      await env.services.casePlan.changeStatus(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        {
          planItemId: SEED_PLAN_ALFA_2_ID,
          status: "in_progress",
          expectedVersion: 1,
        },
      ),
    );
    expect(r.status).toBe("in_progress");
    expect(r.metadata.version).toBe(2);
  });
  // 42
  it("conflito de atualização", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      title: "X",
      expectedVersion: 99,
    });
    expectFail(r, "conflict");
  });
  // 43
  it("conflito de status", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.changeStatus(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      {
        planItemId: SEED_PLAN_ALFA_1_ID,
        status: "completed",
        expectedVersion: 99,
      },
    );
    expectFail(r, "conflict");
  });
  // 44
  it("remoção com versão correta funciona", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_PLAN_ALFA_1_ID,
      1,
    );
    expect(r.ok).toBe(true);
    const again = await env.services.casePlan.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_PLAN_ALFA_1_ID,
    );
    expectFail(again, "not_found");
  });
  // 45
  it("conflito de remoção", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_PLAN_ALFA_1_ID,
      42,
    );
    expectFail(r, "conflict");
  });
  // 46
  it("update sem mudanças efetivas devolve no_changes", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      expectedVersion: 1,
    });
    expectFail(r, "validation_error");
    if (!r.ok) expect(r.error.message).toBe("no_changes");
  });
  // 47
  it("ordenação por status, dueOn, createdAt, id (antes da paginação)", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, PAGE),
    );
    expect(page.items.map((i) => i.id)).toEqual([
      SEED_PLAN_ALFA_2_ID,
      SEED_PLAN_ALFA_1_ID,
      SEED_PLAN_ALFA_3_ID,
    ]);
  });
  // 48
  it("retorno de create é cópia imutável (não muta store)", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.casePlan.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Original",
        priority: "normal",
      }),
    );
    const mutable = created as unknown as { title: string };
    try {
      mutable.title = "MUTADO";
    } catch {
      /* readonly-freeze aceito */
    }
    const fetched = unwrapOk(
      await env.services.casePlan.getById(OWNER_ALFA, SEED_CASE_ALFA_2_ID, created.id),
    );
    expect(fetched.title).toBe("Original");
  });
});

// ---------------------------------------------------------------------------
// Cronologia
// ---------------------------------------------------------------------------

describe("LV-08.5A.1 · CaseTimelineService", () => {
  // 49
  it("criação registra entrada com version 1", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.caseTimeline.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "note",
        occurredOn: "2026-02-01" as IsoDate,
        title: "Anotação",
      }),
    );
    expect(created.metadata.version).toBe(1);
    expect(created.id.startsWith("timelineEntry_")).toBe(true);
  });
  // 50
  it("atualização de título incrementa versão", async () => {
    const env = createMockDomainEnvironment();
    const upd = unwrapOk(
      await env.services.caseTimeline.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        timelineEntryId: SEED_TL_ALFA_1_ID,
        title: "Título novo",
        expectedVersion: 1,
      }),
    );
    expect(upd.title).toBe("Título novo");
    expect(upd.metadata.version).toBe(2);
  });
  // 51
  it("remoção de descrição com null é aceita", async () => {
    const env = createMockDomainEnvironment();
    const withDesc = unwrapOk(
      await env.services.caseTimeline.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        timelineEntryId: SEED_TL_ALFA_1_ID,
        description: "Descrição",
        expectedVersion: 1,
      }),
    );
    expect(withDesc.description).toBe("Descrição");
    const cleared = unwrapOk(
      await env.services.caseTimeline.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        timelineEntryId: SEED_TL_ALFA_1_ID,
        description: null,
        expectedVersion: 2,
      }),
    );
    expect(cleared.description).toBeUndefined();
  });
  // 52
  it("conflito de atualização", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.update(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      {
        timelineEntryId: SEED_TL_ALFA_1_ID,
        title: "X",
        expectedVersion: 99,
      },
    );
    expectFail(r, "conflict");
  });
  // 53
  it("remoção com versão correta funciona", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_TL_ALFA_1_ID,
      1,
    );
    expect(r.ok).toBe(true);
  });
  // 54
  it("conflito de remoção", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_TL_ALFA_1_ID,
      42,
    );
    expectFail(r, "conflict");
  });
  // 55
  it("update sem mudanças devolve no_changes", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.update(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { timelineEntryId: SEED_TL_ALFA_1_ID, expectedVersion: 1 },
    );
    expectFail(r, "validation_error");
    if (!r.ok) expect(r.error.message).toBe("no_changes");
  });
  // 56
  it("ordenação decrescente antes da paginação", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk(
      await env.services.caseTimeline.listByCase(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        PAGE,
      ),
    );
    const dates = page.items.map((t) => t.occurredOn);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });
  // 57
  it("retorno é cópia imutável do store", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.caseTimeline.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "note",
        occurredOn: "2026-03-01" as IsoDate,
        title: "Original",
      }),
    );
    const mutable = created as unknown as { title: string };
    try {
      mutable.title = "M";
    } catch {
      /* readonly-freeze aceito */
    }
    const fetched = unwrapOk(
      await env.services.caseTimeline.getById(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        created.id,
      ),
    );
    expect(fetched.title).toBe("Original");
  });
});

// ---------------------------------------------------------------------------
// Permissões
// ---------------------------------------------------------------------------

describe("LV-08.5A.1 · permissões com caseId", () => {
  // 58
  it("perfil leitura lista plano", async () => {
    const { env, ctx } = await createLeituraContext();
    const page = unwrapOk(
      await env.services.casePlan.listByCase(ctx, SEED_CASE_ALFA_2_ID, PAGE),
    );
    expect(page.items.length).toBe(3);
  });
  // 59
  it("perfil leitura lista cronologia", async () => {
    const { env, ctx } = await createLeituraContext();
    const page = unwrapOk(
      await env.services.caseTimeline.listByCase(ctx, SEED_CASE_ALFA_2_ID, PAGE),
    );
    expect(page.items.length).toBe(3);
  });
  // 60
  it("perfil leitura NÃO cria plano", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.casePlan.create(ctx, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "X",
      priority: "normal",
    });
    expectFail(r, "forbidden");
  });
  // 61
  it("perfil leitura NÃO atualiza plano", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.casePlan.update(ctx, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      title: "X",
      expectedVersion: 1,
    });
    expectFail(r, "forbidden");
  });
  // 62
  it("perfil leitura NÃO altera status", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.casePlan.changeStatus(ctx, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      status: "completed",
      expectedVersion: 1,
    });
    expectFail(r, "forbidden");
  });
  // 63
  it("perfil leitura NÃO remove plano", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.casePlan.remove(
      ctx,
      SEED_CASE_ALFA_2_ID,
      SEED_PLAN_ALFA_1_ID,
      1,
    );
    expectFail(r, "forbidden");
  });
  // 64
  it("perfil leitura NÃO cria cronologia", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.caseTimeline.create(ctx, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "note",
      occurredOn: "2026-03-01" as IsoDate,
      title: "X",
    });
    expectFail(r, "forbidden");
  });
  // 65
  it("perfil leitura NÃO atualiza cronologia", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.caseTimeline.update(ctx, SEED_CASE_ALFA_2_ID, {
      timelineEntryId: SEED_TL_ALFA_1_ID,
      title: "X",
      expectedVersion: 1,
    });
    expectFail(r, "forbidden");
  });
  // 66
  it("perfil leitura NÃO remove cronologia", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.caseTimeline.remove(
      ctx,
      SEED_CASE_ALFA_2_ID,
      SEED_TL_ALFA_1_ID,
      1,
    );
    expectFail(r, "forbidden");
  });
  // 67
  it("membership suspensa é bloqueada", async () => {
    const env = createMockDomainEnvironment();
    // Membership suspensa oficial: SEED_MEM_ALFA_SUSPENDED_ID (user 2 em Alfa).
    const ctx: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_2_ID,
      membershipId: (await import("@/domain/mocks/seed")).SEED_MEM_ALFA_SUSPENDED_ID,
      role: "colaborador",
    };
    const r = await env.services.casePlan.listByCase(ctx, SEED_CASE_ALFA_2_ID, PAGE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["forbidden", "unauthorized"]).toContain(r.error.code);
  });
  // 68
  it("guard de plano avalia permissão com caseId (contextual)", async () => {
    const env = createMockDomainEnvironment();
    const dec = unwrapOk(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "casePlanItem.list",
        caseId: SEED_CASE_ALFA_2_ID,
      }),
    );
    expect(dec.allowed).toBe(true);
  });
  // 69
  it("guard de cronologia avalia permissão com caseId (contextual)", async () => {
    const env = createMockDomainEnvironment();
    const dec = unwrapOk(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "caseTimelineEntry.list",
        caseId: SEED_CASE_ALFA_2_ID,
      }),
    );
    expect(dec.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Arquitetura
// ---------------------------------------------------------------------------

describe("LV-08.5A.1 · arquitetura preservada", () => {
  // 70
  it("serviços de plano e cronologia continuam expostos pelo ambiente", () => {
    const env = createMockDomainEnvironment();
    expect(typeof env.services.casePlan.listByCase).toBe("function");
    expect(typeof env.services.caseTimeline.listByCase).toBe("function");
  });
  // 71
  it("nenhuma rota de UI foi alterada por esta subetapa", async () => {
    const fs = await import("node:fs");
    const files = fs.readdirSync("src/routes");
    // As rotas nem sequer conhecem o serviço de plano ainda (LV-08.5B).
    const combined = files
      .map((f) => `src/routes/${f}`)
      .filter((p) => fs.statSync(p).isFile())
      .map((p) => fs.readFileSync(p, "utf8"))
      .join("\n");
    expect(combined.includes("casePlan.")).toBe(false);
    expect(combined.includes("caseTimeline.")).toBe(false);
  });
  // 72
  it("nenhum componente de UI usa o serviço de plano/cronologia", async () => {
    const fs = await import("node:fs");
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${entry.name}`;
        if (entry.isDirectory()) out.push(...walk(p));
        else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) out.push(p);
      }
      return out;
    }
    const files = [...walk("src/components"), ...walk("src/features")];
    // LV-08.5B: os arquivos abaixo passaram a usar oficialmente casePlan/caseTimeline.
    const lv085bAllowed = new Set([
      "src/features/processos/ProcessPlanTimeline.tsx",
      "src/features/processos/process-plan-model.ts",
    ]);
    for (const f of files) {
      const rel = f.replace(/^\.\//, "");
      if (lv085bAllowed.has(rel)) continue;
      const src = fs.readFileSync(f, "utf8");
      expect(src.includes("casePlan.")).toBe(false);
      expect(src.includes("caseTimeline.")).toBe(false);
    }
  });
  // 73
  it("package.json não ganhou novas dependências relacionadas", async () => {
    const pkg = JSON.parse(
      (await import("node:fs")).readFileSync("package.json", "utf8"),
    );
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const k of Object.keys(all)) {
      expect(k.startsWith("supabase")).toBe(false);
      expect(k.startsWith("openai")).toBe(false);
    }
  });
  // 74
  it("nenhum recurso de auditoria/snapshot foi criado (LV-08.6+)", async () => {
    const fs = await import("node:fs");
    const routes = fs.readdirSync("src/routes");
    for (const r of routes) {
      expect(r.includes("auditoria")).toBe(false);
      expect(r.includes("snapshot")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// LV-08.5A.2 — extração segura de caseId, enforce por input e auditoria fonte.
// ---------------------------------------------------------------------------

describe("LV-08.5A.2 · guardas contextualizadas de Plano e Cronologia", () => {
  it("permission-guards.ts usa isCaseId oficialmente", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/domain/mocks/permission-guards.ts",
      "utf8",
    );
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(/from\s+["']\.\.\/core\/ids["']/.test(stripped)).toBe(true);
    expect(/\bisCaseId\s*\(/.test(stripped)).toBe(true);
    expect(/type\s+CaseId/.test(stripped)).toBe(true);
  });

  it("permission-guards.ts não valida caseId apenas por startsWith", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/domain/mocks/permission-guards.ts",
      "utf8",
    );
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(/startsWith\(\s*["']case_["']\s*\)/.test(stripped)).toBe(false);
    expect(/\bas\s+CaseId\b/.test(stripped)).toBe(false);
  });

  it("casePlan.create usa enforceFromInputCase e não retorna direto ao serviço", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/domain/mocks/permission-guards.ts",
      "utf8",
    );
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(
      /enforceFromInputCase\(\s*store\s*,\s*ctx\s*,\s*["']casePlanItem\.create["']/.test(
        stripped,
      ),
    ).toBe(true);
    expect(/if\s*\(\s*cid\s*===\s*null\s*\)\s*return\s+s\.create/.test(stripped)).toBe(
      false,
    );
  });

  it("caseTimeline.create usa enforceFromInputCase e não retorna direto ao serviço", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/domain/mocks/permission-guards.ts",
      "utf8",
    );
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(
      /enforceFromInputCase\(\s*store\s*,\s*ctx\s*,\s*["']caseTimelineEntry\.create["']/.test(
        stripped,
      ),
    ).toBe(true);
  });

  it("perfil leitura com input válido é bloqueado por forbidden em casePlan.create", async () => {
    const { env, ctx } = await createLeituraContext();
    const r = await env.services.casePlan.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "activity",
      title: "T",
      priority: "normal",
    });
    expectFail(r, "forbidden");
  });

  it("perfil leitura com input malformado também recebe forbidden (não pula guarda)", async () => {
    const { env, ctx } = await createLeituraContext();
    const badInput = {
      kind: "activity",
      title: "T",
      priority: "normal",
    } as unknown as Parameters<typeof env.services.casePlan.create>[1];
    const r = await env.services.casePlan.create(ctx, badInput);
    expectFail(r, "forbidden");
  });

  it("perfil leitura com input malformado em caseTimeline.create também é forbidden", async () => {
    const { env, ctx } = await createLeituraContext();
    const badInput = {
      kind: "note",
      title: "T",
    } as unknown as Parameters<typeof env.services.caseTimeline.create>[1];
    const r = await env.services.caseTimeline.create(ctx, badInput);
    expectFail(r, "forbidden");
  });

  it("proprietário com input malformado recebe validation_error do serviço", async () => {
    const env = createMockDomainEnvironment();
    const badInput = {
      kind: "activity",
      title: "T",
      priority: "normal",
    } as unknown as Parameters<typeof env.services.casePlan.create>[1];
    const r = await env.services.casePlan.create(OWNER_ALFA, badInput);
    expectFail(r, "validation_error");
  });

  it("proprietário com caseId de outra organização não consegue criar (guarda contextual atua)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_BETA_2_ID,
      kind: "activity",
      title: "T",
      priority: "normal",
    });
    expect(r.ok).toBe(false);
  });

  it("métodos de leitura de casePlan/caseTimeline usam enforceWithCase", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/domain/mocks/permission-guards.ts",
      "utf8",
    );
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(
      /enforceWithCase\([\s\S]*?["']casePlanItem\.read["']/.test(stripped),
    ).toBe(true);
    expect(
      /enforceWithCase\([\s\S]*?["']casePlanItem\.list["']/.test(stripped),
    ).toBe(true);
    expect(
      /enforceWithCase\([\s\S]*?["']caseTimelineEntry\.read["']/.test(stripped),
    ).toBe(true);
    expect(
      /enforceWithCase\([\s\S]*?["']caseTimelineEntry\.list["']/.test(stripped),
    ).toBe(true);
  });

  it("update, changeStatus e remove de casePlan/caseTimeline usam enforceWithCase", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      "src/domain/mocks/permission-guards.ts",
      "utf8",
    );
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const action of [
      "casePlanItem.update",
      "casePlanItem.changeStatus",
      "casePlanItem.remove",
      "caseTimelineEntry.update",
      "caseTimelineEntry.remove",
    ]) {
      const re = new RegExp(
        `enforceWithCase\\([\\s\\S]*?["']${action.replace(".", "\\.")}["']`,
      );
      expect(re.test(stripped)).toBe(true);
    }
  });

  it("proprietário válido continua conseguindo criar plano após as guardas", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "activity",
      title: "Novo item",
      priority: "normal",
    });
    const item = unwrapOk(r);
    expect(isCasePlanItem(item)).toBe(true);
    expect(item.caseId).toBe(SEED_CASE_ALFA_1_ID);
  });
});

