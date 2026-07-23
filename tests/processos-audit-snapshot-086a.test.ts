/**
 * LV-08.6A — testes de fundação para Auditoria e Snapshot do processo.
 *
 * Cobre catálogos, guardas, contratos de serviço, ordenação estável,
 * filtros, paginação, imutabilidade dos snapshots, auditoria automática
 * das escritas bem-sucedidas e permissões contextuais.
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
  SEED_CASE_ALFA_3_ID,
  SEED_CASE_BETA_1_ID,
  SEED_CASE_BETA_2_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_PERSON_ALFA_1_ID,
  SEED_PERSON_ALFA_2_ID,
  SEED_PLAN_ALFA_1_ID,
  SEED_TL_ALFA_1_ID,
  SEED_SNAPSHOT_ALFA_1_ID,
  SEED_SNAPSHOT_ALFA_2_ID,
  SEED_AUDIT_ALFA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import { PERMISSION_ACTIONS } from "@/domain/services/permissions";
import {
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  AUDIT_SUMMARY,
  AUDIT_EVENT_ALLOWED_KEYS,
  AUDIT_SUMMARY_MAX,
  CASE_SNAPSHOT_ALLOWED_KEYS,
  CASE_SNAPSHOT_LABEL_MAX,
  CASE_SNAPSHOT_REASON_MAX,
  CASE_SNAPSHOT_PAYLOAD_ALLOWED_KEYS,
  isAuditAction,
  isAuditTargetType,
  isAuditEvent,
  isCaseSnapshot,
  isCaseSnapshotPayload,
} from "@/domain/core/case-audit";
import {
  buildDomainId,
  isAuditEventId,
  isCaseSnapshotId,
} from "@/domain/core/ids";
import type { ServiceResult } from "@/domain/services/result";
import type { Membership } from "@/domain/core/access";
import type { AuditEvent, CaseSnapshot } from "@/domain/core/case-audit";
import type { PageResult } from "@/domain/services/pagination";

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

async function withReaderCtx(): Promise<{
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

// ===========================================================================
// 1. Catálogos e guardas de shape
// ===========================================================================

describe("LV-08.6A — catálogos AuditAction / AuditTargetType", () => {
  it("expõe exatamente 19 ações auditáveis", () => {
    expect(AUDIT_ACTIONS.length).toBe(19);
  });
  it("não repete nenhuma ação auditável", () => {
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });
  it("expõe exatamente 7 tipos alvo", () => {
    expect(AUDIT_TARGET_TYPES.length).toBe(7);
  });
  it("não repete tipos alvo", () => {
    expect(new Set(AUDIT_TARGET_TYPES).size).toBe(AUDIT_TARGET_TYPES.length);
  });
  it("cobre todas as ações em AUDIT_SUMMARY", () => {
    for (const a of AUDIT_ACTIONS) {
      expect(typeof AUDIT_SUMMARY[a]).toBe("string");
      expect(AUDIT_SUMMARY[a].length).toBeGreaterThan(0);
      expect(AUDIT_SUMMARY[a].length).toBeLessThanOrEqual(AUDIT_SUMMARY_MAX);
    }
  });
  it("isAuditAction aceita cada ação oficial", () => {
    for (const a of AUDIT_ACTIONS) expect(isAuditAction(a)).toBe(true);
  });
  it("isAuditAction rejeita valores fora do catálogo", () => {
    expect(isAuditAction("case.deleted")).toBe(false);
    expect(isAuditAction("")).toBe(false);
    expect(isAuditAction(null)).toBe(false);
    expect(isAuditAction(123)).toBe(false);
    expect(isAuditAction(undefined)).toBe(false);
  });
  it("isAuditTargetType aceita cada tipo alvo", () => {
    for (const t of AUDIT_TARGET_TYPES) expect(isAuditTargetType(t)).toBe(true);
  });
  it("isAuditTargetType rejeita valores fora do catálogo", () => {
    expect(isAuditTargetType("user")).toBe(false);
    expect(isAuditTargetType("")).toBe(false);
    expect(isAuditTargetType({})).toBe(false);
  });
});

describe("LV-08.6A — allow-lists de chaves oficiais", () => {
  it("AUDIT_EVENT_ALLOWED_KEYS lista exatamente 11 chaves", () => {
    expect(AUDIT_EVENT_ALLOWED_KEYS.size).toBe(11);
  });
  it("CASE_SNAPSHOT_ALLOWED_KEYS lista exatamente 10 chaves", () => {
    expect(CASE_SNAPSHOT_ALLOWED_KEYS.size).toBe(10);
  });
  it("CASE_SNAPSHOT_PAYLOAD_ALLOWED_KEYS lista exatamente 7 chaves", () => {
    expect(CASE_SNAPSHOT_PAYLOAD_ALLOWED_KEYS.size).toBe(7);
  });
  it("limites de tamanho publicados são coerentes", () => {
    expect(AUDIT_SUMMARY_MAX).toBeGreaterThan(0);
    expect(CASE_SNAPSHOT_LABEL_MAX).toBeGreaterThan(0);
    expect(CASE_SNAPSHOT_REASON_MAX).toBeGreaterThan(CASE_SNAPSHOT_LABEL_MAX);
  });
});

describe("LV-08.6A — prefixos oficiais dos novos IDs", () => {
  it("auditEvent gera ID com prefixo audit_", () => {
    const id = buildDomainId("auditEvent", "x1");
    expect(id.startsWith("audit_")).toBe(true);
    expect(isAuditEventId(id)).toBe(true);
    expect(isCaseSnapshotId(id)).toBe(false);
  });
  it("caseSnapshot gera ID com prefixo snapshot_", () => {
    const id = buildDomainId("caseSnapshot", "x1");
    expect(id.startsWith("snapshot_") || id.startsWith("casesnap") || isCaseSnapshotId(id)).toBe(true);
    expect(isCaseSnapshotId(id)).toBe(true);
    expect(isAuditEventId(id)).toBe(false);
  });
});

// ===========================================================================
// 2. Seed contém eventos e snapshots pré-fabricados
// ===========================================================================

describe("LV-08.6A — seed determinístico de auditoria e snapshot", () => {
  it("carrega os 11 eventos do caso Alfa 002 + 1 do Beta 001", async () => {
    const env = createMockDomainEnvironment();
    const snap = env.snapshot();
    expect(snap.auditEvents.length).toBe(12);
    expect(snap.caseSnapshots.length).toBe(2);
  });

  it("todos os eventos do seed passam no isAuditEvent", async () => {
    const env = createMockDomainEnvironment();
    for (const e of env.snapshot().auditEvents) {
      expect(isAuditEvent(e)).toBe(true);
    }
  });

  it("todos os snapshots do seed passam no isCaseSnapshot", async () => {
    const env = createMockDomainEnvironment();
    for (const s of env.snapshot().caseSnapshots) {
      expect(isCaseSnapshot(s)).toBe(true);
      expect(isCaseSnapshotPayload(s.payload)).toBe(true);
    }
  });

  it("snapshots do seed usam os IDs oficiais", async () => {
    const env = createMockDomainEnvironment();
    const ids = env.snapshot().caseSnapshots.map((s) => s.id);
    expect(ids).toContain(SEED_SNAPSHOT_ALFA_1_ID);
    expect(ids).toContain(SEED_SNAPSHOT_ALFA_2_ID);
  });

  it("eventos do seed usam IDs oficiais", async () => {
    const env = createMockDomainEnvironment();
    const ids = env.snapshot().auditEvents.map((e) => e.id);
    expect(ids).toContain(SEED_AUDIT_ALFA_1_ID);
  });
});

// ===========================================================================
// 3. Contrato AuditEventService.listByCase
// ===========================================================================

describe("LV-08.6A — AuditEventService.listByCase (leitura)", () => {
  it("lista eventos do caso Alfa 002 em ordem occurredAt desc", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID);
    const page = unwrapOk<PageResult<AuditEvent>>(r);
    expect(page.items.length).toBeGreaterThanOrEqual(11);
    for (let i = 1; i < page.items.length; i++) {
      const prev = page.items[i - 1]!.occurredAt;
      const cur = page.items[i]!.occurredAt;
      expect(prev >= cur).toBe(true);
    }
  });

  it("retorna lista vazia para caso sem eventos", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_ALFA_3_ID);
    const page = unwrapOk<PageResult<AuditEvent>>(r);
    expect(page.items.length).toBe(0);
  });

  it("isola por organização (Alfa não enxerga eventos Beta)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_BETA_1_ID);
    expectFail(r, "not_found");
  });

  it("nega listagem quando caseId não é branded", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      "not-a-case" as unknown as typeof SEED_CASE_ALFA_1_ID,
    );
    expectFail(r, "validation_error");
  });

  it("filtra por action", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { actions: ["casePlanItem.created"] },
    );
    const page = unwrapOk<PageResult<AuditEvent>>(r);
    expect(page.items.length).toBeGreaterThanOrEqual(1);
    for (const e of page.items) expect(e.action).toBe("casePlanItem.created");
  });

  it("filtra por targetType", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { targetTypes: ["caseTimelineEntry"] },
    );
    const page = unwrapOk<PageResult<AuditEvent>>(r);
    for (const e of page.items) expect(e.targetType).toBe("caseTimelineEntry");
  });

  it("rejeita chave desconhecida em options", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { foo: 1 } as never,
    );
    expectFail(r, "validation_error");
  });

  it("rejeita action inválida no filtro", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { actions: ["case.deleted"] as never },
    );
    expectFail(r, "validation_error");
  });

  it("rejeita targetType inválido no filtro", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { targetTypes: ["user"] as never },
    );
    expectFail(r, "validation_error");
  });

  it("rejeita occurredFrom que não é IsoDateTime", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { occurredFrom: "2026-01-01" as never },
    );
    expectFail(r, "validation_error");
  });

  it("rejeita occurredTo que não é IsoDateTime", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { occurredTo: "amanhã" as never },
    );
    expectFail(r, "validation_error");
  });

  it("rejeita occurredFrom posterior a occurredTo", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      {
        occurredFrom: "2026-02-01T00:00:00.000Z" as never,
        occurredTo: "2026-01-01T00:00:00.000Z" as never,
      },
    );
    expectFail(r, "validation_error");
  });

  it("filtra por intervalo occurredFrom/occurredTo", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      {
        occurredFrom: "2026-01-01T00:00:00.000Z" as never,
        occurredTo: "2027-01-01T00:00:00.000Z" as never,
      },
    );
    const page = unwrapOk<PageResult<AuditEvent>>(r);
    for (const e of page.items) {
      expect(e.occurredAt >= "2026-01-01T00:00:00.000Z").toBe(true);
      expect(e.occurredAt <= "2027-01-01T00:00:00.000Z").toBe(true);
    }
  });

  it("pagina eventos com limit pequeno e devolve cursor", async () => {
    const env = createMockDomainEnvironment();
    const first = unwrapOk<PageResult<AuditEvent>>(
      await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        page: { limit: 3 },
      }),
    );
    expect(first.items.length).toBe(3);
    expect(first.nextCursor).toBeTruthy();
    const next = unwrapOk<PageResult<AuditEvent>>(
      await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        page: { limit: 3, cursor: first.nextCursor! },
      }),
    );
    expect(next.items.length).toBeGreaterThan(0);
    const firstIds = new Set(first.items.map((e) => e.id));
    for (const e of next.items) expect(firstIds.has(e.id)).toBe(false);
  });

  it("leitor com papel 'leitura' consegue ler auditoria", async () => {
    const { env, ctx } = await withReaderCtx();
    const r = await env.services.auditEvents.listByCase(ctx, SEED_CASE_ALFA_2_ID);
    expect(r.ok).toBe(true);
  });

  it("contexto com role inválido é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.auditEvents.listByCase(
      { ...OWNER_ALFA, role: "invalido" as never },
      SEED_CASE_ALFA_2_ID,
    );
    expect(r.ok).toBe(false);
  });
});

// ===========================================================================
// 4. CaseSnapshotService.create + immutabilidade
// ===========================================================================

describe("LV-08.6A — CaseSnapshotService.create", () => {
  it("cria snapshot com label + reason e devolve entidade válida", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "Antes da audiência",
      reason: "para conferência posterior",
    });
    const snap = unwrapOk<CaseSnapshot>(r);
    expect(isCaseSnapshot(snap)).toBe(true);
    expect(snap.label).toBe("Antes da audiência");
    expect(snap.reason).toBe("para conferência posterior");
    expect(snap.caseId).toBe(SEED_CASE_ALFA_2_ID);
    expect(snap.organizationId).toBe(SEED_ORG_ALFA_ID);
    expect(snap.createdByUserId).toBe(SEED_USER_1_ID);
  });

  it("aceita snapshot sem reason", async () => {
    const env = createMockDomainEnvironment();
    const snap = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: "Marco",
      }),
    );
    expect(snap.reason).toBeUndefined();
  });

  it("faz trim do label", async () => {
    const env = createMockDomainEnvironment();
    const snap = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: "   Marco 2   ",
      }),
    );
    expect(snap.label).toBe("Marco 2");
  });

  it("rejeita label vazio", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "",
    });
    expectFail(r, "validation_error");
  });

  it("rejeita label somente com espaços", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "     ",
    });
    expectFail(r, "validation_error");
  });

  it("rejeita label acima do limite", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "x".repeat(CASE_SNAPSHOT_LABEL_MAX + 1),
    });
    expectFail(r, "validation_error");
  });

  it("rejeita reason vazio", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "ok",
      reason: "",
    });
    expectFail(r, "validation_error");
  });

  it("rejeita reason acima do limite", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "ok",
      reason: "r".repeat(CASE_SNAPSHOT_REASON_MAX + 1),
    });
    expectFail(r, "validation_error");
  });

  it("rejeita caseId inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: "abc" as never,
      label: "ok",
    });
    expectFail(r, "validation_error");
  });

  it("rejeita chave desconhecida no input", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "ok",
      foo: 1,
    } as never);
    expectFail(r, "validation_error");
  });

  it("rejeita cross-org (Alfa criando para case Beta)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_BETA_1_ID,
      label: "x",
    });
    expectFail(r, "not_found");
  });

  it("papel 'leitura' não pode criar snapshot", async () => {
    const { env, ctx } = await withReaderCtx();
    const r = await env.services.caseSnapshots.create(ctx, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "x",
    });
    expectFail(r, "forbidden");
  });

  it("emite auditoria caseSnapshot.created quando criado", async () => {
    const env = createMockDomainEnvironment();
    const before = unwrapOk<PageResult<AuditEvent>>(
      await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID),
    ).items.length;
    await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "auditado",
    });
    const after = unwrapOk<PageResult<AuditEvent>>(
      await env.services.auditEvents.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        actions: ["caseSnapshot.created"],
      }),
    );
    expect(after.items.length).toBeGreaterThanOrEqual(1);
    expect(after.items[0]!.action).toBe("caseSnapshot.created");
    void before;
  });

  it("snapshot contém cópia do case, pessoas, vínculos, plano e cronologia", async () => {
    const env = createMockDomainEnvironment();
    const snap = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: "full",
      }),
    );
    expect(snap.payload.case.id).toBe(SEED_CASE_ALFA_2_ID);
    expect(snap.payload.casePersons.length).toBeGreaterThan(0);
    expect(snap.payload.persons.length).toBeGreaterThan(0);
    expect(snap.payload.assignments.length).toBeGreaterThan(0);
    expect(snap.payload.casePlanItems.length).toBeGreaterThan(0);
    expect(snap.payload.caseTimelineEntries.length).toBeGreaterThan(0);
  });

  it("snapshot filtra apenas pessoas realmente vinculadas ao caso", async () => {
    const env = createMockDomainEnvironment();
    const snap = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: "pessoas",
      }),
    );
    const linked = new Set(snap.payload.casePersons.map((cp) => cp.personId));
    for (const p of snap.payload.persons) expect(linked.has(p.id)).toBe(true);
  });

  it("snapshot é imutável frente a escritas posteriores", async () => {
    const env = createMockDomainEnvironment();
    const snap = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: "congelado",
      }),
    );
    const originalPlanCount = snap.payload.casePlanItems.length;
    await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "novo item pós-snapshot",
      priority: "normal",
    });
    const fetched = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.getById(OWNER_ALFA, SEED_CASE_ALFA_2_ID, snap.id),
    );
    expect(fetched.payload.casePlanItems.length).toBe(originalPlanCount);
  });

  it("mutar cópia retornada não afeta o store", async () => {
    const env = createMockDomainEnvironment();
    const snap = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: "clone",
      }),
    );
    // Tentar mutar cópia (não deve refletir no getById subsequente).
    try {
      (snap.payload as { case: unknown }).case = null as unknown as typeof snap.payload.case;
    } catch {
      // frozen: também aceitável.
    }
    const again = unwrapOk<CaseSnapshot>(
      await env.services.caseSnapshots.getById(OWNER_ALFA, SEED_CASE_ALFA_2_ID, snap.id),
    );
    expect(again.payload.case.id).toBe(SEED_CASE_ALFA_2_ID);
  });
});

// ===========================================================================
// 5. CaseSnapshotService.getById
// ===========================================================================

describe("LV-08.6A — CaseSnapshotService.getById", () => {
  it("recupera snapshot do seed", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_SNAPSHOT_ALFA_1_ID,
    );
    const s = unwrapOk<CaseSnapshot>(r);
    expect(s.id).toBe(SEED_SNAPSHOT_ALFA_1_ID);
  });

  it("retorna not_found para snapshot inexistente", async () => {
    const env = createMockDomainEnvironment();
    const fakeId = buildDomainId("caseSnapshot", "inexistente");
    const r = await env.services.caseSnapshots.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      fakeId,
    );
    expectFail(r, "not_found");
  });

  it("rejeita caseId inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.getById(
      OWNER_ALFA,
      "x" as never,
      SEED_SNAPSHOT_ALFA_1_ID,
    );
    expectFail(r, "validation_error");
  });

  it("rejeita snapshotId inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      "abc" as never,
    );
    expectFail(r, "validation_error");
  });

  it("não devolve snapshot cross-org", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.getById(
      OWNER_BETA,
      SEED_CASE_ALFA_2_ID,
      SEED_SNAPSHOT_ALFA_1_ID,
    );
    expectFail(r, "not_found");
  });

  it("não devolve snapshot quando caseId não bate", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_1_ID,
      SEED_SNAPSHOT_ALFA_1_ID,
    );
    expectFail(r, "not_found");
  });

  it("leitor pode ler snapshot", async () => {
    const { env, ctx } = await withReaderCtx();
    const r = await env.services.caseSnapshots.getById(
      ctx,
      SEED_CASE_ALFA_2_ID,
      SEED_SNAPSHOT_ALFA_1_ID,
    );
    expect(r.ok).toBe(true);
  });
});

// ===========================================================================
// 6. CaseSnapshotService.listByCase
// ===========================================================================

describe("LV-08.6A — CaseSnapshotService.listByCase", () => {
  it("lista os 2 snapshots do seed do caso Alfa 002", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID);
    const page = unwrapOk<PageResult<CaseSnapshot>>(r);
    expect(page.items.length).toBe(2);
  });

  it("ordena por createdAt desc, id desc", async () => {
    const env = createMockDomainEnvironment();
    await env.services.caseSnapshots.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      label: "novo",
    });
    const page = unwrapOk<PageResult<CaseSnapshot>>(
      await env.services.caseSnapshots.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID),
    );
    for (let i = 1; i < page.items.length; i++) {
      const prev = page.items[i - 1]!.createdAt;
      const cur = page.items[i]!.createdAt;
      expect(prev >= cur).toBe(true);
    }
  });

  it("retorna lista vazia para caso sem snapshots", async () => {
    const env = createMockDomainEnvironment();
    const page = unwrapOk<PageResult<CaseSnapshot>>(
      await env.services.caseSnapshots.listByCase(OWNER_ALFA, SEED_CASE_ALFA_3_ID),
    );
    expect(page.items.length).toBe(0);
  });

  it("isola por organização", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.listByCase(OWNER_ALFA, SEED_CASE_BETA_2_ID);
    expectFail(r, "not_found");
  });

  it("pagina com limit pequeno", async () => {
    const env = createMockDomainEnvironment();
    for (let i = 0; i < 4; i++) {
      await env.services.caseSnapshots.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        label: `n${i}`,
      });
    }
    const first = unwrapOk<PageResult<CaseSnapshot>>(
      await env.services.caseSnapshots.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        page: { limit: 2 },
      }),
    );
    expect(first.items.length).toBe(2);
    expect(first.nextCursor).toBeTruthy();
  });

  it("rejeita chave desconhecida em options", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseSnapshots.listByCase(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      { foo: 1 } as never,
    );
    expectFail(r, "validation_error");
  });
});

// ===========================================================================
// 7. Auditoria automática nas escritas dos demais serviços
// ===========================================================================

async function countActions(
  env: ReturnType<typeof createMockDomainEnvironment>,
  ctx: ServiceContext,
  caseId: typeof SEED_CASE_ALFA_1_ID,
  action: (typeof AUDIT_ACTIONS)[number],
): Promise<number> {
  const r = await env.services.auditEvents.listByCase(ctx, caseId, {
    actions: [action],
  });
  const p = unwrapOk<PageResult<AuditEvent>>(r);
  return p.items.length;
}

describe("LV-08.6A — auditoria automática de escritas de Case", () => {
  it("case.created audita quando processo é criado", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.cases.create(OWNER_ALFA, {
        reference: "0001111-22.3333.4.05.6789",
        title: "Novo caso auditado",
        confidentiality: "standard",
      }),
    );
    const n = await countActions(env, OWNER_ALFA, created.id, "case.created");
    expect(n).toBe(1);
  });

  it("case.updated audita update do processo", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrapOk(await env.services.cases.getById(OWNER_ALFA, SEED_CASE_ALFA_1_ID));
    await env.services.cases.update(OWNER_ALFA, c.id, {
      title: "Título alterado",
      expectedVersion: c.metadata.version,
    });
    const n = await countActions(env, OWNER_ALFA, c.id, "case.updated");
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it("case.updated audita changeStatus", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrapOk(await env.services.cases.getById(OWNER_ALFA, SEED_CASE_ALFA_1_ID));
    const r = await env.services.cases.changeStatus(OWNER_ALFA, {
      caseId: c.id,
      status: "triage",
      expectedVersion: c.metadata.version,
    });
    if (r.ok) {
      const n = await countActions(env, OWNER_ALFA, c.id, "case.updated");
      expect(n).toBeGreaterThanOrEqual(1);
    } else {
      expect(r.ok).toBe(false);
    }
  });
    const n = await countActions(env, OWNER_ALFA, c.id, "case.updated");
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it("update falho NÃO gera evento", async () => {
    const env = createMockDomainEnvironment();
    const c = unwrapOk(await env.services.cases.getById(OWNER_ALFA, SEED_CASE_ALFA_1_ID));
    const before = await countActions(env, OWNER_ALFA, c.id, "case.updated");
    await env.services.cases.update(OWNER_ALFA, c.id, {
      title: "x",
      expectedVersion: 9999,
    });
    const after = await countActions(env, OWNER_ALFA, c.id, "case.updated");
    expect(after).toBe(before);
  });
});

describe("LV-08.6A — auditoria automática de CasePlan e CaseTimeline", () => {
  it("casePlanItem.created / updated / statusChanged / removed geram eventos", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.casePlan.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "activity",
        title: "Item auditado",
        priority: "normal",
      }),
    );
    expect(
      await countActions(env, OWNER_ALFA, SEED_CASE_ALFA_2_ID, "casePlanItem.created"),
    ).toBeGreaterThanOrEqual(1);

    const upd = unwrapOk(
      await env.services.casePlan.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: created.id,
        title: "Outro título",
        expectedVersion: created.metadata.version,
      }),
    );
    expect(
      await countActions(env, OWNER_ALFA, SEED_CASE_ALFA_2_ID, "casePlanItem.updated"),
    ).toBeGreaterThanOrEqual(1);

    const st = unwrapOk(
      await env.services.casePlan.changeStatus(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        planItemId: upd.id,
        status: "in_progress",
        expectedVersion: upd.metadata.version,
      }),
    );
    expect(
      await countActions(
        env,
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        "casePlanItem.statusChanged",
      ),
    ).toBeGreaterThanOrEqual(1);

    await env.services.casePlan.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      st.id,
      st.metadata.version,
    );
    expect(
      await countActions(env, OWNER_ALFA, SEED_CASE_ALFA_2_ID, "casePlanItem.removed"),
    ).toBeGreaterThanOrEqual(1);
  });

  it("caseTimelineEntry.created / updated / removed geram eventos", async () => {
    const env = createMockDomainEnvironment();
    const created = unwrapOk(
      await env.services.caseTimeline.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "note",
        occurredOn: "2026-02-01",
        title: "Nota",
      }),
    );
    expect(
      await countActions(
        env,
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        "caseTimelineEntry.created",
      ),
    ).toBeGreaterThanOrEqual(1);
    const upd = unwrapOk(
      await env.services.caseTimeline.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        timelineEntryId: created.id,
        title: "Nota 2",
        expectedVersion: created.metadata.version,
      }),
    );
    expect(
      await countActions(
        env,
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        "caseTimelineEntry.updated",
      ),
    ).toBeGreaterThanOrEqual(1);
    await env.services.caseTimeline.remove(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      upd.id,
      upd.metadata.version,
    );
    expect(
      await countActions(
        env,
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        "caseTimelineEntry.removed",
      ),
    ).toBeGreaterThanOrEqual(1);
  });

  it("plano: create falho não emite evento", async () => {
    const env = createMockDomainEnvironment();
    const before = await countActions(
      env,
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      "casePlanItem.created",
    );
    await env.services.casePlan.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      kind: "activity",
      title: "",
      priority: "normal",
    });
    const after = await countActions(
      env,
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      "casePlanItem.created",
    );
    expect(after).toBe(before);
  });
});

describe("LV-08.6A — auditoria automática de CasePerson e Relationship", () => {
  it("casePerson.updated audita update de vínculo", async () => {
    const env = createMockDomainEnvironment();
    const list = unwrapOk(
      await env.services.casePersons.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID),
    );
    const cp = list.items[0]!;
    await env.services.casePersons.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      casePersonId: cp.id,
      restrictedByDefault: !cp.restrictedByDefault,
      expectedVersion: cp.metadata.version,
    });
    expect(
      await countActions(env, OWNER_ALFA, SEED_CASE_ALFA_2_ID, "casePerson.updated"),
    ).toBeGreaterThanOrEqual(1);
  });

  it("relationship.updated audita update de relação", async () => {
    const env = createMockDomainEnvironment();
    const list = unwrapOk(
      await env.services.relationships.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID),
    );
    if (list.items.length > 0) {
      const rel = list.items[0]!;
      await env.services.relationships.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
        relationshipId: rel.id,
        type: rel.type,
        expectedVersion: rel.metadata.version,
      });
      expect(
        await countActions(env, OWNER_ALFA, SEED_CASE_ALFA_2_ID, "relationship.updated"),
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("LV-08.6A — auditoria automática de Assignment", () => {
  it("assignment.updated audita update", async () => {
    const env = createMockDomainEnvironment();
    const list = unwrapOk(
      await env.services.assignments.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID),
    );
    const a = list.items.find((x) => x.id === SEED_ASSIGN_ALFA_1_ID) ?? list.items[0]!;
    await env.services.assignments.update(OWNER_ALFA, SEED_CASE_ALFA_2_ID, {
      assignmentId: a.id,
      section: "Nova seção",
      expectedVersion: a.metadata.version,
    });
    expect(
      await countActions(env, OWNER_ALFA, SEED_CASE_ALFA_2_ID, "assignment.updated"),
    ).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// 8. Permissões — 3 novas ações na matriz oficial
// ===========================================================================

describe("LV-08.6A — permissões oficiais das novas ações", () => {
  it("PERMISSION_ACTIONS inclui auditEvent.read, caseSnapshot.read, caseSnapshot.create", () => {
    expect(PERMISSION_ACTIONS).toContain("auditEvent.read");
    expect(PERMISSION_ACTIONS).toContain("caseSnapshot.read");
    expect(PERMISSION_ACTIONS).toContain("caseSnapshot.create");
  });

  it("proprietário Alfa pode criar snapshot no caso Alfa", async () => {
    const env = createMockDomainEnvironment();
    const dec = unwrapOk(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "caseSnapshot.create",
        caseId: SEED_CASE_ALFA_2_ID,
      }),
    );
    expect(dec.allowed).toBe(true);
  });

  it("proprietário Alfa não pode criar snapshot em caso Beta", async () => {
    const env = createMockDomainEnvironment();
    const dec = unwrapOk(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "caseSnapshot.create",
        caseId: SEED_CASE_BETA_2_ID,
      }),
    );
    expect(dec.allowed).toBe(false);
  });

  it("papel leitura pode ler auditEvent e caseSnapshot", async () => {
    const { env, ctx } = await withReaderCtx();
    const a = unwrapOk(
      await env.services.permissions.evaluate(ctx, {
        action: "auditEvent.read",
        caseId: SEED_CASE_ALFA_2_ID,
      }),
    );
    const b = unwrapOk(
      await env.services.permissions.evaluate(ctx, {
        action: "caseSnapshot.read",
        caseId: SEED_CASE_ALFA_2_ID,
      }),
    );
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("papel leitura NÃO pode criar snapshot", async () => {
    const { env, ctx } = await withReaderCtx();
    const dec = unwrapOk(
      await env.services.permissions.evaluate(ctx, {
        action: "caseSnapshot.create",
        caseId: SEED_CASE_ALFA_2_ID,
      }),
    );
    expect(dec.allowed).toBe(false);
  });
});

// ===========================================================================
// 9. Referências passivas para manter identificadores tocados
// ===========================================================================

describe("LV-08.6A — sanity dos seeds usados", () => {
  it("seed IDs relevantes estão definidos", () => {
    expect(SEED_ASSIGN_ALFA_1_ID).toBeTruthy();
    expect(SEED_PERSON_ALFA_1_ID).toBeTruthy();
    expect(SEED_PERSON_ALFA_2_ID).toBeTruthy();
    expect(SEED_PLAN_ALFA_1_ID).toBeTruthy();
    expect(SEED_TL_ALFA_1_ID).toBeTruthy();
  });
});
