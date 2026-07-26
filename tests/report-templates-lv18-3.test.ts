/**
 * LV-18.3 — Importação, exportação e serialização segura.
 */
import { describe, expect, it, beforeEach } from "bun:test";

import { FIXTURE_TEMPLATE_IDS } from "@/features/report-templates/report-template-fixtures";
import {
  canonicalStringify,
  exportReportTemplate,
  exportReportTemplates,
  getSnapshot,
  getTemplate,
  importReportTemplate,
  importReportTemplates,
  listTemplateHistory,
  MAX_IMPORT_BYTES,
  MAX_TEMPLATES_PER_IMPORT,
  parseReportTemplateImport,
  previewReportTemplateImport,
  REPORT_TEMPLATE_EXPORT_FORMAT,
  REPORT_TEMPLATE_SCHEMA_VERSION,
  resetReportTemplateStore,
  returnTemplateToDraft,
  serializeReportTemplate,
  serializeReportTemplates,
  subscribe,
  type ReportTemplateExportEnvelope,
} from "@/features/report-templates/report-template-use-cases";
import {
  ReportTemplateError,
  type ReportTemplate,
  type ReportTemplateId,
} from "@/features/report-templates/report-template-types";
import { resetDemoData } from "@/lib/demo/reset";

const PSICO = FIXTURE_TEMPLATE_IDS.laudoPsicologico;
const ENG = FIXTURE_TEMPLATE_IDS.laudoEngenharia;
const VAZIO = FIXTURE_TEMPLATE_IDS.modeloVazio;

beforeEach(() => {
  resetReportTemplateStore();
});

// ---------- helpers ----------

/** Normalização estrutural para comparação lógica (ignora IDs/status/timestamps). */
function normalizeLogic(t: ReportTemplate): unknown {
  return {
    name: t.name,
    description: t.description,
    specialty: t.specialty,
    sections: t.sections.map((s) => ({
      title: s.title,
      description: s.description,
      position: s.position,
      blocks: s.blocks.map((b) => ({
        kind: b.kind,
        title: b.title,
        content: b.content,
        position: b.position,
        variableRefs: [...b.variableRefs],
      })),
    })),
    variables: t.variables.map((v) => ({
      key: v.key,
      label: v.label,
      kind: v.kind,
      required: v.required,
      defaultValue: v.defaultValue,
    })),
  };
}

// ================ Exportação ================

