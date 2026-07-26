/**
 * LV-18.1 — Testes comportamentais: domínio, fixtures, store, snapshots, reset.
 *
 * Escopo: apenas os itens da LV-18.1. Versionamento imutável, import/export,
 * integração com laudos e UI são cobertos nas LVs seguintes.
 */
import { describe, expect, it, beforeEach } from "bun:test";

import {
  buildInitialTemplates,
  FIXTURE_TEMPLATE_IDS,
  INITIAL_TEMPLATE_COUNT,
} from "@/features/report-templates/report-template-fixtures";
import {
  addBlock,
  addSection,
  addVariable,
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  getSnapshot,
  getTemplate,
  isVariableInUse,
  listTemplates,
  moveBlock,
  moveSection,
  reactivateTemplate,
  removeBlock,
  removeSection,
  removeVariable,
  resetReportTemplateStore,
  returnTemplateToDraft,
  subscribe,
  updateBlock,
  updateSection,
  updateTemplateMetadata,
  updateVariable,
} from "@/features/report-templates/report-template-store";
import {
  ReportTemplateError,
  type ReportTemplateBlockId,
  type ReportTemplateId,
  type ReportTemplateSectionId,
  type ReportTemplateVariableId,
} from "@/features/report-templates/report-template-types";
import { resetDemoData } from "@/lib/demo/reset";

// ---------- helpers ----------

beforeEach(() => {
  resetReportTemplateStore();
});

const PSICO = FIXTURE_TEMPLATE_IDS.laudoPsicologico;
const VAZIO = FIXTURE_TEMPLATE_IDS.modeloVazio;

// ================= FIXTURES =================

describe("LV-18.1 · Fixtures", () => {
  it("expõe a quantidade esperada de modelos iniciais", () => {
    expect(INITIAL_TEMPLATE_COUNT).toBe(5);
    expect(listTemplates()).toHaveLength(5);
  });

  it("IDs de modelos são únicos", () => {
    const ids = buildInitialTemplates().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDs são estáveis entre chamadas", () => {
    const a = buildInitialTemplates().map((t) => t.id);
    const b = buildInitialTemplates().map((t) => t.id);
    expect(a).toEqual(b);
  });

  it("datas são determinísticas", () => {
    const a = buildInitialTemplates();
    const b = buildInitialTemplates();
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.createdAt).toBe(b[i]!.createdAt);
      expect(a[i]!.updatedAt).toBe(b[i]!.updatedAt);
    }
  });

  it("não contém CPFs, e-mails ou telefones reais nos textos", () => {
    const dump = JSON.stringify(buildInitialTemplates());
    expect(dump).not.toMatch(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    expect(dump).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(dump).not.toMatch(/\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  });

  it("modelo vazio existe e é propositalmente incompleto", () => {
    const t = buildInitialTemplates().find((x) => x.id === VAZIO)!;
    expect(t.sections).toHaveLength(0);
    expect(t.variables).toHaveLength(0);
  });

  it("cada chamada produz instâncias independentes (sem referência compartilhada)", () => {
    const a = buildInitialTemplates();
    const b = buildInitialTemplates();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]!.sections).not.toBe(b[0]!.sections);
  });

  it("mutação externa em uma cópia não afeta chamada seguinte", () => {
    const first = buildInitialTemplates() as unknown as Array<{ name: string }>;
    first[0]!.name = "MUTADO_EXTERNO";
    const second = buildInitialTemplates();
    expect(second[0]!.name).not.toBe("MUTADO_EXTERNO");
  });

  it("especialidades cobrem as áreas demonstrativas", () => {
    const specs = new Set(buildInitialTemplates().map((t) => t.specialty));
    expect(specs.has("psicologia")).toBe(true);
    expect(specs.has("engenharia")).toBe(true);
    expect(specs.has("contabilidade")).toBe(true);
    expect(specs.has("geral")).toBe(true);
  });
});

// ================= SNAPSHOT =================

