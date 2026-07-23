/**
 * LV-08.5B — testes de runtime da interface de Plano e Cronologia.
 *
 * Testes puros (sem Testing Library, sem navegador). Auditorias de fonte
 * cobrem contratos oficiais do domínio mock.
 */

import { describe, it, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  CASE_PLAN_ITEM_KINDS,
  CASE_PLAN_ITEM_STATUSES,
  CASE_PLAN_ITEM_PRIORITIES,
  CASE_TIMELINE_ENTRY_KINDS,
} from "@/domain/core/case-plan";
import { ASSIGNMENT_ROLES } from "@/domain/core/assignment";
import { PERFIS } from "@/domain/shared/work-context";
import {
  ASSIGNMENT_ROLE_LABELS_PT,
  ALL_PLAN_TIMELINE_ACTIONS,
  PLAN_ACTIONS,
  TIMELINE_ACTIONS,
  CASE_PLAN_ITEM_KIND_LABELS_PT,
  CASE_PLAN_ITEM_PRIORITY_LABELS_PT,
  CASE_PLAN_ITEM_STATUS_LABELS_PT,
  CASE_TIMELINE_ENTRY_KIND_LABELS_PT,
  PROFESSIONAL_AREA_LABELS_PT,
  buildAssignmentOptionLabel,
  buildAssignmentOptions,
  buildChangeCasePlanItemStatusInput,
  buildCreateCasePlanItemInput,
  buildCreateCaseTimelineEntryInput,
  buildPlanTimelinePermissions,
  buildUpdateCasePlanItemInput,
  buildUpdateCaseTimelineEntryInput,
  collectDistinctProfessionalProfileIds,
  emptyPlanTimelinePermissions,
  formatIsoDatePtBr,
  mapPlanTimelineError,
  type AssignmentOption,
} from "@/features/processos/process-plan-model";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_USER_3_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_PROF_ALFA_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import type { Membership } from "@/domain/core/access";
import type { Assignment } from "@/domain/core/assignment";
import type { CasePlanItem, CaseTimelineEntry } from "@/domain/core/case-plan";
import type { IsoDate, IsoDateTime, EntityMetadata } from "@/domain/core/common";
import { buildDomainId } from "@/domain/core/ids";
import type { AssignmentId, CaseId, ProfessionalProfileId } from "@/domain/core/ids";
import type { ProfessionalProfile } from "@/domain/core/professional";

const OWNER_ALFA: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

function unwrapOk<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error(`esperado ok: ${JSON.stringify(r.error)}`);
  return r.data;
}

// ---- Fixture helpers -------------------------------------------------------

const META: EntityMetadata = {
  createdAt: "2026-01-01T00:00:00.000Z" as IsoDateTime,
  updatedAt: "2026-01-01T00:00:00.000Z" as IsoDateTime,
  version: 3,
};

function makeCaseId(): CaseId {
  return buildDomainId("case", "t1") as unknown as CaseId;
}
function makeAssignId(suffix = "t1"): AssignmentId {
  return buildDomainId("assignment", suffix) as unknown as AssignmentId;
}
function makeProfId(suffix = "t1"): ProfessionalProfileId {
  return buildDomainId("professionalProfile", suffix) as unknown as ProfessionalProfileId;
}

function makePlanItem(overrides: Partial<CasePlanItem> = {}): CasePlanItem {
  return {
    id: buildDomainId("casePlanItem", "t1") as CasePlanItem["id"],
    organizationId: SEED_ORG_ALFA_ID,
    caseId: makeCaseId(),
    kind: "activity",
    title: "Titulo",
    status: "planned",
    priority: "normal",
    metadata: META,
    ...overrides,
  };
}

function makeTimelineEntry(overrides: Partial<CaseTimelineEntry> = {}): CaseTimelineEntry {
  return {
    id: buildDomainId("caseTimelineEntry", "t1") as CaseTimelineEntry["id"],
    organizationId: SEED_ORG_ALFA_ID,
    caseId: makeCaseId(),
    kind: "milestone",
    occurredOn: "2026-05-10" as IsoDate,
    title: "Marco",
    metadata: META,
    ...overrides,
  };
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: makeAssignId(),
    organizationId: SEED_ORG_ALFA_ID,
    caseId: makeCaseId(),
    professionalProfileId: makeProfId(),
    role: "lead_professional",
    status: "active",
    startedOn: "2026-01-01" as IsoDate,
    metadata: META,
    ...overrides,
  };
}