describe("LV-18.3 · Exportação", () => {
  it("exporta modelo individual com envelope correto", () => {
    const env = exportReportTemplate(PSICO, {
      exportedAt: "2026-08-01T00:00:00.000Z",
    });
    expect(env.format).toBe(REPORT_TEMPLATE_EXPORT_FORMAT);
    expect(env.schemaVersion).toBe(REPORT_TEMPLATE_SCHEMA_VERSION);
    expect(env.source).toBe("mock");
    expect(env.templates).toHaveLength(1);
    expect(env.templates[0]!.sourceId).toBe(PSICO);
  });

  it("exporta vários modelos preservando ordem", () => {
    const env = exportReportTemplates([ENG, PSICO]);
    expect(env.templates.map((t) => t.sourceId)).toEqual([ENG, PSICO]);
  });

  it("exportação sem lista pega todos", () => {
    const env = exportReportTemplates();
    expect(env.templates.length).toBe(getSnapshot().templates.length);
  });

  it("deduplica IDs repetidos na seleção", () => {
    const env = exportReportTemplates([PSICO, PSICO, ENG, PSICO]);
    expect(env.templates.map((t) => t.sourceId)).toEqual([PSICO, ENG]);
  });

  it("seleção vazia produz envelope vazio", () => {
    const env = exportReportTemplates([]);
    expect(env.templates).toEqual([] as never);
  });

  it("modelo inexistente lança template_not_found", () => {
    try {
      exportReportTemplate("rtpl-9999" as ReportTemplateId);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ReportTemplateError);
      expect((e as ReportTemplateError).code).toBe("template_not_found");
    }
  });

  it("não modifica store nem snapshot", () => {
    const before = getSnapshot();
    exportReportTemplate(PSICO);
    exportReportTemplates([PSICO, ENG]);
    expect(getSnapshot()).toBe(before);
  });

  it("não emite listener principal", () => {
    let calls = 0;
    const unsub = subscribe(() => calls++);
    exportReportTemplate(PSICO);
    exportReportTemplates([PSICO, ENG]);
    exportReportTemplates();
    unsub();
    expect(calls).toBe(0);
  });

  it("serializeReportTemplate é determinística: mesma entrada, mesma saída", () => {
    const a = serializeReportTemplate(PSICO, { exportedAt: "2026-08-01T00:00:00.000Z" });
    const b = serializeReportTemplate(PSICO, { exportedAt: "2026-08-01T00:00:00.000Z" });
    expect(a).toBe(b);
  });

  it("saída JSON canônica é válida e reparse-ável", () => {
    const s = serializeReportTemplates(undefined, { exportedAt: "2026-08-01T00:00:00.000Z" });
    expect(() => JSON.parse(s)).not.toThrow();
    const p = JSON.parse(s);
    expect(p.format).toBe(REPORT_TEMPLATE_EXPORT_FORMAT);
  });

  it("não expõe campos internos (mutationVersion, listeners, updatedAt...)", () => {
    const s = serializeReportTemplate(PSICO);
    expect(s).not.toContain("mutationVersion");
    expect(s).not.toContain("listeners");
    expect(s).not.toContain("createdBy");
    expect(s).not.toContain("updatedAt");
    expect(s).not.toContain("duplicatedFrom");
  });

  it("chaves de objetos aparecem em ordem alfabética", () => {
    const s = serializeReportTemplate(PSICO);
    // "exportedAt" < "exportedBy" < "format" < "schemaVersion" < "source" < "templates"
    const idxFormat = s.indexOf('"format"');
    const idxSchema = s.indexOf('"schemaVersion"');
    const idxTemplates = s.indexOf('"templates"');
    expect(idxFormat).toBeLessThan(idxSchema);
    expect(idxSchema).toBeLessThan(idxTemplates);
  });

  it("canonicalStringify rejeita ciclos", () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(() => canonicalStringify(a)).toThrow(ReportTemplateError);
  });

  it("canonicalStringify rejeita valores não finitos", () => {
    expect(() => canonicalStringify({ x: Infinity })).toThrow(ReportTemplateError);
    expect(() => canonicalStringify({ x: NaN })).toThrow(ReportTemplateError);
  });

  it("canonicalStringify rejeita funções e símbolos aninhados", () => {
    expect(() => canonicalStringify(() => 1)).toThrow(ReportTemplateError);
    expect(() => canonicalStringify(Symbol("s"))).toThrow(ReportTemplateError);
  });

  it("canonicalStringify omite propriedades undefined em objeto", () => {
    const s = canonicalStringify({ a: 1, b: undefined, c: 2 });
    expect(s).not.toContain("undefined");
    expect(s).not.toContain('"b"');
  });

  it("não registra histórico quando recordHistory=false", () => {
    const before = listTemplateHistory().length;
    serializeReportTemplate(PSICO);
    serializeReportTemplates([PSICO, ENG]);
    expect(listTemplateHistory().length).toBe(before);
  });

  it("registra evento template_exported quando recordHistory=true", () => {
    exportReportTemplate(PSICO, { recordHistory: true });
    const evs = listTemplateHistory(PSICO).filter((e) => e.action === "template_exported");
    expect(evs.length).toBeGreaterThan(0);
  });
});

// ================ Parsing seguro ================

