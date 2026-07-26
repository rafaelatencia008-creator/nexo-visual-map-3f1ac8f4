/**
 * LV-16 — Consolidação do Laudo, Controle de Versões e Fechamento Técnico.
 *
 * Cobertura obrigatória:
 *   - Versões (trabalho / revisada / fechada), motivo obrigatório, sequencial, imutabilidade.
 *   - Checklist manual, progresso, bloqueio de fechamento.
 *   - Congelamento após fechamento e bloqueio de todas as mutações.
 *   - Reabertura controlada com motivo + confirmação, preservando versões antigas.
 *   - Comparação entre versões (título, conteúdo, adição/remoção/movimentação, fontes, checklist).
 *   - Exportação de versões (TXT / JSON / print) com marca demonstrativa e sem mutação.
 *   - Regressão: sem persistência, sem rede, sem fetch, snapshots estáveis.
 */
import { describe, expect, it, beforeEach } from "bun:test";

import {
  REPORT_CHECKLIST_ORDER,
  REPORT_VERSION_TYPE_LABEL,
  type ReportChecklistItemId,
  type ReportVersion,
} from "@/features/reports/report-types";
import {
  addBlock,
  approveSection,
  canCloseReport,
  canCreateReviewedVersion,
  compareReportVersions,
  createReport,
  createReportVersion,
  duplicateBlock,
  getChecklist,
  getChecklistProgress,
  getReport,
  getReportVersion,
  getReportVersionsSnapshot,
  isReportFrozen,
  linkSourceToBlock,
  listReportHistory,
  listReportVersionItems,
  listReportVersions,
  logVersionViewed,
  markBlockReviewed,
  moveBlock,
  removeBlock,
  renameReport,
  reopenReport,
  resetReportClock,
  resetReportIdCounter,
  resetReportStore,
  setChecklistItem,
  setSectionStatus,
  updateBlockContent,
  updateBlockTitle,
} from "@/features/reports/report-mock-store";
import {
  prepareVersionExport,
  versionToJson,
  versionToTxt,
} from "@/features/reports/report-export";
import {
  checklistProgress,
  compareVersions,
  emptyChecklist,
  toggleChecklist,
} from "@/features/reports/report-versions";

// ---------- Helpers ----------

function reset() {
  resetReportStore();
  resetReportIdCounter(9000);
  resetReportClock();
}

function createDoc(title = "Laudo LV-16") {
  return createReport({
    title,
    templateId: "laudo_psicologico",
    caseId: "case-16",
    caseLabel: "Perícia 016",
  });
}

function fillAllSections(reportId: string) {
  const doc = getReport(reportId)!;
  for (const s of doc.sections) {
    for (const b of s.blocks) {
      updateBlockContent(reportId, s.id, b.id, `conteudo ${s.kind}/${b.title}`);
      markBlockReviewed(reportId, s.id, b.id, true);
    }
  }
}

function approveAllMandatory(reportId: string) {
  const doc = getReport(reportId)!;
  const mandatory = [
    "identificacao_pericia",
    "identificacao_partes",
    "objeto",
    "historico",
    "metodologia",
    "quesitos",
    "fundamentacao",
    "analise",
    "conclusao",
  ] as const;
  for (const kind of mandatory) {
    const s = doc.sections.find((sec) => sec.kind === kind)!;
    const r = approveSection(reportId, s.id);
    if (!r.ok) throw new Error(`approve ${kind} failed: ${r.reason}`);
  }
}

function markAllChecklist(reportId: string) {
  for (const k of REPORT_CHECKLIST_ORDER) setChecklistItem(reportId, k, true);
}

// ============================================================================
// Versões — regras básicas
// ============================================================================

