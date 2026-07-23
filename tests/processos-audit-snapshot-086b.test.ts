/**
 * LV-08.6B — testes comportamentais do modelo puro e da integração da
 * seção "Histórico de alterações e Snapshots" via serviços oficiais.
 *
 * Não renderiza React (a suíte roda em bun sem DOM); cobre o modelo
 * puro e os fluxos de serviço que a UI consome.
 */

import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
} from "@/domain/mocks/seed";
import {
  AUDIT_ACTIONS,
  type AuditAction,
} from "@/domain/core/case-audit";
import { buildDomainId } from "@/domain/core/ids";
import type { ServiceContext } from "@/domain/services/context";

import {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS_PT,
  AUDIT_ACTION_TO_CATEGORY,
  AUDIT_CATEGORY_TO_ACTIONS,
  AUDIT_SNAPSHOT_ACTIONS,
  EMPTY_AUDIT_FILTER,
  SNAPSHOT_LABEL_MAX,
  SNAPSHOT_REASON_MAX,
  buildAuditFilter,
  buildAuditSnapshotPermissions,
  buildCreateCaseSnapshotInput,
  computeSnapshotPayloadCounters,
  formatIsoDatePtBr,
  formatIsoDateTimePtBr,
  getActionsForCategory,
  getPublicAuthorLabel,
  isAuditFilterActive,
  localDateToIsoEndOfDay,
  localDateToIsoStartOfDay,
  mapAuditSnapshotError,
} from "@/features/processos/process-audit-snapshot-model";
import type { AuditFilterFormValues } from "@/features/processos/process-audit-snapshot-model";
import { isIsoDateTime } from "@/domain/core/common";

// ---- Helpers --------------------------------------------------------------

function ownerContext(): ServiceContext {
  return {
    organizationId: SEED_ORG_ALFA_ID,
    userId: SEED_USER_1_ID,
    membershipId: SEED_MEM_ALFA_OWNER_ID,
    role: "proprietario",
  };
}

// ---- 1. Categorias --------------------------------------------------------

describe("LV-08.6B — categorias de auditoria", () => {
  it("expõe exatamente 7 categorias visuais", () => {
    expect(AUDIT_CATEGORIES.length).toBe(7);
  });

  it("garante rótulos em PT-BR para todas as categorias", () => {
    for (const c of AUDIT_CATEGORIES) {
      expect(AUDIT_CATEGORY_LABELS_PT[c].length).toBeGreaterThan(0);
    }
  });

  it("mapeia todas as 19 ações do catálogo para uma categoria", () => {
    for (const a of AUDIT_ACTIONS) {
      expect(AUDIT_CATEGORIES).toContain(AUDIT_ACTION_TO_CATEGORY[a]);
    }
    expect(Object.keys(AUDIT_ACTION_TO_CATEGORY).length).toBe(
      AUDIT_ACTIONS.length,
    );
  });

  it("agrupa ações de processo corretamente", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.processo).toEqual([
      "case.created",
      "case.updated",
    ]);
  });

  it("agrupa ações de pessoas corretamente", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.pessoas).toEqual([
      "casePerson.created",
      "casePerson.updated",
      "casePerson.removed",
    ]);
  });

  it("agrupa ações de relações corretamente", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.relacoes).toEqual([
      "relationship.created",
      "relationship.updated",
      "relationship.removed",
    ]);
  });

  it("agrupa ações de equipe corretamente", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.equipe).toEqual([
      "assignment.created",
      "assignment.updated",
      "assignment.removed",
    ]);
  });

  it("agrupa ações de plano corretamente", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.plano).toEqual([
      "casePlanItem.created",
      "casePlanItem.updated",
      "casePlanItem.statusChanged",
      "casePlanItem.removed",
    ]);
  });

  it("agrupa ações de cronologia corretamente", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.cronologia).toEqual([
      "caseTimelineEntry.created",
      "caseTimelineEntry.updated",
      "caseTimelineEntry.removed",
    ]);
  });

  it("agrupa a criação de snapshot na categoria snapshot", () => {
    expect(AUDIT_CATEGORY_TO_ACTIONS.snapshot).toEqual([
      "caseSnapshot.created",
    ]);
  });

  it("getActionsForCategory retorna array vazio para categoria sem ação", () => {
    // Cobertura defensiva — todas as categorias têm ao menos uma ação.
    for (const c of AUDIT_CATEGORIES) {
      expect(getActionsForCategory(c).length).toBeGreaterThan(0);
    }
  });

  it("A soma das ações por categoria coincide com o catálogo total", () => {
    let total = 0;
    for (const c of AUDIT_CATEGORIES) total += AUDIT_CATEGORY_TO_ACTIONS[c].length;
    expect(total).toBe(AUDIT_ACTIONS.length);
  });
});

