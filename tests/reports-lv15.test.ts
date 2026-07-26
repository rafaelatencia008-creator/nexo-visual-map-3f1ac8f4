/**
 * LV-15 — Editor Avançado, Revisão e Exportação Local.
 *
 * Cobertura: mover / duplicar / aprovar seção, motor de revisão,
 * status geral derivado, exportação local (TXT/JSON), auditoria interna
 * e regras de bloqueio para versão revisada.
 */
import { describe, it, expect, beforeEach } from "bun:test";

import {
  REPORT_MANDATORY_SECTIONS,
  REPORT_WATERMARK,
  isMandatorySection,
  type ReportSectionKind,
} from "@/features/reports/report-types";
import {
  addBlock,
  approveSection,
  changeTemplate,
  createReport,
  duplicateBlock,
  getReport,
  linkSourceToBlock,
  listReportHistory,
  logExportPerformed,
  logPreviewOpened,
  markBlockReviewed,
  moveBlock,
  removeBlock,
  renameReport,
  resetReportClock,
  resetReportIdCounter,
  resetReportStore,
  setSectionStatus,
  subscribeReportHistory,
  updateBlockContent,
} from "@/features/reports/report-mock-store";
import {
  canApproveSection,
  computeGeneralStatus,
  computePendingItems,
  computeReviewSummary,
} from "@/features/reports/report-review";
import {
  documentToJson,
  documentToTxt,
  prepareExport,
} from "@/features/reports/report-export";

function seed() {
  resetReportStore();
  resetReportIdCounter(9000);
  resetReportClock();
  return createReport({
    title: "Laudo LV-15",
    templateId: "laudo_psicologico",
    caseId: "case-1",
    caseLabel: "Perícia 001",
  });
}

function fillAndReviewSection(reportId: string, sectionId: string) {
  const doc = getReport(reportId)!;
  const sec = doc.sections.find((s) => s.id === sectionId)!;
  for (const b of sec.blocks) {
    updateBlockContent(reportId, sectionId, b.id, "conteúdo válido");
    markBlockReviewed(reportId, sectionId, b.id, true);
  }
  setSectionStatus(reportId, sectionId, "revisada");
}

describe("LV-15 — constantes e integridade", () => {
  it("expõe watermark obrigatório", () => {
    expect(REPORT_WATERMARK).toContain("DEMONSTRATIVO");
  });
  it("expõe pelo menos 8 seções obrigatórias", () => {
    expect(REPORT_MANDATORY_SECTIONS.length).toBeGreaterThanOrEqual(8);
  });
  it("isMandatorySection reconhece 'conclusao' e ignora 'anexos'", () => {
    expect(isMandatorySection("conclusao")).toBe(true);
    expect(isMandatorySection("anexos")).toBe(false);
  });
});