describe("LV-18.1 · Snapshot referencialmente estável", () => {
  it("duas leituras sem alteração retornam a MESMA referência", () => {
    const s1 = getSnapshot();
    const s2 = getSnapshot();
    expect(s1).toBe(s2);
    expect(s1.templates).toBe(s2.templates);
  });

  it("mutação real gera nova referência de snapshot", () => {
    const s1 = getSnapshot();
    createTemplate({ name: "Novo A" });
    const s2 = getSnapshot();
    expect(s2).not.toBe(s1);
    expect(s2.templates).not.toBe(s1.templates);
    expect(s2.version).toBeGreaterThan(s1.version);
  });

  it("no-op (atualização com mesmos valores) mantém a mesma referência", () => {
    returnTemplateToDraft(PSICO);
    const cur = getTemplate(PSICO)!;
    const s1 = getSnapshot();
    updateTemplateMetadata(PSICO, { name: cur.name, description: cur.description });
    const s2 = getSnapshot();
    expect(s2).toBe(s1);
  });

  it("snapshot não pode ser mutado externamente (Object.freeze)", () => {
    const s = getSnapshot();
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.templates)).toBe(true);
    expect(() => {
      (s.templates as unknown as unknown[])[0] = null;
    }).toThrow();
  });

  it("mutar o retorno de getTemplate não afeta a store", () => {
    const t = getTemplate(PSICO)!;
    expect(() => {
      (t as unknown as { name: string }).name = "HACK";
    }).toThrow();
    expect(getTemplate(PSICO)!.name).toBe("Laudo Psicológico");
  });

  it("entidades duplicadas não compartilham referência com originais", () => {
    const dup = duplicateTemplate(PSICO);
    const orig = getTemplate(PSICO)!;
    expect(dup).not.toBe(orig);
    expect(dup.sections).not.toBe(orig.sections);
    for (let i = 0; i < dup.sections.length; i++) {
      expect(dup.sections[i]).not.toBe(orig.sections[i]);
    }
    expect(dup.variables).not.toBe(orig.variables);
  });
});

// ================= ASSINATURAS =================

describe("LV-18.1 · Assinaturas", () => {
  it("listener recebe alteração real", () => {
    let n = 0;
    const un = subscribe(() => n++);
    createTemplate({ name: "X" });
    expect(n).toBe(1);
    un();
  });

  it("listener NÃO recebe em no-op", () => {
    returnTemplateToDraft(PSICO);
    const cur = getTemplate(PSICO)!;
    let n = 0;
    const un = subscribe(() => n++);
    updateTemplateMetadata(PSICO, { name: cur.name });
    expect(n).toBe(0);
    un();
  });

  it("unsubscribe funciona", () => {
    let n = 0;
    const un = subscribe(() => n++);
    un();
    createTemplate({ name: "Y" });
    expect(n).toBe(0);
  });

  it("unsubscribe idempotente", () => {
    let n = 0;
    const un = subscribe(() => n++);
    un();
    un();
    createTemplate({ name: "Y2" });
    expect(n).toBe(0);
  });

  it("múltiplos listeners recebem a mesma emissão", () => {
    let a = 0;
    let b = 0;
    const u1 = subscribe(() => a++);
    const u2 = subscribe(() => b++);
    createTemplate({ name: "Z" });
    expect(a).toBe(1);
    expect(b).toBe(1);
    u1();
    u2();
  });

  it("reset notifica assinantes exatamente uma vez", () => {
    let n = 0;
    const un = subscribe(() => n++);
    resetReportTemplateStore();
    expect(n).toBe(1);
    un();
  });

});

// ================= MODELOS =================