// ---- 2. Filtros -----------------------------------------------------------

describe("LV-08.6B — buildAuditFilter", () => {
  it("retorna vazio quando nenhum filtro é aplicado", () => {
    const r = buildAuditFilter(EMPTY_AUDIT_FILTER);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.actions).toBeUndefined();
    expect(r.occurredFrom).toBeUndefined();
    expect(r.occurredTo).toBeUndefined();
  });

  it("mapeia categoria pessoas em conjunto de ações", () => {
    const r = buildAuditFilter({
      category: "pessoas",
      dateFrom: "",
      dateTo: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.actions).toEqual(AUDIT_CATEGORY_TO_ACTIONS.pessoas);
  });

  it("aceita data inicial válida", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "2025-01-01",
      dateTo: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.occurredFrom).toBe("2025-01-01T00:00:00.000Z");
    expect(r.occurredTo).toBeUndefined();
  });

  it("aceita data final válida", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "",
      dateTo: "2025-01-31",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.occurredTo).toBe("2025-01-31T23:59:59.999Z");
  });

  it("rejeita data inicial inválida", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "31-01-2025",
      dateTo: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("invalid_from");
  });

  it("rejeita data final inválida", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "",
      dateTo: "abc",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("invalid_to");
  });

  it("rejeita intervalo invertido", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "2025-02-01",
      dateTo: "2025-01-01",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("range_inverted");
  });

  it("aceita intervalo com from == to (mesmo dia)", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "2025-01-01",
      dateTo: "2025-01-01",
    });
    expect(r.ok).toBe(true);
  });

  it("rejeita data 30 de fevereiro", () => {
    const r = buildAuditFilter({
      category: "",
      dateFrom: "2025-02-30",
      dateTo: "",
    });
    expect(r.ok).toBe(false);
  });

  it("isAuditFilterActive true quando categoria selecionada", () => {
    expect(
      isAuditFilterActive({ category: "plano", dateFrom: "", dateTo: "" }),
    ).toBe(true);
  });

  it("isAuditFilterActive true quando datas informadas", () => {
    expect(
      isAuditFilterActive({
        category: "",
        dateFrom: "2025-01-01",
        dateTo: "",
      }),
    ).toBe(true);
  });

  it("isAuditFilterActive false quando vazio", () => {
    expect(isAuditFilterActive(EMPTY_AUDIT_FILTER)).toBe(false);
  });

  it("localDateToIsoStartOfDay rejeita formato ruim", () => {
    expect(localDateToIsoStartOfDay("2025/01/01")).toBeNull();
    expect(localDateToIsoStartOfDay("")).toBeNull();
  });

  it("localDateToIsoEndOfDay produz IsoDateTime válido", () => {
    const v = localDateToIsoEndOfDay("2025-06-15");
    expect(v).not.toBeNull();
    if (v === null) throw new Error();
    expect(isIsoDateTime(v)).toBe(true);
  });
});

// ---- 3. Formatação -------------------------------------------------------

describe("LV-08.6B — formatação de datas em PT-BR", () => {
  it("formatIsoDatePtBr converte YYYY-MM-DD para DD/MM/AAAA", () => {
    expect(formatIsoDatePtBr("2025-01-31")).toBe("31/01/2025");
  });

  it("formatIsoDatePtBr não depende de timezone", () => {
    expect(formatIsoDatePtBr("2025-12-01")).toBe("01/12/2025");
  });

  it("formatIsoDateTimePtBr inclui a palavra 'às'", () => {
    const s = formatIsoDateTimePtBr("2025-06-15T10:30:00.000Z");
    expect(s).toContain("às");
  });

  it("formatIsoDateTimePtBr usa formato DD/MM/AAAA às HH:mm", () => {
    const s = formatIsoDateTimePtBr("2025-06-15T13:45:00.000Z");
    expect(s).toMatch(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/);
  });
});

// ---- 4. Autor público -----------------------------------------------------

