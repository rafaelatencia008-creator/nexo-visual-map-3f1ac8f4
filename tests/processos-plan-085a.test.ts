/**
 * LV-08.5A — testes de fundação para Plano de trabalho e Cronologia.
 */

import { describe, it, expect } from "bun:test";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_BETA_2_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_ASSIGN_BETA_1_ID,
  SEED_PLAN_ALFA_1_ID,
  SEED_PLAN_ALFA_2_ID,
  SEED_PLAN_ALFA_3_ID,
  SEED_TL_ALFA_1_ID,
  SEED_TL_ALFA_2_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import { PERMISSION_ACTIONS } from "@/domain/services/permissions";
import {
  CASE_PLAN_ITEM_KINDS,
  CASE_PLAN_ITEM_STATUSES,
  CASE_PLAN_ITEM_PRIORITIES,
  CASE_TIMELINE_ENTRY_KINDS,
  CASE_PLAN_ITEM_TITLE_MAX,
  CASE_TIMELINE_ENTRY_TITLE_MAX,
  isCasePlanItem,
  isCaseTimelineEntry,
} from "@/domain/core/case-plan";
import {
  isCasePlanItemId,
  isCaseTimelineEntryId,
} from "@/domain/core/ids";

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

function ok<T>(r: { ok: boolean } & Record<string, unknown>): T {
  if (!r.ok) throw new Error(`esperado ok: ${JSON.stringify(r)}`);
  return (r as { data: T }).data;
}

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
  });

  it("prefixos oficiais dos novos IDs são estáveis", () => {
    expect(SEED_PLAN_ALFA_1_ID.startsWith("planItem_")).toBe(true);
    expect(SEED_TL_ALFA_1_ID.startsWith("timelineEntry_")).toBe(true);
    expect(isCasePlanItemId(SEED_PLAN_ALFA_1_ID)).toBe(true);
    expect(isCaseTimelineEntryId(SEED_TL_ALFA_1_ID)).toBe(true);
  });

  it("11 ações de permissão foram adicionadas ao catálogo", () => {
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
    for (const a of added) {
      expect(PERMISSION_ACTIONS.includes(a)).toBe(true);
    }
  });
});

describe("LV-08.5A · seed e snapshot", () => {
  it("snapshot expõe as novas coleções e seed carrega itens do plano/cronologia", () => {
    const env = createMockDomainEnvironment();
    const snap = env.snapshot();
    expect(snap.casePlanItems.length).toBe(5);
    expect(snap.caseTimelineEntries.length).toBe(3);
    for (const p of snap.casePlanItems) expect(isCasePlanItem(p)).toBe(true);
    for (const t of snap.caseTimelineEntries) expect(isCaseTimelineEntry(t)).toBe(true);
  });
});

describe("LV-08.5A · CasePlanService.listByCase (ordenação determinística)", () => {
  it("ordena por status, dueOn, createdAt, id e isola por organização", async () => {
    const env = createMockDomainEnvironment();
    const page = ok<{ items: readonly { id: string; status: string }[] }>(
      await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, PAGE),
    );
    // Primeira posição: in_progress (ALFA_1), depois planned (ALFA_2), depois completed (ALFA_3)
    expect(page.items.length).toBe(3);
    expect(page.items[0]!.id).toBe(SEED_PLAN_ALFA_1_ID);
    expect(page.items[1]!.id).toBe(SEED_PLAN_ALFA_2_ID);
    expect(page.items[2]!.id).toBe(SEED_PLAN_ALFA_3_ID);

    const betaPage = ok<{ items: readonly unknown[] }>(
      await env.services.casePlan.listByCase(OWNER_BETA, SEED_CASE_BETA_2_ID, PAGE),
    );
    expect(betaPage.items.length).toBe(2);
  });

  it("caso de outra organização retorna not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.listByCase(
      OWNER_ALFA,
      SEED_CASE_BETA_2_ID,
      PAGE,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });
});

describe("LV-08.5A · CasePlanService.create e update", () => {
  it("cria item com status inicial 'planned' e valida assignment no caso", async () => {
    const env = createMockDomainEnvironment();
    const created = ok<{ id: string; status: string; metadata: { version: number } }>(
      await env.services.casePlan.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Nova diligência",
        priority: "normal",
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      }),
    );
    expect(created.status).toBe("planned");
    expect(created.metadata.version).toBe(1);
    expect(created.id.startsWith("planItem_")).toBe(true);
  });

  it("rejeita assignment que pertence a outro caso", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "activity",
      title: "Item inválido",
      priority: "normal",
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation_error");
  });

  it("update sem mudanças retorna validation_error/no_changes", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      expectedVersion: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("validation_error");
      expect(r.error.message).toBe("no_changes");
    }
  });

  it("update com expectedVersion errado retorna conflict", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      planItemId: SEED_PLAN_ALFA_1_ID,
      title: "Outro título",
      expectedVersion: 99,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("conflict");
  });

  it("changeStatus incrementa versão e altera status", async () => {
    const env = createMockDomainEnvironment();
    const r = ok<{ status: string; metadata: { version: number } }>(
      await env.services.casePlan.changeStatus(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: SEED_PLAN_ALFA_2_ID,
        status: "in_progress",
        expectedVersion: 1,
      }),
    );
    expect(r.status).toBe("in_progress");
    expect(r.metadata.version).toBe(2);
  });
});

describe("LV-08.5A · CaseTimelineService.listByCase (ordenação decrescente)", () => {
  it("lista em ordem decrescente por occurredOn", async () => {
    const env = createMockDomainEnvironment();
    const page = ok<{ items: readonly { id: string; occurredOn: string }[] }>(
      await env.services.caseTimeline.listByCase(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        PAGE,
      ),
    );
    expect(page.items.length).toBe(2);
    expect(page.items[0]!.id).toBe(SEED_TL_ALFA_2_ID);
    expect(page.items[1]!.id).toBe(SEED_TL_ALFA_1_ID);
  });
});

describe("LV-08.5A · permissões e isolamento", () => {
  it("papel `leitura` recebe forbidden ao criar item de plano", async () => {
    const env = createMockDomainEnvironment();
    const mem = ok<{ id: string }>(
      await env.services.memberships.create(OWNER_ALFA, {
        userId: "usr_seed_3" as never,
        role: "leitura",
      }),
    );
    const readCtx: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: "usr_seed_3" as never,
      membershipId: mem.id as never,
      role: "leitura",
    };
    const r = await env.services.casePlan.create(readCtx, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "Não deveria criar",
      priority: "normal",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });
});