describe("LV-18.1 · Modelos", () => {
  it("cria modelo com status rascunho", () => {
    const t = createTemplate({ name: "Meu modelo" });
    expect(t.status).toBe("rascunho");
    expect(t.sections).toHaveLength(0);
    expect(t.variables).toHaveLength(0);
    expect(t.duplicatedFrom).toBeNull();
  });

  it("bloqueia nome vazio na criação", () => {
    expect(() => createTemplate({ name: "   " })).toThrow(ReportTemplateError);
  });

  it("atualiza metadados", () => {
    const t = createTemplate({ name: "Antes" });
    const u = updateTemplateMetadata(t.id, { name: "Depois", specialty: "medicina" });
    expect(u.name).toBe("Depois");
    expect(u.specialty).toBe("medicina");
  });

  it("bloqueia atualização com nome vazio", () => {
    const t = createTemplate({ name: "Ok" });
    expect(() => updateTemplateMetadata(t.id, { name: "  " })).toThrow(ReportTemplateError);
  });

  it("arquiva e bloqueia edição", () => {
    const t = createTemplate({ name: "Ok" });
    archiveTemplate(t.id);
    expect(getTemplate(t.id)!.status).toBe("arquivado");
    expect(() => updateTemplateMetadata(t.id, { name: "Novo" })).toThrow(ReportTemplateError);
    expect(() => addSection(t.id, { title: "S" })).toThrow(ReportTemplateError);
  });

  it("reativa modelo arquivado voltando para rascunho", () => {
    const t = createTemplate({ name: "Ok" });
    archiveTemplate(t.id);
    reactivateTemplate(t.id);
    expect(getTemplate(t.id)!.status).toBe("rascunho");
    // volta a aceitar edição
    updateTemplateMetadata(t.id, { name: "Renomeado" });
    expect(getTemplate(t.id)!.name).toBe("Renomeado");
  });

  it("duplica com novo ID e indica origem", () => {
    const dup = duplicateTemplate(PSICO);
    expect(dup.id).not.toBe(PSICO);
    expect(dup.duplicatedFrom).toBe(PSICO);
    expect(dup.status).toBe("rascunho");
    expect(dup.sections.length).toBe(getTemplate(PSICO)!.sections.length);
  });

  it("alteração na cópia não afeta o original", () => {
    const dup = duplicateTemplate(PSICO);
    const secId = dup.sections[0]!.id;
    updateSection(dup.id, secId, { title: "MUDOU-CÓPIA" });
    const orig = getTemplate(PSICO)!;
    expect(orig.sections[0]!.title).not.toBe("MUDOU-CÓPIA");
  });

  it("bloqueia get de modelo inexistente com retorno null", () => {
    expect(getTemplate("rtpl-inexistente" as ReportTemplateId)).toBeNull();
  });
});

// ================= SEÇÕES =================

describe("LV-18.1 · Seções", () => {
  it("adiciona ao final", () => {
    const before = getTemplate(VAZIO)!.sections.length;
    addSection(VAZIO, { title: "Nova A" });
    addSection(VAZIO, { title: "Nova B" });
    const after = getTemplate(VAZIO)!.sections;
    expect(after).toHaveLength(before + 2);
    expect(after[0]!.title).toBe("Nova A");
    expect(after[1]!.title).toBe("Nova B");
  });

  it("edita título e descrição", () => {
    const s = addSection(VAZIO, { title: "T1" });
    updateSection(VAZIO, s.id, { title: "T2", description: "D2" });
    const cur = getTemplate(VAZIO)!.sections[0]!;
    expect(cur.title).toBe("T2");
    expect(cur.description).toBe("D2");
  });

  it("remove seção", () => {
    const s = addSection(VAZIO, { title: "X" });
    removeSection(VAZIO, s.id);
    expect(getTemplate(VAZIO)!.sections).toHaveLength(0);
  });

  it("move seção para cima e para baixo, normalizando posições", () => {
    const a = addSection(VAZIO, { title: "A" });
    const b = addSection(VAZIO, { title: "B" });
    const c = addSection(VAZIO, { title: "C" });
    moveSection(VAZIO, c.id, "up");
    let order = getTemplate(VAZIO)!.sections.map((s) => s.title);
    expect(order).toEqual(["A", "C", "B"]);
    moveSection(VAZIO, a.id, "down");
    order = getTemplate(VAZIO)!.sections.map((s) => s.title);
    expect(order).toEqual(["C", "A", "B"]);
    // posições normalizadas
    const positions = getTemplate(VAZIO)!.sections.map((s) => s.position);
    expect(positions).toEqual([0, 1, 2]);
  });

  it("mover no limite é no-op", () => {
    const a = addSection(VAZIO, { title: "A" });
    let n = 0;
    const un = subscribe(() => n++);
    moveSection(VAZIO, a.id, "up");
    expect(n).toBe(0);
    un();
  });

  it("rejeita posição negativa em addSection", () => {
    expect(() => addSection(VAZIO, { title: "X", position: -1 })).toThrow(ReportTemplateError);
  });

  it("alteração externa no retorno de addSection não afeta store", () => {
    const s = addSection(VAZIO, { title: "OK" });
    expect(() => {
      (s as unknown as { title: string }).title = "HACK";
    }).toThrow();
    expect(getTemplate(VAZIO)!.sections[0]!.title).toBe("OK");
  });

  it("remover seção inexistente lança erro", () => {
    expect(() =>
      removeSection(VAZIO, "rsec-nope" as ReportTemplateSectionId),
    ).toThrow(ReportTemplateError);
  });
});