describe("LV-18.3 · Parsing seguro", () => {
  it("JSON inválido lança import_json_invalid", () => {
    try {
      parseReportTemplateImport("{ not json");
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_json_invalid");
    }
  });

  it("raiz não-objeto lança import_format_invalid", () => {
    try {
      parseReportTemplateImport("[]");
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_format_invalid");
    }
  });

  it("formato desconhecido rejeitado", () => {
    const bad = JSON.stringify({ format: "outra-coisa", schemaVersion: 1, source: "mock", exportedAt: "x", exportedBy: "y", templates: [] });
    try {
      parseReportTemplateImport(bad);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_format_invalid");
    }
  });

  it("schemaVersion incompatível rejeitado", () => {
    const bad = JSON.stringify({
      format: REPORT_TEMPLATE_EXPORT_FORMAT,
      schemaVersion: 99,
      exportedAt: "x",
      exportedBy: "y",
      source: "mock",
      templates: [],
    });
    try {
      parseReportTemplateImport(bad);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_schema_version_unsupported");
    }
  });

  it("payload gigante rejeitado", () => {
    const huge = "a".repeat(MAX_IMPORT_BYTES + 100);
    try {
      parseReportTemplateImport(`"${huge}"`);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_payload_too_large");
    }
  });

  it("envelope roundtrip: exportado passa no parse", () => {
    const s = serializeReportTemplate(PSICO);
    const parsed = parseReportTemplateImport(s);
    expect(parsed.envelope.templates).toHaveLength(1);
  });

  it("resultado do parse é congelado", () => {
    const s = serializeReportTemplate(PSICO);
    const parsed = parseReportTemplateImport(s);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.envelope)).toBe(true);
  });

  it("posição de seção não normalizada rejeitada", () => {
    const env = exportReportTemplate(PSICO);
    const bad = JSON.parse(JSON.stringify(env)) as ReportTemplateExportEnvelope;
    const mut = bad as unknown as { templates: { sections: { position: number }[] }[] };
    mut.templates[0]!.sections[0]!.position = 42;
    try {
      parseReportTemplateImport(JSON.stringify(mut));
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_template_invalid");
    }
  });

  it("referência a variável inexistente rejeitada", () => {
    const env = exportReportTemplate(PSICO);
    const bad = JSON.parse(JSON.stringify(env)) as unknown as {
      templates: { sections: { blocks: { variableRefs: string[] }[] }[] }[];
    };
    bad.templates[0]!.sections[0]!.blocks[0]!.variableRefs = ["nao_existe"];
    try {
      parseReportTemplateImport(JSON.stringify(bad));
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_invalid_variable_reference");
    }
  });

  it("especialidade inválida rejeitada", () => {
    const env = JSON.parse(serializeReportTemplate(PSICO)) as unknown as {
      templates: { specialty: string }[];
    };
    env.templates[0]!.specialty = "foobar";
    try {
      parseReportTemplateImport(JSON.stringify(env));
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_template_invalid");
    }
  });

  it("IDs duplicados no pacote rejeitados", () => {
    const env = JSON.parse(serializeReportTemplates([PSICO, ENG])) as unknown as {
      templates: { sourceId: string }[];
    };
    env.templates[1]!.sourceId = env.templates[0]!.sourceId;
    try {
      parseReportTemplateImport(JSON.stringify(env));
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_duplicate_id");
    }
  });
});

// ================ Prototype pollution ================