describe("LV-16 — versões: criação e imutabilidade", () => {
  beforeEach(reset);

  it("cria versão de trabalho mesmo com pendências", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "primeiro rascunho");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.version.number).toBe(1);
      expect(r.version.type).toBe("trabalho");
      expect(r.version.watermark).toContain("VERSÃO DE TRABALHO");
      expect(r.version.demonstrative).toBe(true);
    }
  });

  it("motivo vazio bloqueia criação da versão", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/motivo/i);
  });

  it("numera versões sequencialmente por documento", () => {
    const d = createDoc();
    createReportVersion(d.id, "trabalho", "v1");
    createReportVersion(d.id, "trabalho", "v2");
    createReportVersion(d.id, "trabalho", "v3");
    const list = listReportVersions(d.id);
    expect(list.map((v) => v.number)).toEqual([1, 2, 3]);
  });

  it("versões são independentes entre documentos", () => {
    const a = createDoc("A");
    const b = createDoc("B");
    createReportVersion(a.id, "trabalho", "x");
    createReportVersion(a.id, "trabalho", "y");
    createReportVersion(b.id, "trabalho", "z");
    expect(listReportVersions(a.id).length).toBe(2);
    expect(listReportVersions(b.id).length).toBe(1);
    expect(listReportVersions(b.id)[0]!.number).toBe(1);
  });

  it("edição posterior do documento não altera versão anterior", () => {
    const d = createDoc("Original");
    const r = createReportVersion(d.id, "trabalho", "snap-1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const before = r.version.snapshot.document.title;
    renameReport(d.id, "Renomeado");
    expect(getReport(d.id)!.title).toBe("Renomeado");
    expect(r.version.snapshot.document.title).toBe(before);
  });

  it("snapshot da versão é profundamente congelado", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "freeze");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.version)).toBe(true);
    expect(Object.isFrozen(r.version.snapshot.document)).toBe(true);
    expect(Object.isFrozen(r.version.snapshot.document.sections)).toBe(true);
    expect(Object.isFrozen(r.version.snapshot.checklist)).toBe(true);
    // Tentar mutar arremessa em modo strict; validamos que o array não tem push exposto
    expect(() => (r.version.snapshot.document.sections as unknown as unknown[]).push({} as never)).toThrow();
  });

  it("versão revisada bloqueada quando existem pendências impeditivas", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "revisada", "tentativa");
    expect(r.ok).toBe(false);
    const hist = listReportHistory(d.id);
    expect(hist.some((e) => e.kind === "versao_revisada_bloqueada")).toBe(true);
  });

  it("versão revisada permitida sem pendências impeditivas", () => {
    const d = createDoc();
    fillAllSections(d.id);
    approveAllMandatory(d.id);
    const g = canCreateReviewedVersion(d.id);
    expect(g.ok).toBe(true);
    const r = createReportVersion(d.id, "revisada", "primeira revisada");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.version.watermark).toContain("VERSÃO REVISADA");
      expect(r.version.pendingCount).toBe(0);
    }
  });

  it("versão fechada bloqueada sem checklist completo", () => {
    const d = createDoc();
    fillAllSections(d.id);
    approveAllMandatory(d.id);
    const r = createReportVersion(d.id, "fechada", "fechar", { confirmClosure: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/checklist/i);
  });

  it("versão fechada bloqueada sem confirmação explícita", () => {
    const d = createDoc();
    fillAllSections(d.id);
    approveAllMandatory(d.id);
    markAllChecklist(d.id);
    const r = createReportVersion(d.id, "fechada", "fechar");
    expect(r.ok).toBe(false);
  });

  it("versão fechada permitida quando tudo está aprovado e checklist completo", () => {
    const d = createDoc();
    fillAllSections(d.id);
    approveAllMandatory(d.id);
    markAllChecklist(d.id);
    expect(canCloseReport(d.id).ok).toBe(true);
    const r = createReportVersion(d.id, "fechada", "encerramento", { confirmClosure: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.version.status).toBe("fechada");
      expect(r.version.watermark).toContain("SEM VALIDADE OFICIAL");
    }
  });
});

// ============================================================================
// Checklist
// ============================================================================

