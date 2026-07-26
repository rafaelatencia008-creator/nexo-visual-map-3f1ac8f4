/**
 * LV-18.2 — Validação, versionamento imutável, comparação, histórico.
 */
import { describe, expect, it, beforeEach } from "bun:test";

import { FIXTURE_TEMPLATE_IDS } from "@/features/report-templates/report-template-fixtures";
import {
  addBlock,
  addSection,
  addVariable,
  archiveTemplate,
  createManualTemplateVersion,
  createTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplateHistory,
  listTemplateVersions,
  publishTemplate,
  reactivateTemplate,
  removeVariable,
  resetReportTemplateStore,
  returnTemplateToDraft,
  subscribeTemplateHistory,
  subscribeTemplateVersions,
  updateSection,
} from "@/features/report-templates/report-template-use-cases";
import {
  compareReportTemplates,
} from "@/features/report-templates/report-template-version-diff";
import { validateReportTemplate } from "@/features/report-templates/report-template-validation";
import {
  ReportTemplateError,
  type ReportTemplateSectionId,
} from "@/features/report-templates/report-template-types";

const PSICO = FIXTURE_TEMPLATE_IDS.laudoPsicologico;
const VAZIO = FIXTURE_TEMPLATE_IDS.modeloVazio;
const TECN = FIXTURE_TEMPLATE_IDS.relatorioTecnico;

beforeEach(() => {
  resetReportTemplateStore();
});

// ============ Validação ============

describe("LV-18.2 · Validação", () => {
  it("modelo válido não gera erros", () => {
    const t = getTemplate(PSICO)!;
    const r = validateReportTemplate(t);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("nome vazio gera erro", () => {
    const t = getTemplate(PSICO)!;
    const mutated = { ...t, name: "  " };
    const r = validateReportTemplate(mutated);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "empty_name")).toBe(true);
  });

  it("modelo sem seções (não-vazio) gera erro", () => {
    const t = getTemplate(TECN)!;
    const mutated = { ...t, sections: [] };
    const r = validateReportTemplate(mutated);
    expect(r.errors.some((e) => e.code === "no_sections")).toBe(true);
  });

  it("modelo vazio em rascunho é aceito sem erro no_sections", () => {
    const t = getTemplate(VAZIO)!;
    const r = validateReportTemplate(t);
    expect(r.errors.some((e) => e.code === "no_sections")).toBe(false);
  });

  it("referência a variável inexistente gera erro", () => {
    const t = createTemplate({ name: "X" });
    const s = addSection(t.id, { title: "S" });
    addBlock(t.id, s.id, { kind: "paragrafo", content: "olá {{nao_existe}}" });
    const r = validateReportTemplate(getTemplate(t.id)!);
    expect(r.errors.some((e) => e.code === "invalid_variable_reference")).toBe(true);
  });

  it("variável declarada mas não utilizada gera aviso", () => {
    const t = createTemplate({ name: "X" });
    const s = addSection(t.id, { title: "S" });
    addBlock(t.id, s.id, { kind: "paragrafo", content: "sem vars" });
    addVariable(t.id, { key: "nao_usada", label: "N" });
    const r = validateReportTemplate(getTemplate(t.id)!);
    expect(r.warnings.some((w) => w.code === "unused_variable")).toBe(true);
  });

  it("resultado é imutável", () => {
    const t = getTemplate(PSICO)!;
    const r = validateReportTemplate(t);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.errors)).toBe(true);
    expect(Object.isFrozen(r.warnings)).toBe(true);
  });

  it("validação é determinística", () => {
    const t = getTemplate(PSICO)!;
    expect(validateReportTemplate(t)).toEqual(validateReportTemplate(t));
  });

  it("chave inválida gera erro", () => {
    const t = createTemplate({ name: "X" });
    // Não conseguimos criar chave inválida via store, então validamos objeto direto.
    const mutated = getTemplate(t.id)!;
    const fake = {
      ...mutated,
      variables: [
        {
          id: "rvar-fake" as never,
          key: "Chave Inválida",
          label: "x",
          kind: "texto" as const,
          required: false,
          defaultValue: "",
        },
      ],
    };
    const r = validateReportTemplate(fake as never);
    expect(r.errors.some((e) => e.code === "invalid_variable_key")).toBe(true);
  });
});

// ============ Publicação e transições ============