describe("LV-15 — ações de blocos", () => {
  let reportId = "";
  let sectionId = "";
  beforeEach(() => {
    const doc = seed();
    reportId = doc.id;
    sectionId = doc.sections[0].id;
    // três blocos determinísticos
    addBlock(reportId, sectionId, { title: "A", content: "a" });
    addBlock(reportId, sectionId, { title: "B", content: "b" });
    addBlock(reportId, sectionId, { title: "C", content: "c" });
  });

  it("move bloco para cima", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    const target = before[before.length - 1];
    moveBlock(reportId, sectionId, target.id, "up");
    const after = getReport(reportId)!.sections[0].blocks;
    expect(after[after.length - 2].id).toBe(target.id);
  });

  it("move bloco para baixo", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    const target = before[0];
    moveBlock(reportId, sectionId, target.id, "down");
    const after = getReport(reportId)!.sections[0].blocks;
    expect(after[1].id).toBe(target.id);
  });

  it("mover no limite superior é no-op", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    const target = before[0];
    moveBlock(reportId, sectionId, target.id, "up");
    const after = getReport(reportId)!.sections[0].blocks;
    expect(after[0].id).toBe(target.id);
  });

  it("mover no limite inferior é no-op", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    const target = before[before.length - 1];
    moveBlock(reportId, sectionId, target.id, "down");
    const after = getReport(reportId)!.sections[0].blocks;
    expect(after[after.length - 1].id).toBe(target.id);
  });

  it("duplica bloco imediatamente após o original", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    const target = before[1];
    const idx = before.findIndex((b) => b.id === target.id);
    duplicateBlock(reportId, sectionId, target.id);
    const after = getReport(reportId)!.sections[0].blocks;
    expect(after.length).toBe(before.length + 1);
    expect(after[idx + 1].content).toBe(target.content);
    expect(after[idx + 1].id).not.toBe(target.id);
    expect(after[idx + 1].title).toContain("cópia");
  });

  it("duplicação isola fontes (IDs distintos)", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    const target = before[0];
    linkSourceToBlock(reportId, sectionId, target.id, {
      kind: "documento",
      refId: "doc-1",
      label: "Doc A",
    });
    duplicateBlock(reportId, sectionId, target.id);
    const after = getReport(reportId)!.sections[0].blocks;
    const clone = after[1];
    expect(clone.sources.length).toBe(1);
    expect(clone.sources[0].id).not.toBe(
      after[0].sources[0].id,
    );
    expect(clone.sources[0].refId).toBe("doc-1");
  });

  it("registra histórico bloco_duplicado", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    duplicateBlock(reportId, sectionId, before[0].id);
    const hist = listReportHistory(reportId);
    expect(hist.some((h) => h.kind === "bloco_duplicado")).toBe(true);
  });

  it("registra histórico bloco_movido", () => {
    const before = getReport(reportId)!.sections[0].blocks;
    moveBlock(reportId, sectionId, before[0].id, "down");
    const hist = listReportHistory(reportId);
    expect(hist.some((h) => h.kind === "bloco_movido")).toBe(true);
  });
});

describe("LV-15 — aprovação de seção", () => {
  it("bloqueia aprovação de seção vazia", () => {
    const doc = seed();
    const sec = doc.sections[0];
    // remove todos os blocos
    for (const b of [...sec.blocks]) removeBlock(doc.id, sec.id, b.id);
    const r = approveSection(doc.id, sec.id);
    expect(r.ok).toBe(false);
  });

  it("bloqueia aprovação com bloco vazio", () => {
    const doc = seed();
    const sec = doc.sections[0];
    for (const b of sec.blocks) {
      updateBlockContent(doc.id, sec.id, b.id, "");
      markBlockReviewed(doc.id, sec.id, b.id, true);
    }
    const r = approveSection(doc.id, sec.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.toLowerCase()).toContain("conteúdo");
  });

  it("bloqueia aprovação com bloco não revisado", () => {
    const doc = seed();
    const sec = doc.sections[0];
    for (const b of sec.blocks) {
      updateBlockContent(doc.id, sec.id, b.id, "texto");
    }
    const r = approveSection(doc.id, sec.id);
    expect(r.ok).toBe(false);
  });

  it("aprova quando todos blocos estão preenchidos e revisados", () => {
    const doc = seed();
    const sec = doc.sections[0];
    fillAndReviewSection(doc.id, sec.id);
    const r = approveSection(doc.id, sec.id);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const updated = r.document.sections.find((s) => s.id === sec.id)!;
      expect(updated.status).toBe("aprovada");
    }
  });

  it("canApproveSection é consistente com approveSection", () => {
    const doc = seed();
    const sec = doc.sections[0];
    expect(canApproveSection(sec).ok).toBe(false);
    fillAndReviewSection(doc.id, sec.id);
    const updated = getReport(doc.id)!.sections.find((s) => s.id === sec.id)!;
    expect(canApproveSection(updated).ok).toBe(true);
  });

  it("editar bloco de seção aprovada rebaixa para em_elaboracao", () => {
    const doc = seed();
    const sec = doc.sections[0];
    fillAndReviewSection(doc.id, sec.id);
    approveSection(doc.id, sec.id);
    const target = getReport(doc.id)!.sections.find((s) => s.id === sec.id)!;
    expect(target.status).toBe("aprovada");
    updateBlockContent(doc.id, sec.id, target.blocks[0].id, "novo texto");
    const after = getReport(doc.id)!.sections.find((s) => s.id === sec.id)!;
    expect(after.status).toBe("em_elaboracao");
  });
});