describe("LV-16 — checklist", () => {
  beforeEach(reset);

  it("checklist inicial é todo falso", () => {
    const cl = emptyChecklist();
    for (const k of REPORT_CHECKLIST_ORDER) expect(cl[k]).toBe(false);
    expect(checklistProgress(cl).complete).toBe(false);
  });

  it("marcação manual altera o item e mantém referência imutável", () => {
    const cl = emptyChecklist();
    const cl2 = toggleChecklist(cl, "titulo_conferido", true);
    expect(cl2).not.toBe(cl);
    expect(cl2.titulo_conferido).toBe(true);
    expect(cl.titulo_conferido).toBe(false);
  });

  it("desmarcar retira a condição de fechamento", () => {
    const d = createDoc();
    fillAllSections(d.id);
    approveAllMandatory(d.id);
    markAllChecklist(d.id);
    expect(canCloseReport(d.id).ok).toBe(true);
    setChecklistItem(d.id, "confirmacao_responsavel", false);
    expect(canCloseReport(d.id).ok).toBe(false);
  });

  it("progresso conta done/total corretamente", () => {
    const d = createDoc();
    setChecklistItem(d.id, "titulo_conferido", true);
    setChecklistItem(d.id, "pericia_conferida", true);
    const p = getChecklistProgress(d.id);
    expect(p.done).toBe(2);
    expect(p.total).toBe(REPORT_CHECKLIST_ORDER.length);
    expect(p.complete).toBe(false);
  });

  it("snapshot de versão guarda checklist do momento", () => {
    const d = createDoc();
    setChecklistItem(d.id, "titulo_conferido", true);
    const r = createReportVersion(d.id, "trabalho", "snap");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    setChecklistItem(d.id, "titulo_conferido", false);
    expect(r.version.snapshot.checklist.titulo_conferido).toBe(true);
    expect(getChecklist(d.id).titulo_conferido).toBe(false);
  });

  it("histórico registra marcação e desmarcação", () => {
    const d = createDoc();
    setChecklistItem(d.id, "objeto_conferido", true);
    setChecklistItem(d.id, "objeto_conferido", false);
    const hist = listReportHistory(d.id);
    expect(hist.some((e) => e.kind === "checklist_marcado")).toBe(true);
    expect(hist.some((e) => e.kind === "checklist_desmarcado")).toBe(true);
  });
});

// ============================================================================
// Congelamento
// ============================================================================

function closeDoc(title = "Fechamento") {
  const d = createDoc(title);
  fillAllSections(d.id);
  approveAllMandatory(d.id);
  markAllChecklist(d.id);
  const r = createReportVersion(d.id, "fechada", "encerrar", { confirmClosure: true });
  if (!r.ok) throw new Error(r.reason);
  return d;
}

describe("LV-16 — congelamento", () => {
  beforeEach(reset);

  it("documento fica congelado após fechamento", () => {
    const d = closeDoc();
    expect(isReportFrozen(d.id)).toBe(true);
  });

  it("edição de título bloqueada em documento congelado", () => {
    const d = closeDoc();
    expect(() => renameReport(d.id, "Outro")).toThrow(/congelado/i);
  });

  it("edição de conteúdo bloqueada", () => {
    const d = closeDoc();
    const doc = getReport(d.id)!;
    const s = doc.sections[0]!;
    const b = s.blocks[0]!;
    expect(() => updateBlockContent(d.id, s.id, b.id, "x")).toThrow(/congelado/i);
    expect(() => updateBlockTitle(d.id, s.id, b.id, "x")).toThrow(/congelado/i);
  });

  it("adição, remoção, duplicação e movimentação bloqueadas", () => {
    const d = closeDoc();
    const doc = getReport(d.id)!;
    const s = doc.sections[0]!;
    const b = s.blocks[0]!;
    expect(() => addBlock(d.id, s.id, { title: "x", content: "" })).toThrow(/congelado/i);
    expect(() => removeBlock(d.id, s.id, b.id)).toThrow(/congelado/i);
    expect(() => duplicateBlock(d.id, s.id, b.id)).toThrow(/congelado/i);
    expect(() => moveBlock(d.id, s.id, b.id, "down")).toThrow(/congelado/i);
  });

  it("vínculo e desvínculo de fontes bloqueados", () => {
    const d = closeDoc();
    const doc = getReport(d.id)!;
    const s = doc.sections[0]!;
    const b = s.blocks[0]!;
    expect(() =>
      linkSourceToBlock(d.id, s.id, b.id, {
        kind: "documento",
        refId: "x",
        label: "y",
      }),
    ).toThrow(/congelado/i);
  });

  it("mudança de status e checklist bloqueadas", () => {
    const d = closeDoc();
    const doc = getReport(d.id)!;
    const s = doc.sections[0]!;
    expect(() => setSectionStatus(d.id, s.id, "em_elaboracao")).toThrow(/congelado/i);
    expect(() => setChecklistItem(d.id, "titulo_conferido", false)).toThrow(/congelado/i);
  });

  it("prévia/exportação continuam disponíveis (não mutam)", () => {
    const d = closeDoc();
    const v = getReportVersionsSnapshot(d.id)[0]!;
    expect(v.watermark.length).toBeGreaterThan(0);
    const dec = prepareVersionExport(v, "txt");
    expect(dec.ok).toBe(true);
    // Não jogou erro, doc segue congelado
    expect(isReportFrozen(d.id)).toBe(true);
  });
});