describe("LV-18.2 · Transições e publicação", () => {
  it("publica um modelo válido de rascunho e cria versão", () => {
    returnTemplateToDraft(PSICO);
    const t = publishTemplate(PSICO);
    expect(t.status).toBe("publicado");
    const vs = listTemplateVersions(PSICO);
    expect(vs.length).toBe(1);
    expect(vs[0]!.versionNumber).toBe(1);
    expect(vs[0]!.statusAtCreation).toBe("publicado");
  });

  it("publicação de já publicado é bloqueada com invalid_transition", () => {
    expect(() => publishTemplate(PSICO)).toThrow(ReportTemplateError);
  });

  it("bloqueia publicação de modelo sem seções (não isento)", () => {
    const t = createTemplate({ name: "Novo modelo" });
    expect(() => publishTemplate(t.id)).toThrow(ReportTemplateError);
    expect(getTemplate(t.id)!.status).toBe("rascunho");
    expect(listTemplateVersions(t.id)).toHaveLength(0);
    const hist = listTemplateHistory(t.id);
    expect(hist.some((e) => e.action === "template_publication_blocked")).toBe(true);
  });

  it("retorna publicado para rascunho", () => {
    const back = returnTemplateToDraft(PSICO);
    expect(back.status).toBe("rascunho");
    const hist = listTemplateHistory(PSICO);
    expect(hist.some((e) => e.action === "template_returned_to_draft")).toBe(true);
  });

  it("bloqueia transições inválidas", () => {
    archiveTemplate(PSICO);
    expect(() => publishTemplate(PSICO)).toThrow(ReportTemplateError);
  });

  it("reativação de arquivado", () => {
    archiveTemplate(PSICO);
    const r = reactivateTemplate(PSICO);
    expect(r.status).toBe("rascunho");
  });
});

// ============ Versões ============

describe("LV-18.2 · Versões imutáveis", () => {
  it("motivo obrigatório para versão manual", () => {
    expect(() => createManualTemplateVersion(PSICO, "  ")).toThrow(ReportTemplateError);
  });

  it("numeração sequencial por modelo", () => {
    const v1 = createManualTemplateVersion(PSICO, "primeira");
    const v2 = createManualTemplateVersion(PSICO, "segunda");
    const v3 = createManualTemplateVersion(TECN, "outra");
    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);
    expect(v3.versionNumber).toBe(1); // sequência independente
  });

  it("snapshot é congelado profundamente", () => {
    const v = createManualTemplateVersion(PSICO, "snap");
    expect(Object.isFrozen(v)).toBe(true);
    expect(Object.isFrozen(v.snapshot)).toBe(true);
    expect(Object.isFrozen(v.snapshot.sections)).toBe(true);
  });

  it("mudanças posteriores não afetam versões antigas", () => {
    returnTemplateToDraft(PSICO);
    const v = createManualTemplateVersion(PSICO, "snap");
    const before = v.snapshot.name;
    addSection(PSICO, { title: "Nova mudança" });
    expect(v.snapshot.name).toBe(before);
    expect(v.snapshot.sections.length).toBe(getTemplate(PSICO)!.sections.length - 1);
  });

  it("duplicação não herda versões", () => {
    createManualTemplateVersion(PSICO, "v");
    const dup = duplicateTemplate(PSICO);
    expect(listTemplateVersions(dup.id)).toHaveLength(0);
  });

  it("assinatura + unsubscribe funcionam", () => {
    let n = 0;
    const un = subscribeTemplateVersions(() => n++);
    createManualTemplateVersion(PSICO, "v1");
    expect(n).toBe(1);
    un();
    createManualTemplateVersion(PSICO, "v2");
    expect(n).toBe(1);
  });

  it("reset limpa versões", () => {
    createManualTemplateVersion(PSICO, "v");
    resetReportTemplateStore();
    expect(listTemplateVersions(PSICO)).toHaveLength(0);
  });
});

// ============ Comparação ============

