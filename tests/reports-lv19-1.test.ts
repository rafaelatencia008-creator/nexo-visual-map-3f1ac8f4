/**
 * LV-19.1 — Camada de aplicação e derivação determinística do workspace.
 *
 * Cobre:
 *  - Regra canônica única dos três estados de seção.
 *  - Cálculo de progresso.
 *  - Operação atômica de atualização de bloco (evento e notificação únicos).
 *  - Rejeição de laudo/seção/bloco inexistente + ausência de mutação parcial.
 *  - Estabilidade referencial do snapshot.
 *  - Isolamento entre laudo e modelo de origem.
 *  - Marcar seção como concluída (explícito) e reabrir.
 *  - Contrato do repositório (adaptador in-memory).
 *  - Auditoria estática: ausência de imports diretos da store nos casos de uso.
 *
 * Regressão obrigatória das LV-18.1–LV-18.6 é executada pela suíte global
 * (`bun test`); aqui testamos apenas o escopo da LV-19.1.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  advanceReportClockSeconds,
  createReportFromTemplateApplication,
  findSection,
  getReport,
  logExportPerformed,
  markBlockReviewed,
  resetReportClock,
  resetReportIdCounter,
  resetReportStore,
  subscribeReportHistory,
  subscribeReports,
} from "@/features/reports/report-mock-store";
import {
  createReportFromTemplate,
  previewReportTemplateApplication,
} from "@/features/reports/report-template-application";
import {
  createTemplate,
  addSection,
  addBlock,
  addVariable,
  publishTemplate,
  resetReportTemplateStore,
  getTemplate as getReportTemplate,
} from "@/features/report-templates/report-template-use-cases";
import {
  deriveReportProgress,
  deriveSectionProgress,
  deriveSectionStatus,
  deriveWorkspaceSnapshot,
  getWorkspaceSnapshot,
  listWorkspaceHistory,
  locateReport,
  logWorkspaceOpened,
  markSectionComplete,
  renameReportTitle,
  reopenSection,
  ReportWorkspaceError,
  subscribeWorkspace,
  subscribeWorkspaceHistory,
  updateBlock,
} from "@/features/reports/report-workspace-use-cases";
import { reportWorkspaceRepository } from "@/features/reports/report-workspace-composition";
import { createInMemoryReportWorkspaceRepository } from "@/features/reports/report-workspace-memory-repository";
import type { ReportDocument } from "@/features/reports/report-types";

const REPO_ROOT = join(import.meta.dir, "..");

// ---------- helpers ----------

function seedReportFromTemplate(): ReportDocument {
  const t = createTemplate({
    name: "Modelo LV-19.1",
    description: "Base determinística para o workspace",
    specialty: "psicologia",
  });
  const secA = addSection(t.id, {
    title: "Identificação",
    description: "Cabeçalho",
  });
  addBlock(t.id, secA.id, {
    kind: "paragrafo",
    title: "Sujeito",
    content: "Paciente {{nome}}",
    variableRefs: ["nome"],
  });
  const secB = addSection(t.id, {
    title: "Análise",
    description: "Corpo do laudo",
  });
  addBlock(t.id, secB.id, {
    kind: "paragrafo",
    title: "Observação",
    content: "Notas iniciais.",
    variableRefs: [],
  });
  addVariable(t.id, {
    key: "nome",
    label: "Nome",
    kind: "texto",
    required: true,
    defaultValue: "",
  });
  publishTemplate(t.id, "publicar");
  const preview = previewReportTemplateApplication({
    templateId: t.id,
    variableValues: { nome: "João" },
  });
  return createReportFromTemplateApplication({
    application: preview,
    title: "Laudo LV-19.1",
    caseId: "cas-1",
    caseLabel: "Caso Demo",
    authorLabel: "Perito Mock",
  });
}

beforeEach(() => {
  resetReportStore();
  resetReportTemplateStore();
  resetReportIdCounter(9000);
  resetReportClock();
});

// ============================================================================
// Derivação — regra canônica única
// ============================================================================

describe("LV-19.1 · Derivação — regra canônica única", () => {
  it("seção sem blocos → vazia", () => {
    const doc = seedReportFromTemplate();
    const emptySection = { ...doc.sections[0], blocks: [] };
    expect(deriveSectionStatus(emptySection)).toBe("vazia");
  });

  it("seção com todos os blocos sem conteúdo → vazia", () => {
    const doc = seedReportFromTemplate();
    const section = doc.sections[0];
    const cleared = {
      ...section,
      blocks: section.blocks.map((b) => ({ ...b, content: "   " })),
    };
    expect(deriveSectionStatus(cleared)).toBe("vazia");
  });

  it("seção com pelo menos um bloco preenchido → em_andamento", () => {
    const doc = seedReportFromTemplate();
    expect(deriveSectionStatus(doc.sections[0])).toBe("em_andamento");
  });

  it("seção com status 'aprovada' → concluida (independente do conteúdo)", () => {
    const doc = seedReportFromTemplate();
    const approved = { ...doc.sections[0], status: "aprovada" as const };
    expect(deriveSectionStatus(approved)).toBe("concluida");
    // Mesmo com blocos vazios, se estiver aprovada, é concluida (invariante da regra):
    const approvedEmpty = { ...approved, blocks: [] };
    expect(deriveSectionStatus(approvedEmpty)).toBe("concluida");
  });

  it("preencher/revisar todos os blocos NÃO conclui automaticamente", () => {
    const doc = seedReportFromTemplate();
    const section = doc.sections[0];
    const filled = {
      ...section,
      blocks: section.blocks.map((b) => ({
        ...b,
        content: "preenchido",
        reviewed: true,
      })),
    };
    // Ainda em_andamento — a conclusão é ação explícita.
    expect(deriveSectionStatus(filled)).toBe("em_andamento");
    const progress = deriveSectionProgress(filled);
    expect(progress.canMarkComplete).toBe(true);
    expect(progress.isCompleted).toBe(false);
  });
});

// ============================================================================
// Progresso agregado
// ============================================================================

describe("LV-19.1 · Progresso agregado", () => {
  it("progresso zero quando nenhuma seção está concluída", () => {
    const doc = seedReportFromTemplate();
    const p = deriveReportProgress(doc);
    expect(p.totalSections).toBe(2);
    expect(p.completedSections).toBe(0);
    expect(p.percentage).toBe(0);
    expect(p.totalBlocks).toBe(2);
    expect(p.filledBlocks).toBeGreaterThanOrEqual(1);
  });

  it("progresso parcial e total refletem seções concluídas", () => {
    const doc = seedReportFromTemplate();
    // Concluir seção A: preencher, revisar todos, aprovar via caso de uso.
    const secA = doc.sections[0];
    for (const b of secA.blocks) {
      updateBlock(doc.id, secA.id, b.id, { content: "conteúdo final" });
      markBlockReviewed(doc.id, secA.id, b.id, true);
    }
    const approve = markSectionComplete(doc.id, secA.id);
    expect(approve.ok).toBe(true);
    const p1 = deriveReportProgress(locateReport(doc.id));
    expect(p1.completedSections).toBe(1);
    expect(p1.percentage).toBeCloseTo(0.5, 5);
    // Concluir seção B.
    const doc2 = locateReport(doc.id);
    const secB = doc2.sections[1];
    for (const b of secB.blocks) {
      updateBlock(doc.id, secB.id, b.id, { content: "final" });
      markBlockReviewed(doc.id, secB.id, b.id, true);
    }
    const approve2 = markSectionComplete(doc.id, secB.id);
    expect(approve2.ok).toBe(true);
    const p2 = deriveReportProgress(locateReport(doc.id));
    expect(p2.completedSections).toBe(2);
    expect(p2.percentage).toBe(1);
    expect(p2.emptyBlocks).toBe(0);
  });
});

// ============================================================================
// Atualização atômica de bloco
// ============================================================================

describe("LV-19.1 · updateBlock (atômico)", () => {
  it("atualiza título e conteúdo com UMA única mutação, UM evento e UMA notificação", () => {
    const doc = seedReportFromTemplate();
    const section = doc.sections[0];
    const block = section.blocks[0];

    let reportsNotifications = 0;
    let historyNotifications = 0;
    const unsubR = subscribeWorkspace(() => {
      reportsNotifications += 1;
    });
    const unsubH = subscribeWorkspaceHistory(() => {
      historyNotifications += 1;
    });

    const historyBefore = listWorkspaceHistory(doc.id).length;
    advanceReportClockSeconds(30);
    const updatedAtBefore = locateReport(doc.id).updatedAt;

    const next = updateBlock(doc.id, section.id, block.id, {
      title: "Sujeito revisado",
      content: "Conteúdo final consolidado.",
    });

    expect(reportsNotifications).toBe(1);
    expect(historyNotifications).toBe(1);
    const events = listWorkspaceHistory(doc.id);
    expect(events.length).toBe(historyBefore + 1);
    expect(events[events.length - 1].kind).toBe("bloco_atualizado");
    expect(events[events.length - 1].sectionId).toBe(section.id);
    expect(events[events.length - 1].blockId).toBe(block.id);
    expect(next.updatedAt).not.toBe(updatedAtBefore);
    const persisted = findSection(next, section.kind)!;
    const persistedBlock = persisted.blocks.find((b) => b.id === block.id)!;
    expect(persistedBlock.title).toBe("Sujeito revisado");
    expect(persistedBlock.content).toBe("Conteúdo final consolidado.");
    expect(persistedBlock.manuallyEdited).toBe(true);
    expect(persistedBlock.reviewed).toBe(false);

    unsubR();
    unsubH();
  });

  it("rejeita laudo inexistente sem qualquer mutação", () => {
    const doc = seedReportFromTemplate();
    const historyBefore = listWorkspaceHistory(doc.id).length;
    let notifications = 0;
    const unsub = subscribeWorkspace(() => {
      notifications += 1;
    });
    expect(() =>
      updateBlock("rep-inexistente", "sec-x", "blk-x", { content: "x" }),
    ).toThrow(ReportWorkspaceError);
    expect(notifications).toBe(0);
    expect(listWorkspaceHistory(doc.id).length).toBe(historyBefore);
    unsub();
  });

  it("rejeita seção inexistente e bloco inexistente sem mutação", () => {
    const doc = seedReportFromTemplate();
    const before = locateReport(doc.id);
    expect(() =>
      updateBlock(doc.id, "sec-nope", "blk-nope", { content: "x" }),
    ).toThrow(ReportWorkspaceError);
    expect(() =>
      updateBlock(doc.id, before.sections[0].id, "blk-nope", { content: "x" }),
    ).toThrow(ReportWorkspaceError);
    expect(locateReport(doc.id)).toBe(before);
  });

  it("rejeita patch vazio e patch sem mudança efetiva sem emitir evento", () => {
    const doc = seedReportFromTemplate();
    const section = doc.sections[0];
    const block = section.blocks[0];
    const historyBefore = listWorkspaceHistory(doc.id).length;

    expect(() => updateBlock(doc.id, section.id, block.id, {})).toThrow(
      ReportWorkspaceError,
    );
    expect(() =>
      updateBlock(doc.id, section.id, block.id, {
        title: block.title,
        content: block.content,
      }),
    ).toThrow(ReportWorkspaceError);
    expect(listWorkspaceHistory(doc.id).length).toBe(historyBefore);
  });

  it("rebaixa seção aprovada dentro da mesma mutação atômica", () => {
    const doc = seedReportFromTemplate();
    const secA = doc.sections[0];
    for (const b of secA.blocks) {
      updateBlock(doc.id, secA.id, b.id, { content: "ok" });
      markBlockReviewed(doc.id, secA.id, b.id, true);
    }
    const approve = markSectionComplete(doc.id, secA.id);
    expect(approve.ok).toBe(true);
    // Confirma aprovada
    expect(locateReport(doc.id).sections[0].status).toBe("aprovada");
    // Edita conteúdo → deve rebaixar
    const target = locateReport(doc.id).sections[0].blocks[0];
    updateBlock(doc.id, secA.id, target.id, { content: "revisando" });
    expect(locateReport(doc.id).sections[0].status).toBe("em_elaboracao");
  });
});

// ============================================================================
// Estabilidade referencial do snapshot
// ============================================================================

describe("LV-19.1 · Estabilidade referencial", () => {
  it("mantém referência quando não há mutação", () => {
    const doc = seedReportFromTemplate();
    const s1 = getWorkspaceSnapshot(doc.id);
    const s2 = getWorkspaceSnapshot(doc.id);
    expect(s1.report).toBe(s2.report);
  });

  it("muda referência do documento após mutação válida", () => {
    const doc = seedReportFromTemplate();
    const before = getWorkspaceSnapshot(doc.id).report;
    updateBlock(doc.id, doc.sections[0].id, doc.sections[0].blocks[0].id, {
      content: "novo",
    });
    const after = getWorkspaceSnapshot(doc.id).report;
    expect(after).not.toBe(before);
  });
});

// ============================================================================
// Isolamento laudo × modelo de origem
// ============================================================================

describe("LV-19.1 · Isolamento com modelo de origem", () => {
  it("editar laudo NÃO altera o modelo original", () => {
    const doc = seedReportFromTemplate();
    const templateId = doc.templateOrigin!.templateId;
    const templateBefore = getReportTemplate(templateId);
    expect(templateBefore).toBeDefined();
    const templateSnapshotBefore = JSON.stringify(templateBefore);

    updateBlock(doc.id, doc.sections[0].id, doc.sections[0].blocks[0].id, {
      content: "alterado no laudo",
    });
    renameReportTitle(doc.id, "Título alterado");
    const templateAfter = getReportTemplate(templateId);
    expect(JSON.stringify(templateAfter)).toBe(templateSnapshotBefore);
  });

  it("preserva metadados de origem (templateId, versão, fingerprint)", () => {
    const doc = seedReportFromTemplate();
    const origin = doc.templateOrigin!;
    updateBlock(doc.id, doc.sections[0].id, doc.sections[0].blocks[0].id, {
      content: "muda",
    });
    const after = locateReport(doc.id);
    expect(after.templateOrigin).toEqual(origin);
  });
});

// ============================================================================
// Concluir / reabrir / renomear / abrir workspace
// ============================================================================

describe("LV-19.1 · Ações do workspace", () => {
  it("markSectionComplete é explícito — rejeita quando blocos ainda não estão revisados", () => {
    const doc = seedReportFromTemplate();
    const secA = doc.sections[0];
    for (const b of secA.blocks) {
      updateBlock(doc.id, secA.id, b.id, { content: "algo" });
    }
    const result = markSectionComplete(doc.id, secA.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/revisad/);
    }
  });

  it("reopenSection volta status para em_elaboracao (derivado em_andamento)", () => {
    const doc = seedReportFromTemplate();
    const secA = doc.sections[0];
    for (const b of secA.blocks) {
      updateBlock(doc.id, secA.id, b.id, { content: "ok" });
      markBlockReviewed(doc.id, secA.id, b.id, true);
    }
    markSectionComplete(doc.id, secA.id);
    expect(locateReport(doc.id).sections[0].status).toBe("aprovada");
    reopenSection(doc.id, secA.id);
    const reopened = locateReport(doc.id).sections[0];
    expect(reopened.status).toBe("em_elaboracao");
    expect(deriveSectionStatus(reopened)).toBe("em_andamento");
  });

  it("renomeia laudo — trim aplicado, título vazio rejeitado", () => {
    const doc = seedReportFromTemplate();
    const next = renameReportTitle(doc.id, "  Novo Título  ");
    expect(next.title).toBe("Novo Título");
    expect(() => renameReportTitle(doc.id, "   ")).toThrow(ReportWorkspaceError);
  });

  it("logWorkspaceOpened registra evento único de abertura", () => {
    const doc = seedReportFromTemplate();
    const before = listWorkspaceHistory(doc.id).length;
    const ev = logWorkspaceOpened(doc.id);
    expect(ev.kind).toBe("workspace_aberto");
    expect(listWorkspaceHistory(doc.id).length).toBe(before + 1);
  });

  it("rejeita ações para laudo inexistente", () => {
    expect(() => renameReportTitle("rep-x", "x")).toThrow(ReportWorkspaceError);
    expect(() => markSectionComplete("rep-x", "sec-x")).toThrow(
      ReportWorkspaceError,
    );
    expect(() => reopenSection("rep-x", "sec-x")).toThrow(ReportWorkspaceError);
    expect(() => logWorkspaceOpened("rep-x")).toThrow(ReportWorkspaceError);
  });
});

// ============================================================================
// Repositório injetável + composição
// ============================================================================

describe("LV-19.1 · Repositório injetável", () => {
  it("adaptador padrão expõe todos os métodos do contrato", () => {
    const repo = reportWorkspaceRepository;
    const required = [
      "getSnapshot",
      "locateReport",
      "listHistory",
      "isFrozen",
      "subscribeReports",
      "subscribeHistory",
      "renameReport",
      "updateBlock",
      "markSectionComplete",
      "reopenSection",
      "logWorkspaceOpened",
    ] as const;
    for (const key of required) {
      expect(typeof (repo as Record<string, unknown>)[key]).toBe("function");
    }
  });

  it("adaptador in-memory reutiliza a store — mesma fonte de verdade", () => {
    const doc = seedReportFromTemplate();
    const repo = createInMemoryReportWorkspaceRepository();
    expect(repo.locateReport(doc.id)?.id).toBe(doc.id);
    // Mutar via caso de uso — adaptador vê a mesma alteração.
    updateBlock(doc.id, doc.sections[0].id, doc.sections[0].blocks[0].id, {
      content: "compartilhado",
    });
    expect(
      repo.locateReport(doc.id)!.sections[0].blocks[0].content,
    ).toBe("compartilhado");
  });

  it("aceita injeção de repositório alternativo mantendo API estável", () => {
    const doc = seedReportFromTemplate();
    const alt = createInMemoryReportWorkspaceRepository();
    const snap = getWorkspaceSnapshot(doc.id, alt);
    expect(snap.report.id).toBe(doc.id);
    expect(snap.progress.totalSections).toBe(2);
  });

  it("logExportPerformed direto na store NÃO dispara notificação de reports", () => {
    // Sanidade: mutações de histórico puro não emitem notify() de reports.
    const doc = seedReportFromTemplate();
    let reports = 0;
    let history = 0;
    const uR = subscribeWorkspace(() => {
      reports += 1;
    });
    const uH = subscribeWorkspaceHistory(() => {
      history += 1;
    });
    logExportPerformed(doc.id, "export mock");
    expect(reports).toBe(0);
    expect(history).toBe(1);
    uR();
    uH();
  });
});

// ============================================================================
// Auditoria estática — casos de uso e adaptador
// ============================================================================

describe("LV-19.1 · Auditoria estática", () => {
  it("nem tipos nem derivação importam a store concreta", () => {
    for (const rel of [
      "src/features/reports/report-workspace-types.ts",
      "src/features/reports/report-workspace-derivation.ts",
    ]) {
      const src = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(src).not.toContain('from "./report-mock-store"');
      expect(src).not.toContain("from '@/features/reports/report-mock-store'");
    }
  });

  it("nenhum módulo da LV-19.1 contém fetch/Supabase/localStorage/OpenAI", () => {
    const files = [
      "src/features/reports/report-workspace-types.ts",
      "src/features/reports/report-workspace-derivation.ts",
      "src/features/reports/report-workspace-repository.ts",
      "src/features/reports/report-workspace-memory-repository.ts",
      "src/features/reports/report-workspace-composition.ts",
      "src/features/reports/report-workspace-use-cases.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(join(REPO_ROOT, rel), "utf8");
      for (const forbidden of [
        "fetch(",
        "localStorage",
        "sessionStorage",
        "IndexedDB",
        "supabase",
        "openai",
        "OpenAI",
      ]) {
        expect(src).not.toContain(forbidden);
      }
    }
  });

  it("nenhuma rota ou componente de UI foi criado nesta fatia", () => {
    // LV-19.1 termina antes da UI (LV-19.2).
    for (const rel of [
      "src/routes/app.laudos.$reportId.tsx",
      "src/features/reports/workspace",
    ]) {
      let exists = true;
      try {
        readFileSync(join(REPO_ROOT, rel), "utf8");
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    }
  });
});