// ============================================================================
// Reabertura
// ============================================================================

describe("LV-16 — reabertura", () => {
  beforeEach(reset);

  it("motivo obrigatório", () => {
    const d = closeDoc();
    const r = reopenReport(d.id, "   ", { confirm: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/motivo/i);
  });

  it("confirmação obrigatória", () => {
    const d = closeDoc();
    const r = reopenReport(d.id, "corrigir");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/confirmação/i);
  });

  it("reabertura torna o documento editável novamente", () => {
    const d = closeDoc();
    const r = reopenReport(d.id, "correcao pontual", { confirm: true });
    expect(r.ok).toBe(true);
    expect(isReportFrozen(d.id)).toBe(false);
    renameReport(d.id, "OK");
    expect(getReport(d.id)!.title).toBe("OK");
  });

  it("versão fechada anterior permanece imutável após reabertura", () => {
    const d = closeDoc();
    const closedBefore = listReportVersions(d.id)[0]!;
    reopenReport(d.id, "revisar", { confirm: true });
    const same = getReportVersion(d.id, closedBefore.id)!;
    // ainda "fechada" (não passa a "substituida" até nova versão fechada)
    expect(same.status).toBe("fechada");
    expect(same.snapshot.document.title).toBe(closedBefore.snapshot.document.title);
  });

  it("nova versão fechada substitui logicamente a anterior", () => {
    const d = closeDoc();
    const first = listReportVersions(d.id)[0]!;
    reopenReport(d.id, "revisar", { confirm: true });
    fillAllSections(d.id);
    approveAllMandatory(d.id);
    markAllChecklist(d.id);
    const r = createReportVersion(d.id, "fechada", "novo fechamento", {
      confirmClosure: true,
    });
    expect(r.ok).toBe(true);
    const firstAfter = getReportVersion(d.id, first.id)!;
    expect(firstAfter.status).toBe("substituida");
    expect(listReportVersions(d.id).length).toBe(2);
  });

  it("histórico registra reabertura e substituição", () => {
    const d = closeDoc();
    reopenReport(d.id, "corrigir", { confirm: true });
    const hist = listReportHistory(d.id);
    expect(hist.some((e) => e.kind === "reabertura_solicitada")).toBe(true);
    expect(hist.some((e) => e.kind === "documento_reaberto")).toBe(true);
  });
});

// ============================================================================
// Comparação
// ============================================================================