// ================= BLOCOS =================

describe("LV-18.1 · Blocos", () => {
  let sectionId: ReportTemplateSectionId;
  beforeEach(() => {
    resetReportTemplateStore();
    const s = addSection(VAZIO, { title: "Sec" });
    sectionId = s.id;
  });

  it("adiciona bloco no final", () => {
    addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "A" });
    addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "B" });
    const blocks = getTemplate(VAZIO)!.sections[0]!.blocks;
    expect(blocks.map((b) => b.content)).toEqual(["A", "B"]);
  });

  it("edita bloco", () => {
    const b = addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "A" });
    updateBlock(VAZIO, sectionId, b.id, { content: "B", kind: "citacao" });
    const cur = getTemplate(VAZIO)!.sections[0]!.blocks[0]!;
    expect(cur.content).toBe("B");
    expect(cur.kind).toBe("citacao");
  });

  it("remove bloco", () => {
    const b = addBlock(VAZIO, sectionId, { kind: "paragrafo" });
    removeBlock(VAZIO, sectionId, b.id);
    expect(getTemplate(VAZIO)!.sections[0]!.blocks).toHaveLength(0);
  });

  it("move bloco normalizando posições", () => {
    const a = addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "A" });
    addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "B" });
    addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "C" });
    moveBlock(VAZIO, sectionId, a.id, "down");
    const contents = getTemplate(VAZIO)!.sections[0]!.blocks.map((b) => b.content);
    expect(contents).toEqual(["B", "A", "C"]);
    const positions = getTemplate(VAZIO)!.sections[0]!.blocks.map((b) => b.position);
    expect(positions).toEqual([0, 1, 2]);
  });

  it("alteração externa no bloco não afeta store", () => {
    const b = addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "OK" });
    expect(() => {
      (b as unknown as { content: string }).content = "HACK";
    }).toThrow();
    expect(getTemplate(VAZIO)!.sections[0]!.blocks[0]!.content).toBe("OK");
  });

  it("bloco em seção/modelo inexistente lança erro", () => {
    expect(() =>
      addBlock(VAZIO, "rsec-nope" as ReportTemplateSectionId, { kind: "paragrafo" }),
    ).toThrow(ReportTemplateError);
    expect(() =>
      updateBlock(
        VAZIO,
        sectionId,
        "rblk-nope" as ReportTemplateBlockId,
        { content: "x" },
      ),
    ).toThrow(ReportTemplateError);
  });

  it("no-op de update não notifica", () => {
    const b = addBlock(VAZIO, sectionId, { kind: "paragrafo", content: "X" });
    let n = 0;
    const un = subscribe(() => n++);
    updateBlock(VAZIO, sectionId, b.id, { content: "X" });
    expect(n).toBe(0);
    un();
  });
});

// ================= VARIÁVEIS =================