describe("LV-18.2 · Comparação de versões", () => {
  it("sem alterações → hasChanges=false", () => {
    const t = getTemplate(PSICO)!;
    const d = compareReportTemplates(t, t);
    expect(d.hasChanges).toBe(false);
    expect(d.summary).toBe("Sem alterações.");
  });

  it("detecta seção adicionada", () => {
    returnTemplateToDraft(PSICO);
    const before = getTemplate(PSICO)!;
    addSection(PSICO, { title: "Nova" });
    const after = getTemplate(PSICO)!;
    const d = compareReportTemplates(before, after);
    expect(d.sectionsAdded.length).toBe(1);
    expect(d.hasChanges).toBe(true);
  });

  it("detecta renomeação distinta de reordenação", () => {
    returnTemplateToDraft(PSICO);
    const before = getTemplate(PSICO)!;
    const s0 = before.sections[0]!;
    updateSection(PSICO, s0.id, { title: "Título Novo" });
    const after = getTemplate(PSICO)!;
    const d = compareReportTemplates(before, after);
    expect(d.sectionsRenamed.length).toBe(1);
    expect(d.sectionsReordered.length).toBe(0);
  });

  it("não modifica entradas", () => {
    const before = getTemplate(PSICO)!;
    const after = getTemplate(PSICO)!;
    const b = JSON.stringify(before);
    compareReportTemplates(before, after);
    expect(JSON.stringify(before)).toBe(b);
  });

  it("ordenação determinística", () => {
    returnTemplateToDraft(PSICO);
    const before = getTemplate(PSICO)!;
    addSection(PSICO, { title: "AA" });
    addSection(PSICO, { title: "BB" });
    const after = getTemplate(PSICO)!;
    const d1 = compareReportTemplates(before, after);
    const d2 = compareReportTemplates(before, after);
    expect(d1).toEqual(d2);
  });
});

// ============ Histórico ============

describe("LV-18.2 · Histórico append-only", () => {
  it("criação registra evento", () => {
    const t = createTemplate({ name: "H" });
    const evs = listTemplateHistory(t.id);
    expect(evs.some((e) => e.action === "template_created")).toBe(true);
  });

  it("operação estrutural registra evento", () => {
    returnTemplateToDraft(PSICO);
    const s = addSection(PSICO, { title: "X" });
    const evs = listTemplateHistory(PSICO);
    expect(evs.some((e) => e.action === "section_added")).toBe(true);
    expect(s).toBeDefined();
  });

  it("no-op não gera evento", () => {
    returnTemplateToDraft(PSICO);
    const before = listTemplateHistory(PSICO).length;
    // updateSection com mesmos valores é no-op
    const s0 = getTemplate(PSICO)!.sections[0]!;
    updateSection(PSICO, s0.id, { title: s0.title });
    expect(listTemplateHistory(PSICO).length).toBe(before);
  });

  it("remoção bloqueada de variável registra evento blocked", () => {
    const t = createTemplate({ name: "V" });
    const s = addSection(t.id, { title: "S" });
    addBlock(t.id, s.id, { kind: "paragrafo", content: "olá {{k}}" });
    const v = addVariable(t.id, { key: "k", label: "K" });
    expect(() => removeVariable(t.id, v.id)).toThrow(ReportTemplateError);
    const evs = listTemplateHistory(t.id);
    expect(evs.some((e) => e.action === "template_operation_blocked" && e.result === "blocked")).toBe(true);
  });

  it("metadata é congelada", () => {
    createTemplate({ name: "M" });
    const evs = listTemplateHistory();
    const created = evs.find((e) => e.action === "template_created")!;
    expect(Object.isFrozen(created)).toBe(true);
    expect(Object.isFrozen(created.metadata)).toBe(true);
  });

  it("metadata sanitiza chaves sensíveis", () => {
    // usar appendTemplateHistoryEvent direto para forçar sanitização
    const { appendTemplateHistoryEvent } = require("@/features/report-templates/report-template-history-store");
    const ev = appendTemplateHistoryEvent({
      templateId: PSICO,
      action: "template_metadata_updated",
      description: "x",
      metadata: { password: "secreto", nome: "ok", token: "z" },
    });
    expect(ev.metadata.password).toBeUndefined();
    expect(ev.metadata.token).toBeUndefined();
    expect(ev.metadata.nome).toBe("ok");
  });

  it("assinatura recebe eventos e unsubscribe funciona", () => {
    let n = 0;
    const un = subscribeTemplateHistory(() => n++);
    createTemplate({ name: "sub" });
    expect(n).toBeGreaterThanOrEqual(1);
    un();
    const now = n;
    createTemplate({ name: "sub2" });
    expect(n).toBe(now);
  });

  it("reset limpa histórico", () => {
    createTemplate({ name: "X" });
    resetReportTemplateStore();
    expect(listTemplateHistory()).toHaveLength(0);
  });

  it("publicação registra evento e cria versão", () => {
    returnTemplateToDraft(PSICO);
    publishTemplate(PSICO);
    const evs = listTemplateHistory(PSICO);
    expect(evs.some((e) => e.action === "template_published")).toBe(true);
    expect(evs.some((e) => e.action === "version_created")).toBe(true);
    expect(listTemplateVersions(PSICO).length).toBe(1);
  });
});