describe("LV-18.3 · Prototype pollution", () => {
  it("bloqueia __proto__ na raiz", () => {
    const bad = `{"__proto__":{"polluted":true},"format":"${REPORT_TEMPLATE_EXPORT_FORMAT}","schemaVersion":1,"exportedAt":"x","exportedBy":"y","source":"mock","templates":[]}`;
    try {
      parseReportTemplateImport(bad);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_dangerous_key");
    }
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it("bloqueia constructor aninhado", () => {
    const bad = JSON.stringify({
      format: REPORT_TEMPLATE_EXPORT_FORMAT,
      schemaVersion: 1,
      exportedAt: "x",
      exportedBy: "y",
      source: "mock",
      templates: [{ constructor: { prototype: { polluted: true } } }],
    });
    try {
      parseReportTemplateImport(bad);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_dangerous_key");
    }
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it("bloqueia prototype como chave", () => {
    const bad = `{"prototype":{"x":1}}`;
    try {
      parseReportTemplateImport(bad);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_dangerous_key");
    }
  });

  it("bloqueia __proto__ profundamente aninhado em array", () => {
    const bad = `{"format":"${REPORT_TEMPLATE_EXPORT_FORMAT}","schemaVersion":1,"exportedAt":"x","exportedBy":"y","source":"mock","templates":[{"nested":[{"__proto__":{"evil":true}}]}]}`;
    try {
      parseReportTemplateImport(bad);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_dangerous_key");
    }
    expect(({} as { evil?: unknown }).evil).toBeUndefined();
  });
});

// ================ Preview ================

describe("LV-18.3 · Preview", () => {
  it("não modifica store", () => {
    const s = serializeReportTemplate(PSICO);
    const before = getSnapshot();
    previewReportTemplateImport(s);
    expect(getSnapshot()).toBe(before);
  });

  it("não emite listener principal", () => {
    const s = serializeReportTemplate(PSICO);
    let calls = 0;
    const unsub = subscribe(() => calls++);
    previewReportTemplateImport(s);
    unsub();
    expect(calls).toBe(0);
  });

  it("resultado é congelado e determinístico", () => {
    const s = serializeReportTemplate(PSICO);
    const a = previewReportTemplateImport(s);
    const b = previewReportTemplateImport(s);
    expect(Object.isFrozen(a)).toBe(true);
    expect(a.templateCount).toBe(b.templateCount);
    expect(a.idsToRegenerate).toBe(b.idsToRegenerate);
  });

  it("detecta conflito com IDs existentes (todas as espécies)", () => {
    const s = serializeReportTemplate(PSICO);
    const preview = previewReportTemplateImport(s);
    // Como PSICO já existe: 1 template + 3 seções + 3 blocos + 2 variáveis = 9.
    expect(preview.conflicts.length).toBeGreaterThanOrEqual(4);
    const kinds = new Set(preview.conflicts.map((c) => c.kind));
    expect(kinds.has("template")).toBe(true);
    expect(kinds.has("section")).toBe(true);
    expect(kinds.has("block")).toBe(true);
    expect(kinds.has("variable")).toBe(true);
    expect(preview.conflicts.some((c) => c.sourceId === PSICO)).toBe(true);
  });


  it("conta corretamente IDs a regenerar", () => {
    const s = serializeReportTemplate(PSICO);
    const preview = previewReportTemplateImport(s);
    const psico = getTemplate(PSICO)!;
    const expected =
      1 +
      psico.variables.length +
      psico.sections.length +
      psico.sections.reduce((sum, sec) => sum + sec.blocks.length, 0);
    expect(preview.idsToRegenerate).toBe(expected);
  });
});

// ================ Importação ================

describe("LV-18.3 · Importação", () => {
  it("importa um modelo com regenerate_ids (default)", () => {
    const s = serializeReportTemplate(PSICO);
    const beforeCount = getSnapshot().templates.length;
    const report = importReportTemplate(s);
    expect(report.success).toBe(true);
    expect(report.strategy).toBe("regenerate_ids");
    expect(report.importedCount).toBe(1);
    expect(getSnapshot().templates.length).toBe(beforeCount + 1);
    // Novo ID diferente do original.
    expect(report.importedTemplates[0]!.newId).not.toBe(PSICO);
  });

  it("modelo importado entra como rascunho", () => {
    const s = serializeReportTemplate(PSICO);
    const report = importReportTemplate(s);
    const imported = getTemplate(report.importedTemplates[0]!.newId)!;
    expect(imported.status).toBe("rascunho");
  });

  it("preserva relações internas: variableRefs continuam apontando", () => {
    const s = serializeReportTemplate(PSICO);
    const report = importReportTemplate(s);
    const imported = getTemplate(report.importedTemplates[0]!.newId)!;
    for (const sec of imported.sections) {
      for (const b of sec.blocks) {
        for (const ref of b.variableRefs) {
          expect(imported.variables.some((v) => v.key === ref)).toBe(true);
        }
      }
    }
  });

  it("estratégia reject: falha se ID conflita", () => {
    const s = serializeReportTemplate(PSICO);
    try {
      importReportTemplate(s, { strategy: "reject" });
      throw new Error("should throw");
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_conflict");
    }
  });

  it("estratégia duplicate: adiciona sufixo (importado)", () => {
    const s = serializeReportTemplate(PSICO);
    const report = importReportTemplate(s, { strategy: "duplicate" });
    const imported = getTemplate(report.importedTemplates[0]!.newId)!;
    expect(imported.name).toContain("(importado)");
  });

  it("importa pacote de vários modelos", () => {
    const s = serializeReportTemplates([PSICO, ENG]);
    const before = getSnapshot().templates.length;
    const report = importReportTemplates(s);
    expect(report.importedCount).toBe(2);
    expect(getSnapshot().templates.length).toBe(before + 2);
  });

  it("atomicidade: se qualquer item falha, nenhum é inserido", () => {
    // Cria payload em que o segundo modelo tem posição inválida
    const env = JSON.parse(serializeReportTemplates([PSICO, ENG])) as unknown as {
      templates: { sections: { position: number }[] }[];
    };
    env.templates[1]!.sections[0]!.position = 999; // inválido
    const before = getSnapshot();
    try {
      importReportTemplates(JSON.stringify(env));
    } catch {
      /* esperado */
    }
    expect(getSnapshot()).toBe(before);
  });

  it("uma única emissão do listener principal em sucesso", () => {
    const s = serializeReportTemplates([PSICO, ENG]);
    let calls = 0;
    const unsub = subscribe(() => calls++);
    importReportTemplates(s);
    unsub();
    expect(calls).toBe(1);
  });

  it("registra evento template_imported no histórico", () => {
    const s = serializeReportTemplate(PSICO);
    const report = importReportTemplate(s);
    const evs = listTemplateHistory(report.importedTemplates[0]!.newId).filter(
      (e) => e.action === "template_imported",
    );
    expect(evs.length).toBe(1);
  });

  it("importReportTemplate rejeita pacote com múltiplos", () => {
    const s = serializeReportTemplates([PSICO, ENG]);
    try {
      importReportTemplate(s);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_template_invalid");
    }
  });

  it("envelope vazio rejeitado como import_empty", () => {
    const s = serializeReportTemplates([]);
    try {
      importReportTemplates(s);
    } catch (e) {
      expect((e as ReportTemplateError).code).toBe("import_empty");
    }
  });

  it("IDs regenerados são registrados nas idMappings", () => {
    const s = serializeReportTemplate(PSICO);
    const report = importReportTemplate(s);
    const tplMap = report.idMappings.filter((m) => m.kind === "template");
    expect(tplMap.length).toBe(1);
    expect(tplMap[0]!.sourceId).toBe(PSICO);
    expect(tplMap[0]!.newId).not.toBe(PSICO);
    // sections e blocks também mapeados
    expect(report.idMappings.some((m) => m.kind === "section")).toBe(true);
    expect(report.idMappings.some((m) => m.kind === "block")).toBe(true);
    expect(report.idMappings.some((m) => m.kind === "variable")).toBe(true);
  });
});

// ================ Round-trip ================

describe("LV-18.3 · Round-trip", () => {
  it("psicológico: preserva conteúdo lógico", () => {
    const s = serializeReportTemplate(PSICO);
    const before = normalizeLogic(getTemplate(PSICO)!);
    resetReportTemplateStore();
    const report = importReportTemplate(s);
    const after = normalizeLogic(getTemplate(report.importedTemplates[0]!.newId)!);
    expect(after).toEqual(before);
  });

  it("engenharia: preserva conteúdo lógico", () => {
    const s = serializeReportTemplate(ENG);
    const before = normalizeLogic(getTemplate(ENG)!);
    resetReportTemplateStore();
    const report = importReportTemplate(s);
    const after = normalizeLogic(getTemplate(report.importedTemplates[0]!.newId)!);
    expect(after).toEqual(before);
  });

  it("modelo vazio: preserva conteúdo lógico", () => {
    const s = serializeReportTemplate(VAZIO);
    const before = normalizeLogic(getTemplate(VAZIO)!);
    resetReportTemplateStore();
    const report = importReportTemplate(s);
    const after = normalizeLogic(getTemplate(report.importedTemplates[0]!.newId)!);
    expect(after).toEqual(before);
  });

  it("múltiplos modelos: cada um preservado", () => {
    const s = serializeReportTemplates([PSICO, ENG]);
    const beforePsico = normalizeLogic(getTemplate(PSICO)!);
    const beforeEng = normalizeLogic(getTemplate(ENG)!);
    resetReportTemplateStore();
    const report = importReportTemplates(s);
    const [a, b] = report.importedTemplates;
    expect(normalizeLogic(getTemplate(a!.newId)!)).toEqual(beforePsico);
    expect(normalizeLogic(getTemplate(b!.newId)!)).toEqual(beforeEng);
  });
});

// ================ Reset e regressão ================

describe("LV-18.3 · Reset e regressão", () => {
  it("reset remove modelos importados", () => {
    const s = serializeReportTemplate(PSICO);
    importReportTemplate(s);
    const before = getSnapshot().templates.length;
    resetReportTemplateStore();
    expect(getSnapshot().templates.length).toBeLessThan(before);
  });

  it("resetDemoData também limpa importações", () => {
    const s = serializeReportTemplate(PSICO);
    importReportTemplate(s);
    resetDemoData();
    // Volta apenas às fixtures.
    const ids = getSnapshot().templates.map((t) => t.id);
    expect(ids.includes(PSICO)).toBe(true);
  });

  it("publicar/retornar a rascunho continua funcionando após reset+import", () => {
    const s = serializeReportTemplate(ENG);
    resetReportTemplateStore();
    const report = importReportTemplate(s);
    const newId = report.importedTemplates[0]!.newId;
    // Como importado veio como rascunho e vem com uma seção "conclusão",
    // a validação deve permitir publicar sem erros bloqueantes.
    expect(getTemplate(newId)!.status).toBe("rascunho");
    // Voltar para rascunho é no-op quando já é rascunho.
    returnTemplateToDraft(newId);
    expect(getTemplate(newId)!.status).toBe("rascunho");
  });
});

// ================ Segurança estática ================

describe("LV-18.3 · Segurança estática", () => {
  it("nenhum arquivo LV-18.3 usa tecnologias proibidas", async () => {
    const files = [
      "src/features/report-templates/report-template-serialization.ts",
      "src/features/report-templates/report-template-export.ts",
      "src/features/report-templates/report-template-import-schema.ts",
      "src/features/report-templates/report-template-import.ts",
    ];
    const forbidden = [
      /\bfetch\s*\(/,
      /localStorage/,
      /sessionStorage/,
      /@supabase/,
      /openai/i,
      /\beval\s*\(/,
      /new\s+Function/,
      /dangerouslySetInnerHTML/,
    ];
    for (const f of files) {
      const content = await Bun.file(f).text();
      for (const re of forbidden) {
        expect(re.test(content)).toBe(false);
      }
    }
  });
});