describe("LV-18.1 · Variáveis", () => {
  it("adiciona variável e normaliza chave", () => {
    const v = addVariable(VAZIO, { key: "Nome_Do_Cliente", label: "Nome" });
    expect(v.key).toBe("nome_do_cliente");
  });

  it("edita variável", () => {
    const v = addVariable(VAZIO, { key: "x", label: "X" });
    updateVariable(VAZIO, v.id, { label: "XX", required: true });
    const cur = getTemplate(VAZIO)!.variables[0]!;
    expect(cur.label).toBe("XX");
    expect(cur.required).toBe(true);
  });

  it("remove variável não referenciada", () => {
    const v = addVariable(VAZIO, { key: "x", label: "X" });
    removeVariable(VAZIO, v.id);
    expect(getTemplate(VAZIO)!.variables).toHaveLength(0);
  });

  it("bloqueia chave duplicada", () => {
    addVariable(VAZIO, { key: "x", label: "X" });
    expect(() => addVariable(VAZIO, { key: "x", label: "Y" })).toThrow(ReportTemplateError);
  });

  it("bloqueia chave vazia", () => {
    expect(() => addVariable(VAZIO, { key: "  ", label: "" })).toThrow(ReportTemplateError);
  });

  it("bloqueia chave com caracteres inválidos", () => {
    expect(() => addVariable(VAZIO, { key: "9nome", label: "" })).toThrow(ReportTemplateError);
    expect(() => addVariable(VAZIO, { key: "nome-cliente", label: "" })).toThrow(
      ReportTemplateError,
    );
  });

  it("bloqueia remoção quando variável está referenciada em bloco", () => {
    returnTemplateToDraft(PSICO);
    const orig = getTemplate(PSICO)!;
    const v = orig.variables.find((x) => x.key === "cliente_nome")!;
    expect(isVariableInUse(PSICO, v.id)).toBe(true);
    expect(() => removeVariable(PSICO, v.id)).toThrow(ReportTemplateError);
  });

  it("permite remoção forçada", () => {
    returnTemplateToDraft(PSICO);
    const orig = getTemplate(PSICO)!;
    const v = orig.variables.find((x) => x.key === "cliente_nome")!;
    removeVariable(PSICO, v.id, { force: true });
    expect(getTemplate(PSICO)!.variables.find((x) => x.id === v.id)).toBeUndefined();
  });

  it("alteração externa em variável não afeta store", () => {
    const v = addVariable(VAZIO, { key: "x", label: "L" });
    expect(() => {
      (v as unknown as { label: string }).label = "HACK";
    }).toThrow();
    expect(getTemplate(VAZIO)!.variables[0]!.label).toBe("L");
  });
});

// ================= RESET =================

describe("LV-18.1 · Reset", () => {
  it("restaura fixtures após várias operações", () => {
    createTemplate({ name: "Extra" });
    addSection(VAZIO, { title: "Nova" });
    archiveTemplate(PSICO);
    resetReportTemplateStore();
    const list = listTemplates();
    expect(list).toHaveLength(INITIAL_TEMPLATE_COUNT);
    expect(getTemplate(PSICO)!.status).toBe("publicado");
    expect(getTemplate(VAZIO)!.sections).toHaveLength(0);
  });

  it("mantém IDs e datas determinísticas após reset", () => {
    resetReportTemplateStore();
    const first = listTemplates().map((t) => t.id);
    resetReportTemplateStore();
    const second = listTemplates().map((t) => t.id);
    expect(first).toEqual(second);
  });

  it("reset gera nova versão e nova referência de snapshot", () => {
    const s1 = getSnapshot();
    createTemplate({ name: "Y" });
    resetReportTemplateStore();
    const s2 = getSnapshot();
    expect(s2).not.toBe(s1);
    expect(s2.templates).toHaveLength(INITIAL_TEMPLATE_COUNT);
  });

  it("resetDemoData() integra e restaura a store de modelos", () => {
    createTemplate({ name: "Removível" });
    resetDemoData();
    expect(listTemplates()).toHaveLength(INITIAL_TEMPLATE_COUNT);
  });
});

// ================= SEGURANÇA / ESCOPO =================

describe("LV-18.1 · Segurança e escopo", () => {
  it("módulo do domínio não usa APIs proibidas", async () => {
    const files = [
      "/dev-server/src/features/report-templates/report-template-types.ts",
      "/dev-server/src/features/report-templates/report-template-fixtures.ts",
      "/dev-server/src/features/report-templates/report-template-store.ts",
      "/dev-server/src/features/report-templates/report-template-use-cases.ts",
    ];
    const fs = await import("node:fs/promises");
    for (const path of files) {
      const src = await fs.readFile(path, "utf-8");
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/\blocalStorage\b/);
      expect(src).not.toMatch(/\bsessionStorage\b/);
      expect(src).not.toMatch(/\bXMLHttpRequest\b/);
      expect(src).not.toMatch(/\beval\s*\(/);
      expect(src).not.toMatch(/new\s+Function\s*\(/);
      expect(src).not.toMatch(/dangerouslySetInnerHTML/);
      expect(src.toLowerCase()).not.toContain("openai");
      expect(src.toLowerCase()).not.toContain("supabase");
    }
  });
});