describe("LV-15 — motor de revisão", () => {
  it("documento novo tem impeditivos e status rascunho", () => {
    const doc = seed();
    const s = computeReviewSummary(doc);
    expect(s.blockingCount).toBeGreaterThan(0);
    expect(s.generalStatus).toBe("rascunho");
    expect(s.canApproveExport).toBe(false);
  });

  it("documento sem título gera impeditivo titulo_vazio", () => {
    const doc = seed();
    renameReport(doc.id, "   ");
    const cur = getReport(doc.id)!;
    const items = computePendingItems(cur);
    expect(items.some((p) => p.kind === "titulo_vazio")).toBe(true);
  });

  it("documento sem perícia gera impeditivo sem_pericia", () => {
    resetReportStore();
    resetReportIdCounter(9000);
    resetReportClock();
    const doc = createReport({
      title: "X",
      templateId: "laudo_psicologico",
      caseId: "",
      caseLabel: "",
    });
    const items = computePendingItems(doc);
    expect(items.some((p) => p.kind === "sem_pericia")).toBe(true);
  });

  it("aviso de bloco sem fonte", () => {
    const doc = seed();
    const items = computePendingItems(doc);
    expect(items.some((p) => p.kind === "bloco_sem_fonte")).toBe(true);
  });

  it("aviso de bloco editado após revisão", () => {
    const doc = seed();
    const sec = doc.sections[0];
    for (const b of sec.blocks) {
      updateBlockContent(doc.id, sec.id, b.id, "primeiro");
      markBlockReviewed(doc.id, sec.id, b.id, true);
    }
    setSectionStatus(doc.id, sec.id, "revisada");
    // edita depois da revisão => manuallyEdited && !reviewed
    const cur = getReport(doc.id)!.sections.find((s) => s.id === sec.id)!;
    updateBlockContent(doc.id, sec.id, cur.blocks[0].id, "segundo texto");
    const items = computePendingItems(getReport(doc.id)!);
    expect(items.some((p) => p.kind === "bloco_editado_apos_revisao")).toBe(true);
  });

  it("aviso de sem_anexos quando seção anexos está vazia", () => {
    const doc = seed();
    const items = computePendingItems(doc);
    expect(items.some((p) => p.kind === "sem_anexos")).toBe(true);
  });

  it("status revisado quando todas obrigatórias estão revisadas", () => {
    const doc = seed();
    for (const kind of REPORT_MANDATORY_SECTIONS as readonly ReportSectionKind[]) {
      const sec = doc.sections.find((s) => s.kind === kind);
      if (!sec) continue;
      fillAndReviewSection(doc.id, sec.id);
    }
    const cur = getReport(doc.id)!;
    const status = computeGeneralStatus(cur);
    expect(status === "revisado" || status === "aprovado_demonstrativo").toBe(true);
  });

  it("status aprovado_demonstrativo quando todas obrigatórias aprovadas", () => {
    const doc = seed();
    for (const kind of REPORT_MANDATORY_SECTIONS as readonly ReportSectionKind[]) {
      const sec = doc.sections.find((s) => s.kind === kind);
      if (!sec) continue;
      fillAndReviewSection(doc.id, sec.id);
      approveSection(doc.id, sec.id);
    }
    const cur = getReport(doc.id)!;
    const s = computeReviewSummary(cur);
    // caso ainda haja impeditivo (ex: sem_pericia false), ver contagem
    if (s.blockingCount === 0) {
      expect(s.generalStatus).toBe("aprovado_demonstrativo");
      expect(s.canApproveExport).toBe(true);
    } else {
      expect(s.generalStatus).not.toBe("aprovado_demonstrativo");
    }
  });
});