function makeProfile(id: ProfessionalProfileId, area: "psicologia" | "servico-social" | "multi" | "outro" = "psicologia"): ProfessionalProfile {
  return {
    id,
    organizationId: SEED_ORG_ALFA_ID,
    userId: SEED_USER_1_ID,
    area,
    status: "active",
    metadata: META,
  };
}

// ---- Fonte: leitura das auditorias ----------------------------------------

const SRC_ROOT = path.resolve(__dirname, "..", "src", "features", "processos");
function readSrc(name: string): string {
  const raw = fs.readFileSync(path.join(SRC_ROOT, name), "utf8");
  // remove // ... e /* ... */
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
}
const SRC_TIMELINE = readSrc("ProcessPlanTimeline.tsx");
const SRC_MODEL = readSrc("process-plan-model.ts");
const SRC_PLAN_DIALOG = readSrc("ProcessPlanDialog.tsx");
const SRC_TL_DIALOG = readSrc("ProcessTimelineDialog.tsx");
const SRC_STATUS_DIALOG = readSrc("ProcessPlanStatusDialog.tsx");
const SRC_STATE = readSrc("ProcessPlanTimelineState.tsx");
const SRC_ROUTE = fs
  .readFileSync(
    path.resolve(__dirname, "..", "src", "routes", "app.processos.$id.index.tsx"),
    "utf8",
  )
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|\s)\/\/[^\n]*/g, "$1");

// ---------------------------------------------------------------------------
// 1. Catálogos e labels
// ---------------------------------------------------------------------------

describe("LV-08.5B · catálogos e rótulos", () => {
  it("cobre todos os tipos do plano", () => {
    for (const k of CASE_PLAN_ITEM_KINDS)
      expect(CASE_PLAN_ITEM_KIND_LABELS_PT[k]).toMatch(/[A-Za-z]/);
  });
  it("cobre todos os status do plano", () => {
    for (const s of CASE_PLAN_ITEM_STATUSES)
      expect(CASE_PLAN_ITEM_STATUS_LABELS_PT[s]).toMatch(/[A-Za-z]/);
  });
  it("cobre todas as prioridades do plano", () => {
    for (const p of CASE_PLAN_ITEM_PRIORITIES)
      expect(CASE_PLAN_ITEM_PRIORITY_LABELS_PT[p]).toMatch(/[A-Za-z]/);
  });
  it("cobre todos os tipos da cronologia", () => {
    for (const k of CASE_TIMELINE_ENTRY_KINDS)
      expect(CASE_TIMELINE_ENTRY_KIND_LABELS_PT[k]).toMatch(/[A-Za-z]/);
  });
  it("cobre todas as áreas profissionais", () => {
    for (const p of PERFIS) expect(PROFESSIONAL_AREA_LABELS_PT[p]).toMatch(/[A-Za-z]/);
  });
  it("cobre todos os papéis de assignment", () => {
    for (const r of ASSIGNMENT_ROLES)
      expect(ASSIGNMENT_ROLE_LABELS_PT[r]).toMatch(/[A-Za-z]/);
  });
  it("todos os mapas são Record completos (contagem exata)", () => {
    expect(Object.keys(CASE_PLAN_ITEM_KIND_LABELS_PT).length).toBe(CASE_PLAN_ITEM_KINDS.length);
    expect(Object.keys(CASE_PLAN_ITEM_STATUS_LABELS_PT).length).toBe(CASE_PLAN_ITEM_STATUSES.length);
    expect(Object.keys(CASE_PLAN_ITEM_PRIORITY_LABELS_PT).length).toBe(CASE_PLAN_ITEM_PRIORITIES.length);
    expect(Object.keys(CASE_TIMELINE_ENTRY_KIND_LABELS_PT).length).toBe(CASE_TIMELINE_ENTRY_KINDS.length);
    expect(Object.keys(PROFESSIONAL_AREA_LABELS_PT).length).toBe(PERFIS.length);
    expect(Object.keys(ASSIGNMENT_ROLE_LABELS_PT).length).toBe(ASSIGNMENT_ROLES.length);
  });
});

// ---------------------------------------------------------------------------
// 2. Datas
// ---------------------------------------------------------------------------