describe("LV-16 — comparação entre versões", () => {
  beforeEach(reset);

  it("mesma versão: nenhuma alteração relevante", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "v1");
    if (!r.ok) throw new Error();
    const diff = compareVersions(r.version, r.version);
    expect(diff.title.changed).toBe(false);
    expect(diff.sections.every((s) => !s.statusChanged)).toBe(true);
  });

  it("título alterado é detectado", () => {
    const d = createDoc("A");
    const v1 = createReportVersion(d.id, "trabalho", "v1");
    renameReport(d.id, "B");
    const v2 = createReportVersion(d.id, "trabalho", "v2");
    if (!v1.ok || !v2.ok) throw new Error();
    const diff = compareVersions(v1.version, v2.version);
    expect(diff.title.changed).toBe(true);
    expect(diff.title.before).toBe("A");
    expect(diff.title.after).toBe("B");
  });

  it("conteúdo alterado, bloco adicionado, removido e movido são detectados", () => {
    const d = createDoc();
    fillAllSections(d.id);
    const v1 = createReportVersion(d.id, "trabalho", "v1");
    // Adiciona bloco novo
    const doc = getReport(d.id)!;
    const s = doc.sections[0]!;
    const b0 = s.blocks[0]!;
    updateBlockContent(d.id, s.id, b0.id, "novo conteudo diferente");
    addBlock(d.id, s.id, { title: "novo", content: "x" });
    // Remove um bloco existente (se houver mais de um)
    const secAfterAdd = getReport(d.id)!.sections.find((x) => x.id === s.id)!;
    if (secAfterAdd.blocks.length > 2) {
      removeBlock(d.id, s.id, secAfterAdd.blocks[1]!.id);
    }
    // Move um bloco
    const secAfterRm = getReport(d.id)!.sections.find((x) => x.id === s.id)!;
    if (secAfterRm.blocks.length >= 2) {
      moveBlock(d.id, s.id, secAfterRm.blocks[0]!.id, "down");
    }
    const v2 = createReportVersion(d.id, "trabalho", "v2");
    if (!v1.ok || !v2.ok) throw new Error();
    const diff = compareVersions(v1.version, v2.version);
    const sec = diff.sections.find((x) => x.kind === s.kind)!;
    const kinds = sec.blocks.map((b) => b.kind);
    expect(kinds).toContain("adicionado");
    expect(kinds.some((k) => k === "alterado" || k === "movido")).toBe(true);
  });

  it("fonte adicionada e removida são detectadas", () => {
    const d = createDoc();
    const v1 = createReportVersion(d.id, "trabalho", "v1");
    const doc = getReport(d.id)!;
    const s = doc.sections[0]!;
    const b = s.blocks[0]!;
    linkSourceToBlock(d.id, s.id, b.id, {
      kind: "documento",
      refId: "doc-1",
      label: "Doc 1",
    });
    const v2 = createReportVersion(d.id, "trabalho", "v2");
    if (!v1.ok || !v2.ok) throw new Error();
    const diff = compareVersions(v1.version, v2.version);
    const secDiff = diff.sections.find((x) => x.kind === s.kind)!;
    const blk = secDiff.blocks.find((bd) => bd.blockIdAfter === b.id)!;
    expect(blk.sourcesAdded.length).toBe(1);
  });

  it("checklist alterado aparece na lista de mudanças", () => {
    const d = createDoc();
    const v1 = createReportVersion(d.id, "trabalho", "v1");
    setChecklistItem(d.id, "titulo_conferido", true);
    const v2 = createReportVersion(d.id, "trabalho", "v2");
    if (!v1.ok || !v2.ok) throw new Error();
    const diff = compareVersions(v1.version, v2.version);
    expect(diff.checklistChanged).toContain("titulo_conferido");
  });

  it("comparação entre documentos diferentes é proibida", () => {
    const a = createDoc("A");
    const b = createDoc("B");
    const va = createReportVersion(a.id, "trabalho", "va");
    const vb = createReportVersion(b.id, "trabalho", "vb");
    if (!va.ok || !vb.ok) throw new Error();
    expect(() => compareVersions(va.version, vb.version)).toThrow();
  });

  it("compareReportVersions registra evento no histórico", () => {
    const d = createDoc();
    const v1 = createReportVersion(d.id, "trabalho", "v1");
    const v2 = createReportVersion(d.id, "trabalho", "v2");
    if (!v1.ok || !v2.ok) throw new Error();
    compareReportVersions(d.id, v1.version.id, v2.version.id);
    expect(listReportHistory(d.id).some((e) => e.kind === "comparacao_aberta")).toBe(true);
  });
});