// ============ Segurança ============

describe("LV-18.2 · Segurança e escopo", () => {
  it("sem uso de fetch, storage, IA, Supabase, eval", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.resolve("src/features/report-templates");
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".ts")) continue;
      const src = await fs.readFile(path.join(dir, f), "utf8");
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/localStorage|sessionStorage/);
      expect(src).not.toMatch(/from ["']@supabase/);
      expect(src).not.toMatch(/openai|OpenAI/);
      expect(src).not.toMatch(/\beval\s*\(/);
      expect(src).not.toMatch(/new\s+Function\s*\(/);
      expect(src).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });
});

// ============ LV-18.2 · Bloqueio de edição em modelos publicados ============

import {
  addSection as _addSection,
  addBlock as _addBlock,
  addVariable as _addVariable,
  getSnapshot,
  moveBlock,
  moveSection,
  removeBlock,
  removeSection,
  subscribe,
  updateBlock,
  updateTemplateMetadata,
  updateVariable,
} from "@/features/report-templates/report-template-use-cases";
import type {
  ReportTemplateBlockId,
  ReportTemplateVariableId,
} from "@/features/report-templates/report-template-types";

function firstIdsOf(templateId = PSICO) {
  const t = getTemplate(templateId)!;
  const section = t.sections[0]!;
  const block = section.blocks[0]!;
  const variable = t.variables[0]!;
  return {
    sectionId: section.id,
    blockId: block.id,
    variableId: variable.id,
  };
}


// Alternativa: uma única invocação por teste, com contagem exata de histórico=1.
function expectBlockedOnce(
  templateId: ReportTemplateId,
  fn: () => void,
): void {
  const snapshotRef = getSnapshot();
  const version = snapshotRef.version;
  const versionsBefore = listTemplateVersions(templateId).length;
  const historyBefore = listTemplateHistory(templateId).length;
  let emissions = 0;
  const un = subscribe(() => emissions++);
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  un();
  expect(thrown).toBeInstanceOf(ReportTemplateError);
  expect((thrown as ReportTemplateError).code).toBe("template_published");
  expect(getSnapshot()).toBe(snapshotRef);
  expect(getSnapshot().version).toBe(version);
  expect(listTemplateVersions(templateId).length).toBe(versionsBefore);
  expect(emissions).toBe(0);
  const newEvents = listTemplateHistory(templateId).slice(historyBefore);
  expect(newEvents).toHaveLength(1);
  expect(newEvents[0]!.action).toBe("template_operation_blocked");
  expect(newEvents[0]!.result).toBe("blocked");
}