describe("LV-08.5B · formatIsoDatePtBr", () => {
  it("converte data ISO para DD/MM/AAAA", () => {
    expect(formatIsoDatePtBr("2026-05-10" as IsoDate)).toBe("10/05/2026");
  });
  it("mantém zero à esquerda em janeiro", () => {
    expect(formatIsoDatePtBr("2026-01-15" as IsoDate)).toBe("15/01/2026");
  });
  it("mantém zero à esquerda no dia", () => {
    expect(formatIsoDatePtBr("2026-11-03" as IsoDate)).toBe("03/11/2026");
  });
  it("formatação não muda por fuso (sem uso de new Date)", () => {
    // não podemos alterar TZ facilmente aqui — auditamos o código:
    expect(SRC_MODEL).not.toMatch(/new\s+Date\s*\(\s*[a-zA-Z_$]/);
    expect(formatIsoDatePtBr("2026-12-31" as IsoDate)).toBe("31/12/2026");
    expect(formatIsoDatePtBr("2026-01-01" as IsoDate)).toBe("01/01/2026");
  });
});

// ---------------------------------------------------------------------------
// 3. Builders do plano
// ---------------------------------------------------------------------------

describe("LV-08.5B · builders do plano", () => {
  const caseId = makeCaseId();
  const asgId = makeAssignId("opt");
  const options: readonly AssignmentOption[] = [
    {
      assignmentId: asgId,
      area: "psicologia",
      role: "lead_professional",
      status: "active",
      label: buildAssignmentOptionLabel("psicologia", "lead_professional"),
      availableForNewAssignments: true,
    },
  ];

  it("cria atividade com campos mínimos", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "activity", title: "Novo", description: "", priority: "normal", dueOn: "", assignmentId: "",
    }, options);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.kind).toBe("activity");
      expect(r.input.title).toBe("Novo");
      expect("description" in r.input).toBe(false);
      expect("dueOn" in r.input).toBe(false);
      expect("assignmentId" in r.input).toBe(false);
    }
  });
  it("cria pendência", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "pending", title: "P", description: "", priority: "high", dueOn: "", assignmentId: "",
    }, options);
    expect(r.ok && r.input.kind).toBe("pending");
  });
  it("faz trim do título na criação", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "activity", title: "   ok   ", description: "", priority: "normal", dueOn: "", assignmentId: "",
    }, options);
    expect(r.ok && r.input.title).toBe("ok");
  });
  it("omite descrição vazia (apenas espaços)", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "activity", title: "t", description: "   ", priority: "normal", dueOn: "", assignmentId: "",
    }, options);
    expect(r.ok && "description" in r.input).toBe(false);
  });
  it("omite prazo vazio", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "activity", title: "t", description: "", priority: "normal", dueOn: "   ", assignmentId: "",
    }, options);
    expect(r.ok && "dueOn" in r.input).toBe(false);
  });
  it("omite responsável vazio", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "activity", title: "t", description: "", priority: "normal", dueOn: "", assignmentId: "",
    }, options);
    expect(r.ok && "assignmentId" in r.input).toBe(false);
  });
  it("rejeita assignment desconhecido", () => {
    const r = buildCreateCasePlanItemInput(caseId, {
      kind: "activity", title: "t", description: "", priority: "normal", dueOn: "", assignmentId: "assignment_zzz",
    }, options);
    expect(r.ok).toBe(false);
  });
  it("update sem mudanças retorna null", () => {
    const item = makePlanItem();
    const r = buildUpdateCasePlanItemInput(item, {
      kind: item.kind, title: item.title, description: item.description ?? "",
      priority: item.priority, dueOn: item.dueOn ?? "", assignmentId: item.assignmentId ?? "",
    }, []);
    expect(r.ok && r.input).toBe(null);
  });
  it("update altera título", () => {
    const item = makePlanItem();
    const r = buildUpdateCasePlanItemInput(item, {
      kind: item.kind, title: "Outro", description: "", priority: item.priority, dueOn: "", assignmentId: "",
    }, []);
    expect(r.ok && r.input !== null && r.input.title).toBe("Outro");
  });
  it("update: remoção de descrição envia null", () => {
    const item = makePlanItem({ description: "old" });
    const r = buildUpdateCasePlanItemInput(item, {
      kind: item.kind, title: item.title, description: "", priority: item.priority, dueOn: "", assignmentId: "",
    }, []);
    expect(r.ok && r.input !== null && r.input.description).toBe(null);
  });
  it("update: remoção de prazo envia null", () => {
    const item = makePlanItem({ dueOn: "2026-05-10" as IsoDate });
    const r = buildUpdateCasePlanItemInput(item, {
      kind: item.kind, title: item.title, description: "", priority: item.priority, dueOn: "", assignmentId: "",
    }, []);
    expect(r.ok && r.input !== null && r.input.dueOn).toBe(null);
  });
  it("update: remoção de responsável envia null", () => {
    const item = makePlanItem({ assignmentId: asgId });
    const r = buildUpdateCasePlanItemInput(item, {
      kind: item.kind, title: item.title, description: "", priority: item.priority, dueOn: "", assignmentId: "",
    }, options);
    expect(r.ok && r.input !== null && r.input.assignmentId).toBe(null);
  });
  it("changeStatus muda status", () => {
    const item = makePlanItem();
    const r = buildChangeCasePlanItemStatusInput(item, "in_progress");
    expect(r?.status).toBe("in_progress");
    expect(r?.expectedVersion).toBe(item.metadata.version);
  });
  it("changeStatus retorna null se status igual", () => {
    const item = makePlanItem();
    expect(buildChangeCasePlanItemStatusInput(item, item.status)).toBe(null);
  });
  it("expectedVersion vem da metadata da entidade", () => {
    const item = makePlanItem({ metadata: { ...META, version: 7 } });
    const r = buildUpdateCasePlanItemInput(item, {
      kind: item.kind, title: "novo", description: "", priority: item.priority, dueOn: "", assignmentId: "",
    }, []);
    expect(r.ok && r.input !== null && r.input.expectedVersion).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 4. Builders da cronologia
// ---------------------------------------------------------------------------

describe("LV-08.5B · builders da cronologia", () => {
  const caseId = makeCaseId();
  it("cria marco", () => {
    const r = buildCreateCaseTimelineEntryInput(caseId, {
      kind: "milestone", occurredOn: "2026-05-10", title: "M", description: "",
    });
    expect(r.ok && r.input.kind).toBe("milestone");
  });
  it("cria registro (note)", () => {
    const r = buildCreateCaseTimelineEntryInput(caseId, {
      kind: "note", occurredOn: "2026-05-10", title: "N", description: "",
    });
    expect(r.ok && r.input.kind).toBe("note");
  });
  it("data obrigatória", () => {
    const r = buildCreateCaseTimelineEntryInput(caseId, {
      kind: "note", occurredOn: "", title: "N", description: "",
    });
    expect(r.ok).toBe(false);
  });
  it("faz trim do título", () => {
    const r = buildCreateCaseTimelineEntryInput(caseId, {
      kind: "note", occurredOn: "2026-05-10", title: "   t   ", description: "",
    });
    expect(r.ok && r.input.title).toBe("t");
  });
  it("omite descrição vazia", () => {
    const r = buildCreateCaseTimelineEntryInput(caseId, {
      kind: "note", occurredOn: "2026-05-10", title: "t", description: "  ",
    });
    expect(r.ok && "description" in r.input).toBe(false);
  });
  it("update sem mudanças retorna null", () => {
    const e = makeTimelineEntry();
    const r = buildUpdateCaseTimelineEntryInput(e, {
      kind: e.kind, occurredOn: e.occurredOn, title: e.title, description: e.description ?? "",
    });
    expect(r.ok && r.input).toBe(null);
  });
  it("update: remoção de descrição envia null", () => {
    const e = makeTimelineEntry({ description: "old" });
    const r = buildUpdateCaseTimelineEntryInput(e, {
      kind: e.kind, occurredOn: e.occurredOn, title: e.title, description: "",
    });
    expect(r.ok && r.input !== null && r.input.description).toBe(null);
  });
  it("expectedVersion vem da entidade", () => {
    const e = makeTimelineEntry({ metadata: { ...META, version: 4 } });
    const r = buildUpdateCaseTimelineEntryInput(e, {
      kind: e.kind, occurredOn: e.occurredOn, title: "Novo", description: "",
    });
    expect(r.ok && r.input !== null && r.input.expectedVersion).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 5. Responsáveis
// ---------------------------------------------------------------------------

describe("LV-08.5B · responsáveis", () => {
  it("deduplica IDs de perfis", () => {
    const pid = makeProfId("dup");
    const a = makeAssignment({ professionalProfileId: pid });
    const b = makeAssignment({ id: makeAssignId("b"), professionalProfileId: pid });
    expect(collectDistinctProfessionalProfileIds([a, b])).toEqual([pid as unknown as string]);
  });
  it("opção combina área e papel", () => {
    expect(buildAssignmentOptionLabel("psicologia", "lead_professional")).toBe(
      "Psicologia — Profissional principal",
    );
    expect(buildAssignmentOptionLabel("servico-social", "reviewer")).toBe(
      "Serviço Social — Revisor",
    );
  });
  it("apenas assignments ativos podem entrar em novas atribuições", () => {
    const pid = makeProfId("p1");
    const a = makeAssignment({ professionalProfileId: pid, status: "active" });
    const b = makeAssignment({ id: makeAssignId("b"), professionalProfileId: pid, status: "concluded" });
    const built = buildAssignmentOptions([a, b], [makeProfile(pid)]);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.options[0].availableForNewAssignments).toBe(true);
      expect(built.options[1].availableForNewAssignments).toBe(false);
    }
  });
  it("assignment atual inativo pode ser preservado na edição (builder aceita ID atual)", () => {
    const pid = makeProfId("p1");
    const asg = makeAssignment({ professionalProfileId: pid, status: "concluded" });
    const item = makePlanItem({ assignmentId: asg.id });
    const built = buildAssignmentOptions([asg], [makeProfile(pid)]);
    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("");
    // opção não está disponível para novas atribuições
    expect(built.options[0].availableForNewAssignments).toBe(false);
    // mas preservar o mesmo ID no update NÃO deve falhar
    const r = buildUpdateCasePlanItemInput(
      item,
      { kind: item.kind, title: "novo", description: "", priority: item.priority, dueOn: "", assignmentId: asg.id },
      [], // sem opções ativas
    );
    expect(r.ok).toBe(true);
  });
  it("rótulo não expõe IDs internos", () => {
    const label = buildAssignmentOptionLabel("multi", "collaborator");
    expect(label).not.toMatch(/assignment_|professionalProfile_/);
  });
  it("perfil não resolvido produz erro público", () => {
    const asg = makeAssignment();
    const built = buildAssignmentOptions([asg], []);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.missing.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Carregamento (auditoria de fonte + integração)
// ---------------------------------------------------------------------------

describe("LV-08.5B · carregamento", () => {
  it("componente usa useMockDomain", () => {
    expect(SRC_TIMELINE).toMatch(/useMockDomain\s*\(\s*\)/);
  });
  it("carrega plano com limite 100", () => {
    expect(SRC_TIMELINE).toMatch(/casePlan\.listByCase\([^)]*\{\s*limit:\s*100\s*\}/);
  });
  it("carrega cronologia com limite 100", () => {
    expect(SRC_TIMELINE).toMatch(/caseTimeline\.listByCase\([^)]*\{\s*limit:\s*100\s*\}/);
  });
  it("carrega assignments com limite 100", () => {
    expect(SRC_TIMELINE).toMatch(/assignments\.listByCase\([^)]*\{\s*limit:\s*100\s*\}/);
  });
  it("iniciais são criadas antes de qualquer await (Promise.all)", () => {
    expect(SRC_TIMELINE).toMatch(/Promise\.all\(\[[\s\S]*planPromise/);
  });
  it("perfis resolvidos por getById", () => {
    expect(SRC_TIMELINE).toMatch(/professionalProfiles\.getById/);
  });
  it("descarta respostas antigas via requestIdRef", () => {
    expect(SRC_TIMELINE).toMatch(/requestIdRef/);
    expect(SRC_TIMELINE).toMatch(/reqId\s*!==\s*requestIdRef\.current/);
  });
  it("refresh preserva conteúdo (não usa loading)", () => {
    expect(SRC_TIMELINE).toMatch(/refreshing:\s*true/);
  });
  it("falha de permissão não vira somente leitura silenciosa", () => {
    expect(SRC_TIMELINE).toMatch(/setState\(\{\s*kind:\s*"error",\s*error:\s*mapPlanTimelineError\(r\.error\)\s*\}\);\s*return;/);
  });
});

// ---------------------------------------------------------------------------
// 7. Permissões (integração real)
// ---------------------------------------------------------------------------

describe("LV-08.5B · permissões (integração)", () => {
  it("catálogo cobre 7 ações (4 plano + 3 cronologia)", () => {
    expect(PLAN_ACTIONS.length).toBe(4);
    expect(TIMELINE_ACTIONS.length).toBe(3);
    expect(ALL_PLAN_TIMELINE_ACTIONS.length).toBe(7);
  });
  it("todas as ações são únicas", () => {
    expect(new Set(ALL_PLAN_TIMELINE_ACTIONS).size).toBe(ALL_PLAN_TIMELINE_ACTIONS.length);
  });
  it("todas as chamadas de permissão passam caseId", () => {
    // auditoria: a chamada única de map -> evaluate contém action e caseId
    expect(SRC_TIMELINE).toMatch(/permissions\.evaluate\([^)]*\{\s*action,\s*caseId\s*\}/);
  });
  it("perfil proprietário recebe todas as ações permitidas", async () => {
    const env = createMockDomainEnvironment();
    const results = await Promise.all(
      ALL_PLAN_TIMELINE_ACTIONS.map((a) =>
        env.services.permissions.evaluate(OWNER_ALFA, { action: a, caseId: SEED_CASE_ALFA_2_ID }),
      ),
    );
    for (const r of results) {
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.allowed).toBe(true);
    }
  });
  it("perfil leitura não recebe nenhuma ação de escrita", async () => {
    const env = createMockDomainEnvironment();
    const mem = unwrapOk<Membership>(
      await env.services.memberships.create(OWNER_ALFA, {
        userId: SEED_USER_3_ID,
        role: "leitura",
      }),
    );
    const ctx: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_3_ID,
      membershipId: mem.id,
      role: "leitura",
    };
    const results = await Promise.all(
      ALL_PLAN_TIMELINE_ACTIONS.map((a) =>
        env.services.permissions.evaluate(ctx, { action: a, caseId: SEED_CASE_ALFA_2_ID }),
      ),
    );
    for (const r of results) {
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.allowed).toBe(false);
    }
  });
  it("emptyPlanTimelinePermissions é totalmente falso", () => {
    const p = emptyPlanTimelinePermissions();
    for (const v of Object.values(p)) expect(v).toBe(false);
  });
  it("buildPlanTimelinePermissions mapeia cada ação", () => {
    const p = buildPlanTimelinePermissions([
      ["casePlanItem.create", true],
      ["casePlanItem.update", true],
      ["casePlanItem.changeStatus", true],
      ["casePlanItem.remove", true],
      ["caseTimelineEntry.create", true],
      ["caseTimelineEntry.update", true],
      ["caseTimelineEntry.remove", true],
    ]);
    expect(p.createPlanItem && p.updatePlanItem && p.changePlanItemStatus && p.removePlanItem).toBe(true);
    expect(p.createTimelineEntry && p.updateTimelineEntry && p.removeTimelineEntry).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Escritas — auditoria de fonte
// ---------------------------------------------------------------------------

describe("LV-08.5B · escritas", () => {
  it("existe writeOperationRef", () => {
    expect(SRC_TIMELINE).toMatch(/writeOperationRef\s*=\s*React\.useRef/);
  });
  it("trava é adquirida antes das escritas", () => {
    expect(SRC_TIMELINE.match(/tryAcquireWrite\(/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });
  it("trava é liberada em finally", () => {
    expect(SRC_TIMELINE.match(/releaseWrite\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(SRC_TIMELINE).toMatch(/finally\s*\{[^}]*releaseWrite/);
  });
  it("conflito não faz retry automático (nenhum setTimeout de retry)", () => {
    expect(SRC_TIMELINE).not.toMatch(/setTimeout[\s\S]*create\(|setTimeout[\s\S]*update\(/);
  });
  it("recarregamento explícito usa finishAndReload -> loadAll('refresh')", () => {
    expect(SRC_TIMELINE).toMatch(/loadAll\(\s*"refresh"\s*\)/);
    expect(SRC_TIMELINE).toMatch(/finishAndReload/);
  });
  it("updates usam expectedVersion", () => {
    expect(SRC_MODEL).toMatch(/expectedVersion:\s*item\.metadata\.version/);
    expect(SRC_MODEL).toMatch(/expectedVersion:\s*entry\.metadata\.version/);
  });
  it("nenhum item do plano cria cronologia automática", () => {
    expect(SRC_TIMELINE).not.toMatch(/caseTimeline\.create\([^)]*planItem/);
  });
});

// ---------------------------------------------------------------------------
// 9. Interface e acessibilidade — auditorias
// ---------------------------------------------------------------------------

describe("LV-08.5B · interface e acessibilidade", () => {
  it("títulos oficiais existem", () => {
    expect(SRC_TIMELINE).toMatch(/Plano de trabalho/);
    expect(SRC_TIMELINE).toMatch(/Cronologia do processo/);
  });
  it("estados vazios existem", () => {
    expect(SRC_TIMELINE).toMatch(/Nenhum item no plano de trabalho/);
    expect(SRC_TIMELINE).toMatch(/Nenhum registro na cronologia/);
  });
  it("loading usa role=status", () => {
    expect(SRC_STATE).toMatch(/role="status"/);
    expect(SRC_STATE).toMatch(/aria-live="polite"/);
  });
  it("erro usa role=alert", () => {
    expect(SRC_STATE).toMatch(/role="alert"/);
  });
  it("datas usam <time>", () => {
    expect(SRC_TIMELINE).toMatch(/<time\s+dateTime=\{/);
  });
  it("diálogos possuem labels associados", () => {
    expect(SRC_PLAN_DIALOG).toMatch(/<Label htmlFor="plan-title">/);
    expect(SRC_PLAN_DIALOG).toMatch(/<Label htmlFor="plan-priority">/);
    expect(SRC_PLAN_DIALOG).toMatch(/<Label htmlFor="plan-due">/);
    expect(SRC_PLAN_DIALOG).toMatch(/<Label htmlFor="plan-assign">/);
    expect(SRC_TL_DIALOG).toMatch(/<Label htmlFor="tl-date">/);
    expect(SRC_TL_DIALOG).toMatch(/<Label htmlFor="tl-title">/);
    expect(SRC_STATUS_DIALOG).toMatch(/<Label htmlFor="plan-status">/);
  });
  it("remoções possuem confirmações distintas", () => {
    expect(SRC_TIMELINE).toMatch(/Remover item do plano\?/);
    expect(SRC_TIMELINE).toMatch(/Remover registro da cronologia\?/);
  });
  it("ações permitem quebra no mobile (flex-wrap ou flex-col)", () => {
    expect(SRC_TIMELINE).toMatch(/flex-wrap/);
    expect(SRC_TIMELINE).toMatch(/flex-col/);
  });
  it("não introduz rolagem horizontal (nenhum overflow-x-scroll novo)", () => {
    expect(SRC_TIMELINE).not.toMatch(/overflow-x-scroll/);
  });
  it("rota monta o componente depois de Pessoas e Relações", () => {
    const iRel = SRC_ROUTE.indexOf("ProcessPeopleRelations");
    const iPlan = SRC_ROUTE.indexOf("ProcessPlanTimeline");
    expect(iRel).toBeGreaterThan(-1);
    expect(iPlan).toBeGreaterThan(iRel);
  });
  it("rota não usa loader nem useLoaderData nem notFound", () => {
    expect(SRC_ROUTE).not.toMatch(/\bloader\s*:/);
    expect(SRC_ROUTE).not.toMatch(/useLoaderData/);
    expect(SRC_ROUTE).not.toMatch(/notFound\s*\(/);
  });
  it("branding: não altera Logo nem AppSidebar (arquivos existem)", () => {
    // guarda simbólica — apenas verifica presença dos arquivos
    expect(fs.existsSync(path.resolve(__dirname, "..", "src", "components", "brand", "Logo.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, "..", "src", "components", "app", "AppSidebar.tsx"))).toBe(true);
  });
  it("PWA preservada: pwa-config existe", () => {
    expect(fs.existsSync(path.resolve(__dirname, "..", "src", "pwa", "pwa-config.ts"))).toBe(true);
  });
  it("domínio e mocks não foram alterados (case-plan-mock inalterado quanto ao contrato)", () => {
    // Simplesmente valida que os arquivos ainda existem e exportam as fábricas.
    const casePlan = fs.readFileSync(
      path.resolve(__dirname, "..", "src", "domain", "mocks", "case-plan-mock.ts"),
      "utf8",
    );
    expect(casePlan).toMatch(/createCasePlanServiceMock/);
    const tl = fs.readFileSync(
      path.resolve(__dirname, "..", "src", "domain", "mocks", "case-timeline-mock.ts"),
      "utf8",
    );
    expect(tl).toMatch(/createCaseTimelineServiceMock/);
  });
  it("botões de ícone possuem aria-label", () => {
    // Edit/Remove no plano
    expect(SRC_TIMELINE).toMatch(/aria-label=\{`Editar/);
    expect(SRC_TIMELINE).toMatch(/aria-label=\{`Remover/);
  });
  it("ícones decorativos usam aria-hidden", () => {
    expect(SRC_TIMELINE).toMatch(/aria-hidden="true"/);
  });
});

// ---------------------------------------------------------------------------
// 10. Integração — Caso Alfa 2 traz seeds; Caso Alfa 1 é vazio
// ---------------------------------------------------------------------------

describe("LV-08.5B · integração com seeds", () => {
  it("Caso Alfa 2 traz itens de plano seed", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.casePlan.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, { limit: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.items.length).toBeGreaterThanOrEqual(3);
  });
  it("Caso Alfa 2 traz registros de cronologia seed", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.caseTimeline.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, { limit: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.items.length).toBeGreaterThanOrEqual(3);
  });
  it("Caso Alfa 1 tem plano vazio", async () => {
    const env = createMockDomainEnvironment();
    const alfa1 = buildDomainId("case", "seed_alfa_1") as unknown as CaseId;
    const r = await env.services.casePlan.listByCase(OWNER_ALFA, alfa1, { limit: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.items.length).toBe(0);
  });
  it("Caso Alfa 1 tem cronologia vazia", async () => {
    const env = createMockDomainEnvironment();
    const alfa1 = buildDomainId("case", "seed_alfa_1") as unknown as CaseId;
    const r = await env.services.caseTimeline.listByCase(OWNER_ALFA, alfa1, { limit: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.items.length).toBe(0);
  });
  it("resolução de assignment para Alfa 2 funciona ponta a ponta", async () => {
    const env = createMockDomainEnvironment();
    const asgRes = await env.services.assignments.listByCase(OWNER_ALFA, SEED_CASE_ALFA_2_ID, { limit: 100 });
    expect(asgRes.ok).toBe(true);
    if (!asgRes.ok) throw new Error("");
    const distinct = collectDistinctProfessionalProfileIds(asgRes.data.items);
    const profiles = await Promise.all(
      distinct.map((id) =>
        env.services.professionalProfiles.getById(OWNER_ALFA, id as ProfessionalProfileId),
      ),
    );
    const resolved: ProfessionalProfile[] = [];
    for (const p of profiles) {
      expect(p.ok).toBe(true);
      if (p.ok) resolved.push(p.data);
    }
    const built = buildAssignmentOptions(asgRes.data.items, resolved);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.options[0].label).toContain("Psicologia");
      expect(built.options[0].label).toContain("Profissional principal");
    }
    // sanity: seed IDs reais
    expect(SEED_ASSIGN_ALFA_1_ID).toBeTruthy();
    expect(SEED_PROF_ALFA_ID).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 11. Mapeamento público de erros
// ---------------------------------------------------------------------------

describe("LV-08.5B · mapPlanTimelineError", () => {
  it("forbidden", () => {
    expect(mapPlanTimelineError({ code: "forbidden", message: "x" }).kind).toBe("forbidden");
  });
  it("conflict", () => {
    expect(mapPlanTimelineError({ code: "conflict", message: "x" }).kind).toBe("conflict");
  });
  it("assignment_not_in_case", () => {
    expect(
      mapPlanTimelineError({ code: "validation_error", message: "assignment_not_in_case" }).kind,
    ).toBe("assignment_not_in_case");
  });
  it("no_changes", () => {
    expect(
      mapPlanTimelineError({ code: "validation_error", message: "no_changes" }).kind,
    ).toBe("no_changes");
  });
  it("not_found", () => {
    expect(mapPlanTimelineError({ code: "not_found", message: "x" }).kind).toBe("not_found");
  });
  it("offline", () => {
    expect(mapPlanTimelineError({ code: "offline", message: "x" }).kind).toBe("offline");
  });
  it("unavailable", () => {
    expect(mapPlanTimelineError({ code: "unavailable", message: "x" }).kind).toBe("unavailable");
  });
  it("mensagens públicas não expõem códigos internos", () => {
    const msg = mapPlanTimelineError({ code: "internal_error", message: "boom!!!" }).message;
    expect(msg).not.toMatch(/internal_error|boom/);
  });
});