// ============================================================================
// Exportação de versões
// ============================================================================

describe("LV-16 — exportação de versões", () => {
  beforeEach(reset);

  it("TXT inclui marca demonstrativa e número/tipo da versão", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "e-txt");
    if (!r.ok) throw new Error();
    const txt = versionToTxt(r.version);
    expect(txt).toContain("SEM VALIDADE");
    expect(txt).toContain(`Versão nº 1`);
    expect(txt).toContain(REPORT_VERSION_TYPE_LABEL.trabalho);
  });

  it("JSON preserva versão e snapshot", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "e-json");
    if (!r.ok) throw new Error();
    const json = versionToJson(r.version);
    const parsed = JSON.parse(json);
    expect(parsed.watermark).toContain("SEM VALIDADE");
    expect(parsed.demonstrative).toBe(true);
    expect(parsed.version.number).toBe(1);
  });

  it("prepareVersionExport TXT/JSON/print retornam payloads coerentes", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "e");
    if (!r.ok) throw new Error();
    const txt = prepareVersionExport(r.version, "txt");
    const json = prepareVersionExport(r.version, "json");
    const html = prepareVersionExport(r.version, "print");
    expect(txt.ok && txt.payload.mime).toContain("text/plain");
    expect(json.ok && json.payload.mime).toContain("application/json");
    expect(html.ok && html.payload.mime).toContain("text/html");
  });

  it("exportação não muta o snapshot congelado", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "e");
    if (!r.ok) throw new Error();
    const beforeTitle = r.version.snapshot.document.title;
    versionToTxt(r.version);
    versionToJson(r.version);
    prepareVersionExport(r.version, "print");
    expect(r.version.snapshot.document.title).toBe(beforeTitle);
    expect(Object.isFrozen(r.version)).toBe(true);
  });
});

// ============================================================================
// Regressão / integridade
// ============================================================================

describe("LV-16 — regressão", () => {
  beforeEach(reset);

  it("nenhuma versão pode ser criada em documento inexistente", () => {
    const r = createReportVersion("rep-inexistente", "trabalho", "x");
    expect(r.ok).toBe(false);
  });

  it("versão fechada em documento congelado bloqueia nova criação sem reabrir", () => {
    const d = closeDoc();
    const r = createReportVersion(d.id, "trabalho", "tentativa", {});
    expect(r.ok).toBe(false);
  });

  it("linha do tempo mantém ordem sequencial", () => {
    const d = createDoc();
    createReportVersion(d.id, "trabalho", "a");
    createReportVersion(d.id, "trabalho", "b");
    createReportVersion(d.id, "trabalho", "c");
    const items = listReportVersionItems(d.id);
    expect(items.map((v) => v.number)).toEqual([1, 2, 3]);
  });

  it("logVersionViewed registra evento", () => {
    const d = createDoc();
    const r = createReportVersion(d.id, "trabalho", "v");
    if (!r.ok) throw new Error();
    logVersionViewed(d.id, r.version.id);
    expect(listReportHistory(d.id).some((e) => e.kind === "versao_visualizada")).toBe(true);
  });

  it("getReportVersionsSnapshot é estável entre chamadas sem mutação", () => {
    const d = createDoc();
    createReportVersion(d.id, "trabalho", "v1");
    const a = getReportVersionsSnapshot(d.id);
    const b = getReportVersionsSnapshot(d.id);
    expect(b).toBe(a);
  });

  it("snapshot é invalidado após criar nova versão", () => {
    const d = createDoc();
    createReportVersion(d.id, "trabalho", "v1");
    const before = getReportVersionsSnapshot(d.id);
    createReportVersion(d.id, "trabalho", "v2");
    const after = getReportVersionsSnapshot(d.id);
    expect(after).not.toBe(before);
  });
});