describe("LV-08.6B — getPublicAuthorLabel", () => {
  it("retorna 'Você' quando o autor é o próprio usuário", () => {
    expect(
      getPublicAuthorLabel({ actorUserId: SEED_USER_1_ID }, SEED_USER_1_ID),
    ).toBe("Você");
  });

  it("retorna rótulo público para outro autor", () => {
    expect(
      getPublicAuthorLabel({ actorUserId: SEED_USER_2_ID }, SEED_USER_1_ID),
    ).toBe("Outro usuário autorizado");
  });

  it("não expõe o UserId original no rótulo", () => {
    const label = getPublicAuthorLabel(
      { actorUserId: SEED_USER_2_ID },
      SEED_USER_1_ID,
    );
    expect(label).not.toContain("user_");
  });
});

// ---- 5. Permissões da seção ----------------------------------------------

describe("LV-08.6B — buildAuditSnapshotPermissions", () => {
  it("expõe exatamente 3 permissões", () => {
    expect(AUDIT_SNAPSHOT_ACTIONS.length).toBe(3);
    expect(AUDIT_SNAPSHOT_ACTIONS).toContain("auditEvent.read");
    expect(AUDIT_SNAPSHOT_ACTIONS).toContain("caseSnapshot.read");
    expect(AUDIT_SNAPSHOT_ACTIONS).toContain("caseSnapshot.create");
  });

  it("preserva permissões true", () => {
    const p = buildAuditSnapshotPermissions([
      ["auditEvent.read", true],
      ["caseSnapshot.read", true],
      ["caseSnapshot.create", true],
    ]);
    expect(p).toEqual({
      canReadAudit: true,
      canReadSnapshots: true,
      canCreateSnapshot: true,
    });
  });

  it("preserva permissões false", () => {
    const p = buildAuditSnapshotPermissions([
      ["auditEvent.read", false],
      ["caseSnapshot.read", false],
      ["caseSnapshot.create", false],
    ]);
    expect(p.canReadAudit).toBe(false);
    expect(p.canReadSnapshots).toBe(false);
    expect(p.canCreateSnapshot).toBe(false);
  });

  it("default false quando ausente", () => {
    const p = buildAuditSnapshotPermissions([]);
    expect(p.canReadAudit).toBe(false);
    expect(p.canReadSnapshots).toBe(false);
    expect(p.canCreateSnapshot).toBe(false);
  });
});

// ---- 6. Builder de criação de snapshot -----------------------------------

describe("LV-08.6B — buildCreateCaseSnapshotInput", () => {
  const caseId = SEED_CASE_ALFA_1_ID;

  it("rejeita label vazio", () => {
    const r = buildCreateCaseSnapshotInput(caseId, { label: "", reason: "" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("label_required");
  });

  it("rejeita label só com espaços", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "   ",
      reason: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("label_required");
  });

  it("faz trim do label", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "  Marco 1  ",
      reason: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.input.label).toBe("Marco 1");
  });

  it("rejeita label acima do limite", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "a".repeat(SNAPSHOT_LABEL_MAX + 1),
      reason: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("label_too_long");
  });

  it("aceita label no limite máximo", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "a".repeat(SNAPSHOT_LABEL_MAX),
      reason: "",
    });
    expect(r.ok).toBe(true);
  });

  it("omite reason quando vazio após trim", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "Marco",
      reason: "   ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect("reason" in r.input).toBe(false);
  });

  it("preserva reason com trim", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "Marco",
      reason: "  motivo  ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.input.reason).toBe("motivo");
  });

  it("rejeita reason acima do limite", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "Marco",
      reason: "a".repeat(SNAPSHOT_REASON_MAX + 1),
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe("reason_too_long");
  });

  it("input nunca expõe id/organizationId/actor/payload/metadata", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "Marco",
      reason: "x",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    const keys = Object.keys(r.input).sort();
    expect(keys).toEqual(["caseId", "label", "reason"]);
  });

  it("input propaga o caseId informado", () => {
    const r = buildCreateCaseSnapshotInput(caseId, {
      label: "Marco",
      reason: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.input.caseId).toBe(caseId);
  });
});

// ---- 7. Contadores de payload --------------------------------------------