describe("LV-15 — exportação local", () => {
  it("TXT contém watermark no início e fim", () => {
    const doc = seed();
    const txt = documentToTxt(doc);
    expect(txt.startsWith(REPORT_WATERMARK)).toBe(true);
    expect(txt.trim().endsWith(REPORT_WATERMARK)).toBe(true);
  });

  it("TXT lista todas as seções do modelo", () => {
    const doc = seed();
    const txt = documentToTxt(doc);
    for (const s of doc.sections) {
      expect(txt).toContain(s.title);
    }
  });

  it("JSON válido inclui watermark e documento", () => {
    const doc = seed();
    const json = documentToJson(doc);
    const obj = JSON.parse(json) as { watermark: string; document: { id: string } };
    expect(obj.watermark).toBe(REPORT_WATERMARK);
    expect(obj.document.id).toBe(doc.id);
  });

  it("prepareExport bloqueia versão revisada com impeditivos", () => {
    const doc = seed();
    const r = prepareExport(doc, "txt", "revisada");
    expect(r.ok).toBe(false);
  });

  it("prepareExport permite rascunho mesmo com impeditivos", () => {
    const doc = seed();
    const r = prepareExport(doc, "txt", "rascunho");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.filename.endsWith(".txt")).toBe(true);
      expect(r.payload.watermark).toBe(REPORT_WATERMARK);
    }
  });

  it("prepareExport para JSON usa MIME correto", () => {
    const doc = seed();
    const r = prepareExport(doc, "json", "rascunho");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.mime).toContain("application/json");
  });

  it("prepareExport para print retorna html", () => {
    const doc = seed();
    const r = prepareExport(doc, "print", "rascunho");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.format).toBe("print");
  });

  it("filename é slug seguro do título", () => {
    resetReportStore();
    resetReportIdCounter(9000);
    resetReportClock();
    const doc = createReport({
      title: "Ação Pública / Nº 123",
      templateId: "laudo_psicologico",
      caseId: "c1",
      caseLabel: "P",
    });
    const r = prepareExport(doc, "txt", "rascunho");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.filename).toMatch(/^acao-publica-n-123-/);
  });
});

describe("LV-15 — histórico e auditoria", () => {
  it("createReport registra evento documento_criado", () => {
    const doc = seed();
    const hist = listReportHistory(doc.id);
    expect(hist.some((h) => h.kind === "documento_criado")).toBe(true);
  });

  it("changeTemplate registra evento modelo_alterado", () => {
    const doc = seed();
    changeTemplate(doc.id, "parecer_psicologico");
    const hist = listReportHistory(doc.id);
    expect(hist.some((h) => h.kind === "modelo_alterado")).toBe(true);
  });

  it("logPreviewOpened e logExportPerformed registram eventos", () => {
    const doc = seed();
    logPreviewOpened(doc.id);
    logExportPerformed(doc.id, "TXT rascunho");
    const hist = listReportHistory(doc.id);
    expect(hist.some((h) => h.kind === "previa_aberta")).toBe(true);
    expect(hist.some((h) => h.kind === "exportacao_realizada")).toBe(true);
  });

  it("subscribeReportHistory notifica ouvintes", () => {
    const doc = seed();
    let calls = 0;
    const off = subscribeReportHistory(() => (calls += 1));
    logPreviewOpened(doc.id);
    logExportPerformed(doc.id, "TXT");
    off();
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("listReportHistory sem filtro devolve todos", () => {
    seed();
    const all = listReportHistory();
    expect(all.length).toBeGreaterThan(0);
  });

  it("resetReportStore limpa histórico", () => {
    seed();
    resetReportStore();
    expect(listReportHistory().length).toBe(0);
  });
});