describe("LV-18.2 · Edição bloqueada em modelo publicado", () => {
  it("fixture publicada (Laudo Psicológico) não pode ser editada diretamente", () => {
    expect(getTemplate(PSICO)!.status).toBe("publicado");
    expectBlockedOnce(PSICO, () =>
      updateTemplateMetadata(PSICO, { name: "HACK" }),
    );
    expect(getTemplate(PSICO)!.name).toBe("Laudo Psicológico");
  });

  it("updateTemplateMetadata bloqueada", () => {
    const original = getTemplate(PSICO)!;
    expectBlockedOnce(PSICO, () =>
      updateTemplateMetadata(PSICO, { description: "novo" }),
    );
    expect(getTemplate(PSICO)!.description).toBe(original.description);
  });

  it("addSection bloqueada", () => {
    const before = getTemplate(PSICO)!.sections.length;
    expectBlockedOnce(PSICO, () => _addSection(PSICO, { title: "Nova" }));
    expect(getTemplate(PSICO)!.sections).toHaveLength(before);
  });

  it("updateSection bloqueada", () => {
    const { sectionId } = firstIdsOf();
    const originalTitle = getTemplate(PSICO)!.sections[0]!.title;
    expectBlockedOnce(PSICO, () =>
      updateSection(PSICO, sectionId, { title: "HACK" }),
    );
    expect(getTemplate(PSICO)!.sections[0]!.title).toBe(originalTitle);
  });

  it("removeSection bloqueada", () => {
    const { sectionId } = firstIdsOf();
    const before = getTemplate(PSICO)!.sections.length;
    expectBlockedOnce(PSICO, () => removeSection(PSICO, sectionId));
    expect(getTemplate(PSICO)!.sections).toHaveLength(before);
  });

  it("moveSection bloqueada", () => {
    const sections = getTemplate(PSICO)!.sections;
    const target = sections[sections.length - 1]!.id;
    const orderBefore = sections.map((s) => s.id);
    expectBlockedOnce(PSICO, () => moveSection(PSICO, target, "up"));
    expect(getTemplate(PSICO)!.sections.map((s) => s.id)).toEqual(orderBefore);
  });

  it("addBlock bloqueada", () => {
    const { sectionId } = firstIdsOf();
    const before = getTemplate(PSICO)!.sections[0]!.blocks.length;
    expectBlockedOnce(PSICO, () =>
      _addBlock(PSICO, sectionId, { kind: "paragrafo", content: "x" }),
    );
    expect(getTemplate(PSICO)!.sections[0]!.blocks).toHaveLength(before);
  });

  it("updateBlock bloqueada", () => {
    const { sectionId, blockId } = firstIdsOf();
    const originalContent = getTemplate(PSICO)!.sections[0]!.blocks[0]!.content;
    expectBlockedOnce(PSICO, () =>
      updateBlock(PSICO, sectionId, blockId, { content: "HACK" }),
    );
    expect(getTemplate(PSICO)!.sections[0]!.blocks[0]!.content).toBe(
      originalContent,
    );
  });

  it("removeBlock bloqueada", () => {
    const { sectionId, blockId } = firstIdsOf();
    const before = getTemplate(PSICO)!.sections[0]!.blocks.length;
    expectBlockedOnce(PSICO, () => removeBlock(PSICO, sectionId, blockId));
    expect(getTemplate(PSICO)!.sections[0]!.blocks).toHaveLength(before);
  });

  it("moveBlock bloqueada", () => {
    const { sectionId } = firstIdsOf();
    const blocks = getTemplate(PSICO)!.sections[0]!.blocks;
    if (blocks.length < 2) return; // não aplicável
    const targetBlock = blocks[blocks.length - 1]!.id;
    const orderBefore = blocks.map((b) => b.id);
    expectBlockedOnce(PSICO, () =>
      moveBlock(PSICO, sectionId, targetBlock, "up"),
    );
    expect(
      getTemplate(PSICO)!.sections[0]!.blocks.map((b) => b.id),
    ).toEqual(orderBefore);
  });

  it("addVariable bloqueada", () => {
    const before = getTemplate(PSICO)!.variables.length;
    expectBlockedOnce(PSICO, () =>
      _addVariable(PSICO, { key: "nova_key", label: "N" }),
    );
    expect(getTemplate(PSICO)!.variables).toHaveLength(before);
  });

  it("updateVariable bloqueada", () => {
    const { variableId } = firstIdsOf();
    const originalLabel = getTemplate(PSICO)!.variables[0]!.label;
    expectBlockedOnce(PSICO, () =>
      updateVariable(PSICO, variableId, { label: "HACK" }),
    );
    expect(getTemplate(PSICO)!.variables[0]!.label).toBe(originalLabel);
  });

  it("removeVariable bloqueada", () => {
    const { variableId } = firstIdsOf();
    const before = getTemplate(PSICO)!.variables.length;
    expectBlockedOnce(PSICO, () =>
      removeVariable(PSICO, variableId, { force: true }),
    );
    expect(getTemplate(PSICO)!.variables).toHaveLength(before);
  });

  it("modelo recém-publicado (não-fixture) também bloqueia edição", () => {
    // Cria um modelo válido em rascunho, publica e testa
    const t = createTemplate({ name: "Publicável" });
    _addSection(t.id, { title: "Seção 1" });
    const secId = getTemplate(t.id)!.sections[0]!.id;
    _addBlock(t.id, secId, { kind: "paragrafo", content: "conteúdo" });
    publishTemplate(t.id);
    expect(getTemplate(t.id)!.status).toBe("publicado");
    expectBlockedOnce(t.id, () =>
      updateTemplateMetadata(t.id, { name: "Renomeado" }),
    );
    expect(getTemplate(t.id)!.name).toBe("Publicável");
  });

  it("após returnTemplateToDraft, edição volta a funcionar", () => {
    returnTemplateToDraft(PSICO);
    expect(getTemplate(PSICO)!.status).toBe("rascunho");
    const hist = listTemplateHistory(PSICO);
    expect(
      hist.some((e) => e.action === "template_returned_to_draft"),
    ).toBe(true);
    // agora edição funciona
    updateTemplateMetadata(PSICO, { name: "Laudo Psicológico Editado" });
    expect(getTemplate(PSICO)!.name).toBe("Laudo Psicológico Editado");
  });
});
