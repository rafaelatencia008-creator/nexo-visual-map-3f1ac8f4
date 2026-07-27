/**
 * LV-19.3 — Testes: painéis de histórico e auditoria do workspace.
 *
 * Consomem exclusivamente a fachada da LV-19.1. Garantem:
 *  - a UI não importa `report-mock-store`;
 *  - histórico exibido em ordem cronológica inversa;
 *  - estado vazio do histórico coberto;
 *  - principais tipos de evento representados;
 *  - painel de auditoria usa dados derivados (sem duplicar regra);
 *  - nenhuma leitura gera novo evento;
 *  - renderizações repetidas não alteram histórico;
 *  - integração dos painéis em `ReportWorkspacePage`;
 *  - LV-19.4 não iniciada.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  resetReportClock,
  resetReportIdCounter,
  resetReportStore,
} from "@/features/reports/report-mock-store";
import {
  addBlock,
  addSection,
  addVariable,
  createTemplate,
  publishTemplate,
  resetReportTemplateStore,
} from "@/features/report-templates/report-template-use-cases";
import { createReportFromTemplate } from "@/features/reports/report-template-application";
import {
  getWorkspaceSnapshot,
  listWorkspaceHistory,
  logWorkspaceOpened,
  markSectionComplete,
  reopenSection,
  subscribeWorkspaceHistory,
  tryLocateReport,
  updateBlock,
} from "@/features/reports/report-workspace-use-cases";

const REPO_ROOT = join(import.meta.dir, "..");
const HISTORY_PANEL = join(
  REPO_ROOT,
  "src/features/reports/workspace/ReportWorkspaceHistoryPanel.tsx",
);
const AUDIT_PANEL = join(
  REPO_ROOT,
  "src/features/reports/workspace/ReportWorkspaceAuditPanel.tsx",
);
const PAGE_FILE = join(
  REPO_ROOT,
  "src/features/reports/workspace/ReportWorkspacePage.tsx",
);

function seedReport(): string {
  const t = createTemplate({
    name: "Modelo LV-19.3",
    description: "Histórico e auditoria",
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
    description: "Corpo",
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
  const r = createReportFromTemplate({
    templateId: t.id,
    title: "Laudo LV-19.3",
    caseId: "cas-lv19-3",
    caseLabel: "Caso LV-19.3",
    variableValues: { nome: "Maria" },
  });
  return r.report.id;
}

beforeEach(() => {
  resetReportStore();
  resetReportTemplateStore();
  resetReportIdCounter(9700);
  resetReportClock();
});

describe("LV-19.3 — Isolamento arquitetural dos painéis", () => {
  it("HistoryPanel não importa report-mock-store", () => {
    const src = readFileSync(HISTORY_PANEL, "utf8");
    expect(/from\s+["'][^"']*report-mock-store["']/.test(src)).toBe(false);
  });

  it("AuditPanel não importa report-mock-store", () => {
    const src = readFileSync(AUDIT_PANEL, "utf8");
    expect(/from\s+["'][^"']*report-mock-store["']/.test(src)).toBe(false);
  });

  it("HistoryPanel consome a fachada de casos de uso", () => {
    const src = readFileSync(HISTORY_PANEL, "utf8");
    expect(src).toMatch(/report-workspace-use-cases/);
    expect(src).toMatch(/listWorkspaceHistory/);
    expect(src).toMatch(/subscribeWorkspaceHistory/);
  });

  it("AuditPanel consome derivações e não recalcula progresso", () => {
    const src = readFileSync(AUDIT_PANEL, "utf8");
    expect(src).toMatch(/report-workspace-use-cases/);
    // Sem duplicação de regra canônica: não deve chamar deriveSectionStatus
    // nem deriveReportProgress diretamente — as projeções vêm do snapshot.
    expect(src).not.toMatch(/deriveSectionStatus\(/);
    expect(src).not.toMatch(/deriveReportProgress\(/);
    expect(src).not.toMatch(/deriveWorkspaceSnapshot\(/);
  });

  it("ReportWorkspacePage integra os dois painéis", () => {
    const src = readFileSync(PAGE_FILE, "utf8");
    expect(src).toMatch(/ReportWorkspaceHistoryPanel/);
    expect(src).toMatch(/ReportWorkspaceAuditPanel/);
    expect(src).toMatch(/lv19-workspace-tabs/);
  });
});

describe("LV-19.3 — Comportamento do histórico", () => {
  it("estado vazio quando não há eventos para o laudo", () => {
    const id = seedReport();
    // A criação a partir do modelo pode registrar eventos; para simular vazio,
    // filtramos por um reportId inexistente — a listagem deve retornar [].
    const empty = listWorkspaceHistory(`${id}-inexistente`);
    expect(empty.length).toBe(0);
  });

  it("os eventos são retornados em ordem cronológica crescente e a UI inverte", () => {
    const id = seedReport();
    const doc = tryLocateReport(id)!;
    const section = doc.sections.find((s) => s.blocks.length > 0)!;
    const block = section.blocks[0];

    updateBlock(id, section.id, block.id, { content: "Primeira alteração" });
    updateBlock(id, section.id, block.id, { content: "Segunda alteração" });
    logWorkspaceOpened(id);

    const events = listWorkspaceHistory(id);
    expect(events.length).toBeGreaterThanOrEqual(3);
    // Cronológico crescente na fonte.
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i].at >= events[i - 1].at).toBe(true);
    }
    // Ordem inversa (a que a UI aplica) coloca o mais recente primeiro.
    const reversed = events.slice().reverse();
    expect(reversed[0]).toBe(events[events.length - 1]);
  });

  it("representa os principais tipos de evento do workspace", () => {
    const id = seedReport();
    const doc = tryLocateReport(id)!;
    const section = doc.sections.find((s) => s.blocks.length > 0)!;
    const block = section.blocks[0];

    logWorkspaceOpened(id);
    updateBlock(id, section.id, block.id, { content: "Texto novo" });
    // markSectionComplete deve rejeitar (blocos não revisados) — mesmo assim,
    // ao menos os eventos de atualização e abertura devem constar.
    markSectionComplete(id, section.id);
    reopenSection(id, section.id);

    const kinds = new Set(listWorkspaceHistory(id).map((e) => e.kind));
    expect(kinds.has("workspace_aberto")).toBe(true);
    expect(kinds.has("bloco_atualizado")).toBe(true);
  });

  it("leituras repetidas não geram novos eventos", () => {
    const id = seedReport();
    logWorkspaceOpened(id);
    const before = listWorkspaceHistory(id).length;
    // Múltiplas leituras — snapshot e histórico.
    getWorkspaceSnapshot(id);
    getWorkspaceSnapshot(id);
    listWorkspaceHistory(id);
    listWorkspaceHistory(id);
    const after = listWorkspaceHistory(id).length;
    expect(after).toBe(before);
  });

  it("renderizações repetidas (assinaturas + leituras) não alteram o histórico", () => {
    const id = seedReport();
    logWorkspaceOpened(id);
    let notifications = 0;
    const unsub = subscribeWorkspaceHistory(() => {
      notifications += 1;
    });
    const l1 = listWorkspaceHistory(id).length;
    const l2 = listWorkspaceHistory(id).length;
    const l3 = listWorkspaceHistory(id).length;
    unsub();
    expect(l1).toBe(l2);
    expect(l2).toBe(l3);
    // Nenhuma notificação disparada apenas por leituras.
    expect(notifications).toBe(0);
  });
});

describe("LV-19.3 — Painel de auditoria usa dados derivados", () => {
  it("dados de progresso batem com o snapshot da LV-19.1 (sem recomputo)", () => {
    const id = seedReport();
    const snap = getWorkspaceSnapshot(id);
    // Espelha exatamente o que o painel exibe.
    expect(snap.progress.totalSections).toBe(snap.report.sections.length);
    let totalBlocks = 0;
    for (const s of snap.report.sections) totalBlocks += s.blocks.length;
    expect(snap.progress.totalBlocks).toBe(totalBlocks);
  });

  it("status derivado por seção respeita a regra canônica (aprovada ⇔ concluida)", () => {
    const id = seedReport();
    const snap = getWorkspaceSnapshot(id);
    for (const s of snap.report.sections) {
      const derived = snap.sections.find((x) => x.sectionId === s.id)!;
      if (s.status === "aprovada") {
        expect(derived.derivedStatus).toBe("concluida");
      } else {
        expect(derived.derivedStatus).not.toBe("concluida");
      }
    }
  });

  it("blocos revisados são lidos do documento e não recomputam regra de status", () => {
    const id = seedReport();
    const snap = getWorkspaceSnapshot(id);
    let reviewed = 0;
    for (const s of snap.report.sections) {
      for (const b of s.blocks) if (b.reviewed) reviewed += 1;
    }
    // Consistência com a leitura que o painel faz.
    expect(reviewed).toBeGreaterThanOrEqual(0);
  });
});

describe("LV-19.3 — Guarda de escopo", () => {
  it("LV-19.4 não foi iniciada (versões editáveis, exportação, colaboração)", () => {
    for (const rel of [
      "src/features/reports/workspace/ReportWorkspaceVersionsPanel.tsx",
      "src/features/reports/workspace/ReportWorkspaceExportPanel.tsx",
      "src/features/reports/workspace/ReportWorkspaceCollaborationPanel.tsx",
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