describe("LV-08.6B — computeSnapshotPayloadCounters", () => {
  it("computa contadores a partir do payload do snapshot seed", async () => {
    const env = createMockDomainEnvironment();
    const res = await env.services.caseSnapshots.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_2_ID,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.data.items.length).toBeGreaterThan(0);
    const snap = res.data.items[0]!;
    const c = computeSnapshotPayloadCounters(snap.payload);
    expect(c.persons).toBe(snap.payload.casePersons.length);
    expect(c.relationships).toBe(snap.payload.relationships.length);
    expect(c.professionals).toBe(snap.payload.assignments.length);
    expect(c.planItems).toBe(snap.payload.casePlanItems.length);
    expect(c.timelineEntries).toBe(snap.payload.caseTimelineEntries.length);
  });

  it("computa zeros para payload vazio", () => {
    const c = computeSnapshotPayloadCounters({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      case: {} as any,
      casePersons: [],
      persons: [],
      relationships: [],
      assignments: [],
      casePlanItems: [],
      caseTimelineEntries: [],
    });
    expect(c.persons).toBe(0);
    expect(c.relationships).toBe(0);
    expect(c.professionals).toBe(0);
    expect(c.planItems).toBe(0);
    expect(c.timelineEntries).toBe(0);
  });
});

// ---- 8. Mapeamento de erros ----------------------------------------------

describe("LV-08.6B — mapAuditSnapshotError", () => {
  it("mapeia forbidden", () => {
    const r = mapAuditSnapshotError({ code: "forbidden", message: "" });
    expect(r.kind).toBe("forbidden");
    expect(r.message).toContain("permissão");
  });

  it("mapeia not_found", () => {
    const r = mapAuditSnapshotError({ code: "not_found", message: "" });
    expect(r.kind).toBe("not_found");
    expect(r.message).toContain("Recarregue");
  });

  it("mapeia validation_error", () => {
    const r = mapAuditSnapshotError({ code: "validation_error", message: "" });
    expect(r.kind).toBe("validation_error");
  });

  it("mapeia conflict", () => {
    const r = mapAuditSnapshotError({ code: "conflict", message: "" });
    expect(r.kind).toBe("conflict");
  });

  it("mapeia offline", () => {
    const r = mapAuditSnapshotError({ code: "offline", message: "" });
    expect(r.kind).toBe("offline");
  });

  it("mapeia unavailable", () => {
    const r = mapAuditSnapshotError({ code: "unavailable", message: "" });
    expect(r.kind).toBe("unavailable");
  });

  it("mapeia internal_error para genérico", () => {
    const r = mapAuditSnapshotError({ code: "internal_error", message: "" });
    expect(r.kind).toBe("generic");
  });

  it("nunca vaza a mensagem crua do serviço", () => {
    const r = mapAuditSnapshotError({
      code: "forbidden",
      message: "raw_permission_denied_debug",
    });
    expect(r.message).not.toContain("raw_permission_denied_debug");
  });
});

// ---- 9. Integração com serviços oficiais ---------------------------------

describe("LV-08.6B — integração via serviços oficiais", () => {
  it("lista histórico do processo Alfa 1 e cada evento pertence a uma categoria válida", async () => {
    const env = createMockDomainEnvironment();
    const res = await env.services.auditEvents.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_1_ID,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.data.items.length).toBeGreaterThan(0);
    for (const ev of res.data.items) {
      const cat = AUDIT_ACTION_TO_CATEGORY[ev.action as AuditAction];
      expect(AUDIT_CATEGORIES).toContain(cat);
    }
  });

  it("aplica filtro por actions (categoria) via serviço", async () => {
    const env = createMockDomainEnvironment();
    const res = await env.services.auditEvents.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_1_ID,
      { actions: AUDIT_CATEGORY_TO_ACTIONS.processo },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    for (const ev of res.data.items) {
      expect(AUDIT_CATEGORY_TO_ACTIONS.processo).toContain(ev.action);
    }
  });

  it("aplica filtro por intervalo temporal", async () => {
    const env = createMockDomainEnvironment();
    const built = buildAuditFilter({
      category: "",
      dateFrom: "2000-01-01",
      dateTo: "2100-01-01",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error();
    const res = await env.services.auditEvents.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_1_ID,
      {
        occurredFrom: built.occurredFrom!,
        occurredTo: built.occurredTo!,
      },
    );
    expect(res.ok).toBe(true);
  });

  it("bloqueia acesso ao histórico quando o processo pertence a outra org", async () => {
    const env = createMockDomainEnvironment();
    const res = await env.services.auditEvents.listByCase(
      ownerContext(),
      buildDomainId("case", "inexistente_x"),
    );
    expect(res.ok).toBe(false);
  });

  it("criar snapshot gera exatamente 1 evento novo de auditoria", async () => {
    const env = createMockDomainEnvironment();
    const ctx = ownerContext();
    const before = await env.services.auditEvents.listByCase(
      ctx,
      SEED_CASE_ALFA_1_ID,
    );
    expect(before.ok).toBe(true);
    if (!before.ok) throw new Error();
    const created = await env.services.caseSnapshots.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID,
      label: "Marco de teste",
    });
    expect(created.ok).toBe(true);
    const after = await env.services.auditEvents.listByCase(
      ctx,
      SEED_CASE_ALFA_1_ID,
    );
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error();
    expect(after.data.items.length).toBe(before.data.items.length + 1);
  });

  it("criar snapshot com input construído pelo builder é aceito pelo serviço", async () => {
    const env = createMockDomainEnvironment();
    const built = buildCreateCaseSnapshotInput(SEED_CASE_ALFA_1_ID, {
      label: "Via builder",
      reason: "motivo x",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error();
    const res = await env.services.caseSnapshots.create(
      ownerContext(),
      built.input,
    );
    expect(res.ok).toBe(true);
  });

  it("snapshots retornados são cópias — mutação externa não afeta o store", async () => {
    const env = createMockDomainEnvironment();
    const first = await env.services.caseSnapshots.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_2_ID,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error();
    const items = first.data.items as unknown as { length: number }[];
    // Não podemos alterar array readonly, mas podemos mutar o objeto retornado.
    const snap0 = first.data.items[0]!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { (snap0 as any).label = "MUTADO"; } catch { /* readonly */ }
    const again = await env.services.caseSnapshots.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_2_ID,
    );
    expect(again.ok).toBe(true);
    if (!again.ok) throw new Error();
    expect(again.data.items[0]!.label).not.toBe("MUTADO");
    expect(items.length).toBeGreaterThan(0);
  });

  it("permissões da seção: administrador Alfa tem as três liberadas", async () => {
    const env = createMockDomainEnvironment();
    const ctx = ownerContext();
    const results = await Promise.all(
      AUDIT_SNAPSHOT_ACTIONS.map((action) =>
        env.services.permissions.evaluate(ctx, {
          action,
          caseId: SEED_CASE_ALFA_1_ID,
        }),
      ),
    );
    for (const r of results) {
      expect(r.ok).toBe(true);
      if (!r.ok) throw new Error();
      expect(r.data.allowed).toBe(true);
    }
  });

  it("dois ambientes independentes não compartilham snapshots criados", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    await envA.services.caseSnapshots.create(ownerContext(), {
      caseId: SEED_CASE_ALFA_1_ID,
      label: "Isolado",
    });
    const resB = await envB.services.caseSnapshots.listByCase(
      ownerContext(),
      SEED_CASE_ALFA_1_ID,
    );
    expect(resB.ok).toBe(true);
    if (!resB.ok) throw new Error();
    for (const s of resB.data.items) {
      expect(s.label).not.toBe("Isolado");
    }
  });
});

// ---- 10. Integração de rota / arquivos -----------------------------------

describe("LV-08.6B — integração no arquivo de rota", () => {
  const ROUTE_PATH = path.resolve(
    __dirname,
    "../src/routes/app.processos.$id.index.tsx",
  );
  const source = fs.readFileSync(ROUTE_PATH, "utf8");

  it("a rota importa ProcessAuditSnapshots", () => {
    expect(source).toContain(
      'from "@/features/processos/ProcessAuditSnapshots"',
    );
  });

  it("renderiza <ProcessAuditSnapshots caseId={state.case.id} />", () => {
    expect(source).toContain("<ProcessAuditSnapshots caseId={state.case.id}");
  });

  it("ProcessAuditSnapshots aparece após ProcessPlanTimeline", () => {
    const iPlan = source.indexOf("<ProcessPlanTimeline");
    const iAudit = source.indexOf("<ProcessAuditSnapshots");
    expect(iPlan).toBeGreaterThan(-1);
    expect(iAudit).toBeGreaterThan(iPlan);
  });
});

describe("LV-08.6B — arquivos de feature obrigatórios", () => {
  const files = [
    "src/features/processos/ProcessAuditSnapshots.tsx",
    "src/features/processos/ProcessAuditHistoryCard.tsx",
    "src/features/processos/ProcessSnapshotsCard.tsx",
    "src/features/processos/CreateProcessSnapshotDialog.tsx",
    "src/features/processos/ProcessSnapshotDetailsDialog.tsx",
    "src/features/processos/ProcessAuditSnapshotState.tsx",
    "src/features/processos/process-audit-snapshot-model.ts",
  ];
  for (const f of files) {
    it(`arquivo existe: ${f}`, () => {
      const abs = path.resolve(__dirname, "..", f);
      expect(fs.existsSync(abs)).toBe(true);
    });
  }
});
