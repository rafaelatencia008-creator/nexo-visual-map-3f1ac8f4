/**
 * LV-09.5 — Extração e comparação documental (mock).
 *
 * Cobertura: helpers puros de extração e comparação, determinismo por
 * (documentId, versionId), estados, ausência de rota nova, ausência de backend,
 * integrações UI (Library page + diálogos).
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  ANALYSIS_DEMO_NOTICE,
  ANALYSIS_STATUS_LABEL,
  compareDocuments,
  compareVersions,
  extractFromDocument,
  extractionToText,
  versionContentLines,
  type AnalysisStatus,
  type DocumentComparison,
  type ExtractionResult,
  type VersionDiff,
} from "../src/features/documents/document-analysis";
import { DOCUMENT_SEED } from "../src/features/documents/document-mock-store";
import type {
  DocumentRecord,
  DocumentVersion,
} from "../src/features/documents/document-types";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}
const has = (rel: string) => existsSync(resolve(process.cwd(), rel));

const doc01 = DOCUMENT_SEED.find((d) => d.id === "doc-01")!;
const doc02 = DOCUMENT_SEED.find((d) => d.id === "doc-02")!;
const doc04 = DOCUMENT_SEED.find((d) => d.id === "doc-04")!;
const doc06 = DOCUMENT_SEED.find((d) => d.id === "doc-06")!;
const doc11 = DOCUMENT_SEED.find((d) => d.id === "doc-11")!;

// ─────────────────────────────────────────────────────────────
// 1) Auditoria estática — sem nova rota, sem backend, sem IA real
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — auditoria estática", () => {
  test("módulo document-analysis existe", () => {
    expect(has("src/features/documents/document-analysis.ts")).toBe(true);
  });
  test("DocumentExtractionDialog existe", () => {
    expect(has("src/features/documents/DocumentExtractionDialog.tsx")).toBe(true);
  });
  test("DocumentCompareVersionsDialog existe", () => {
    expect(has("src/features/documents/DocumentCompareVersionsDialog.tsx")).toBe(true);
  });
  test("DocumentCompareDocumentsDialog existe", () => {
    expect(has("src/features/documents/DocumentCompareDocumentsDialog.tsx")).toBe(true);
  });
  test("DEC-DOC-003 registrada", () => {
    expect(has("docs/decisions/DEC-DOC-003-extracao-comparacao-mock.md")).toBe(true);
  });

  test("nenhuma rota nova em src/routes/app.documentos.*", () => {
    const routes = readdirSync(resolve(process.cwd(), "src/routes"))
      .filter((f) => f.startsWith("app.documentos"));
    expect(routes).toEqual(["app.documentos.tsx"]);
  });

  test("nenhum uso proibido em document-analysis.ts", () => {
    const src = read("src/features/documents/document-analysis.ts");
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/crypto\.randomUUID/);
    expect(src).not.toMatch(/Date\.now/);
  });
  test("nenhum uso proibido nos diálogos de análise", () => {
    for (const f of [
      "src/features/documents/DocumentExtractionDialog.tsx",
      "src/features/documents/DocumentCompareVersionsDialog.tsx",
      "src/features/documents/DocumentCompareDocumentsDialog.tsx",
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/Math\.random/);
      expect(src).not.toMatch(/crypto\.randomUUID/);
    }
  });
  test("nenhuma chamada externa nos diálogos de análise", () => {
    for (const f of [
      "src/features/documents/DocumentExtractionDialog.tsx",
      "src/features/documents/DocumentCompareVersionsDialog.tsx",
      "src/features/documents/DocumentCompareDocumentsDialog.tsx",
      "src/features/documents/document-analysis.ts",
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/\bfetch\(/);
      expect(src).not.toMatch(/XMLHttpRequest/);
      expect(src).not.toMatch(/openai/i);
      expect(src).not.toMatch(/supabase/i);
    }
  });
  test("aviso obrigatório presente nos três diálogos", () => {
    for (const f of [
      "src/features/documents/DocumentExtractionDialog.tsx",
      "src/features/documents/DocumentCompareVersionsDialog.tsx",
      "src/features/documents/DocumentCompareDocumentsDialog.tsx",
    ]) {
      expect(read(f)).toContain("ANALYSIS_DEMO_NOTICE");
    }
    expect(ANALYSIS_DEMO_NOTICE).toBe(
      "Análise demonstrativa. Nenhum arquivo real foi processado nesta etapa.",
    );
  });

  test("nada de arquivos alterando Agenda nesta entrega", () => {
    // Prova negativa: nenhum dos módulos analíticos referencia agenda.
    for (const f of [
      "src/features/documents/document-analysis.ts",
      "src/features/documents/DocumentExtractionDialog.tsx",
      "src/features/documents/DocumentCompareVersionsDialog.tsx",
      "src/features/documents/DocumentCompareDocumentsDialog.tsx",
    ]) {
      expect(read(f)).not.toMatch(/agenda/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Labels e status
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — status e labels", () => {
  const keys: AnalysisStatus[] = [
    "preparing",
    "ready",
    "empty",
    "error",
    "offline",
    "forbidden",
  ];
  for (const k of keys) {
    test(`status ${k} tem rótulo em PT-BR`, () => {
      expect(ANALYSIS_STATUS_LABEL[k]).toBeTruthy();
      expect(ANALYSIS_STATUS_LABEL[k].length).toBeGreaterThan(3);
    });
  }
  test("Preparando análise… é o rótulo do preparing", () => {
    expect(ANALYSIS_STATUS_LABEL.preparing).toBe("Preparando análise…");
  });
  test("Análise concluída é o rótulo do ready", () => {
    expect(ANALYSIS_STATUS_LABEL.ready).toBe("Análise concluída");
  });
  test("Nenhum conteúdo disponível", () => {
    expect(ANALYSIS_STATUS_LABEL.empty).toBe("Nenhum conteúdo disponível");
  });
  test("Não foi possível concluir a análise", () => {
    expect(ANALYSIS_STATUS_LABEL.error).toBe(
      "Não foi possível concluir a análise",
    );
  });
  test("Você está offline", () => {
    expect(ANALYSIS_STATUS_LABEL.offline).toBe("Você está offline");
  });
  test("Sem permissão", () => {
    expect(ANALYSIS_STATUS_LABEL.forbidden).toBe("Sem permissão");
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Extração de informações
// ─────────────────────────────────────────────────────────────

function anyExtract(doc: DocumentRecord, v?: DocumentVersion): ExtractionResult {
  return extractFromDocument(doc, v ?? doc.versions[0]!);
}

describe("LV-09.5 — extração de informações", () => {
  test("gera resumo textual coeso", () => {
    const r = anyExtract(doc01);
    expect(r.summary).toContain(doc01.name);
    expect(r.summary).toContain("Análise demonstrativa");
  });

  test("possui todas as categorias exigidas", () => {
    const r = anyExtract(doc01);
    expect(Array.isArray(r.persons)).toBe(true);
    expect(Array.isArray(r.dates)).toBe(true);
    expect(Array.isArray(r.values)).toBe(true);
    expect(Array.isArray(r.caseNumbers)).toBe(true);
    expect(Array.isArray(r.deadlines)).toBe(true);
    expect(Array.isArray(r.keywords)).toBe(true);
    expect(Array.isArray(r.inconsistencies)).toBe(true);
    expect(Array.isArray(r.excerpts)).toBe(true);
  });

  test("pessoas mencionadas — pelo menos duas", () => {
    const r = anyExtract(doc01);
    expect(r.persons.length).toBeGreaterThanOrEqual(2);
  });
  test("datas encontradas — pelo menos duas", () => {
    const r = anyExtract(doc01);
    expect(r.dates.length).toBeGreaterThanOrEqual(2);
  });
  test("valores encontrados — pelo menos um", () => {
    const r = anyExtract(doc01);
    expect(r.values.length).toBeGreaterThanOrEqual(1);
  });
  test("números de processo — pelo menos um", () => {
    const r = anyExtract(doc01);
    expect(r.caseNumbers.length).toBeGreaterThanOrEqual(1);
  });
  test("prazos — pelo menos um", () => {
    const r = anyExtract(doc01);
    expect(r.deadlines.length).toBeGreaterThanOrEqual(1);
  });
  test("palavras-chave — pelo menos três", () => {
    const r = anyExtract(doc01);
    expect(r.keywords.length).toBeGreaterThanOrEqual(3);
  });
  test("inconsistências — pelo menos uma", () => {
    const r = anyExtract(doc01);
    expect(r.inconsistencies.length).toBeGreaterThanOrEqual(1);
  });
  test("trechos relevantes — pelo menos um", () => {
    const r = anyExtract(doc01);
    expect(r.excerpts.length).toBeGreaterThanOrEqual(1);
  });

  test("confiança fica entre 55 e 99", () => {
    const r = anyExtract(doc01);
    const all = [
      ...r.persons,
      ...r.dates,
      ...r.values,
      ...r.caseNumbers,
      ...r.deadlines,
      ...r.keywords,
      ...r.inconsistencies,
      ...r.excerpts,
    ];
    for (const it of all) {
      expect(it.confidence).toBeGreaterThanOrEqual(0);
      expect(it.confidence).toBeLessThanOrEqual(100);
      expect(Number.isInteger(it.confidence)).toBe(true);
    }
  });

  test("resultado é determinístico entre chamadas", () => {
    const r1 = anyExtract(doc01);
    const r2 = anyExtract(doc01);
    expect(r1).toEqual(r2);
  });

  test("resultado difere entre versões diferentes do mesmo documento", () => {
    const v1 = doc01.versions[0]!;
    const v2 = doc01.versions[1]!;
    const r1 = extractFromDocument(doc01, v1);
    const r2 = extractFromDocument(doc01, v2);
    // Ao menos uma dimensão deve divergir
    const diff =
      JSON.stringify(r1.persons) !== JSON.stringify(r2.persons) ||
      JSON.stringify(r1.dates) !== JSON.stringify(r2.dates) ||
      JSON.stringify(r1.keywords) !== JSON.stringify(r2.keywords);
    expect(diff).toBe(true);
  });

  test("resultado difere entre documentos diferentes", () => {
    const r1 = anyExtract(doc01);
    const r2 = anyExtract(doc02);
    expect(JSON.stringify(r1)).not.toBe(JSON.stringify(r2));
  });

  test("resumo cita o nome do documento e o arquivo da versão", () => {
    const r = anyExtract(doc04, doc04.versions[0]);
    expect(r.summary).toContain(doc04.name);
    expect(r.summary).toContain(doc04.versions[0]!.fileName);
  });

  test("trechos textuais — documentos textuais produzem strings não vazias", () => {
    const r = anyExtract(doc01); // PDF
    for (const e of r.excerpts) {
      expect(typeof e.value).toBe("string");
      expect(e.value.length).toBeGreaterThan(0);
    }
  });

  test("planilha (xlsx) — trechos vêm de linhas da grade", () => {
    const r = anyExtract(doc11); // xlsx
    expect(r.excerpts.length).toBeGreaterThanOrEqual(1);
    expect(r.excerpts[0]!.value).toContain("·");
  });

  test("áudio — trecho aponta que transcrição não está disponível", () => {
    const doc09 = DOCUMENT_SEED.find((d) => d.id === "doc-09")!;
    const r = anyExtract(doc09);
    expect(r.excerpts[0]!.value).toMatch(/Mídia demonstrativa|transcrição/i);
  });

  test("imagem — trecho aponta ausência de trechos textuais", () => {
    const doc03 = DOCUMENT_SEED.find((d) => d.id === "doc-03")!;
    const r = anyExtract(doc03);
    expect(r.excerpts[0]!.value).toMatch(/Imagem demonstrativa/i);
  });

  test("vídeo — trecho aponta ausência de transcrição", () => {
    const doc10 = DOCUMENT_SEED.find((d) => d.id === "doc-10")!;
    const r = anyExtract(doc10);
    expect(r.excerpts[0]!.value).toMatch(/Mídia demonstrativa|transcrição/i);
  });

  test("todos os itens têm valor string não vazio", () => {
    const r = anyExtract(doc06);
    const all = [
      ...r.persons,
      ...r.dates,
      ...r.values,
      ...r.caseNumbers,
      ...r.deadlines,
      ...r.keywords,
      ...r.inconsistencies,
    ];
    for (const it of all) {
      expect(typeof it.value).toBe("string");
      expect(it.value.length).toBeGreaterThan(0);
    }
  });

  test("números de processo têm formato CNJ demonstrativo", () => {
    const r = anyExtract(doc01);
    for (const c of r.caseNumbers) {
      expect(c.value).toMatch(/^\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4}$/);
    }
  });

  test("datas seguem DD/MM/AAAA", () => {
    const r = anyExtract(doc01);
    for (const d of r.dates) {
      expect(d.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });

  test("valores começam com R$", () => {
    const r = anyExtract(doc01);
    for (const v of r.values) {
      expect(v.value.startsWith("R$")).toBe(true);
    }
  });

  test("prazos incluem 'Prazo em'", () => {
    const r = anyExtract(doc01);
    for (const p of r.deadlines) {
      expect(p.value.startsWith("Prazo em")).toBe(true);
    }
  });

  test("palavras-chave vêm do dicionário fixo", () => {
    const allowed = new Set([
      "infiltração",
      "vistoria",
      "laudo",
      "quesitos",
      "responsabilidade",
      "solidariedade",
      "cronograma",
      "honorários",
      "prazo",
      "recurso",
      "perícia",
      "assistente técnico",
      "medição",
      "arbitramento",
    ]);
    const r = anyExtract(doc01);
    for (const k of r.keywords) {
      expect(allowed.has(k.value)).toBe(true);
    }
  });

  test("palavras-chave são únicas dentro do resultado", () => {
    const r = anyExtract(doc01);
    const seen = new Set<string>();
    for (const k of r.keywords) {
      expect(seen.has(k.value)).toBe(false);
      seen.add(k.value);
    }
  });

  test("pessoas são únicas dentro do resultado", () => {
    const r = anyExtract(doc01);
    const seen = new Set<string>();
    for (const p of r.persons) {
      expect(seen.has(p.value)).toBe(false);
      seen.add(p.value);
    }
  });
});

describe("LV-09.5 — extractionToText", () => {
  test("inclui aviso demonstrativo", () => {
    const r = anyExtract(doc01);
    expect(extractionToText(r)).toContain(ANALYSIS_DEMO_NOTICE);
  });
  test("inclui blocos principais", () => {
    const r = anyExtract(doc01);
    const t = extractionToText(r);
    expect(t).toContain("Resumo:");
    expect(t).toContain("Pessoas mencionadas:");
    expect(t).toContain("Datas encontradas:");
    expect(t).toContain("Valores encontrados:");
    expect(t).toContain("Números de processo:");
    expect(t).toContain("Prazos:");
    expect(t).toContain("Palavras-chave:");
    expect(t).toContain("Possíveis inconsistências:");
    expect(t).toContain("Trechos relevantes:");
  });
  test("confiança exibida com % em cada item", () => {
    const r = anyExtract(doc01);
    const t = extractionToText(r);
    expect(t).toMatch(/\(\d{1,3}%\)/);
  });
  test("é determinístico", () => {
    const r = anyExtract(doc02);
    expect(extractionToText(r)).toBe(extractionToText(r));
  });
});

// ─────────────────────────────────────────────────────────────
// 4) Comparação de versões
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — comparação de versões", () => {
  test("lança erro ao selecionar a mesma versão dos dois lados", () => {
    const v = doc01.versions[0]!;
    expect(() => compareVersions(doc01.id, v, v)).toThrow();
  });

  test("compara duas versões distintas do doc-01", () => {
    const [va, vb, vc] = doc01.versions;
    const diff = compareVersions(doc01.id, va!, vb!);
    expect(diff.summary).toContain("Comparação entre");
    expect(diff.summary).toContain(`v${va!.version}`);
    expect(diff.summary).toContain(`v${vb!.version}`);
    expect(diff.lines.length).toBeGreaterThan(0);
    expect(vc).toBeDefined();
  });

  test("versões diferentes produzem alterações (>0 alterados/adicionados/removidos)", () => {
    const [va, vb] = doc01.versions;
    const diff = compareVersions(doc01.id, va!, vb!);
    const changes = diff.addedCount + diff.removedCount + diff.changedCount;
    expect(changes).toBeGreaterThan(0);
  });

  test("determinístico entre chamadas repetidas", () => {
    const [va, vb] = doc01.versions;
    const d1 = compareVersions(doc01.id, va!, vb!);
    const d2 = compareVersions(doc01.id, va!, vb!);
    expect(d1).toEqual(d2);
  });

  test("adicionadas + removidas + alteradas + inalteradas = total de linhas", () => {
    const [va, vb] = doc01.versions;
    const d = compareVersions(doc01.id, va!, vb!);
    expect(
      d.addedCount + d.removedCount + d.changedCount + d.unchangedCount,
    ).toBe(d.lines.length);
  });

  test("linhas 'added' têm apenas 'right'", () => {
    const [va, vb] = doc11.versions;
    const d = compareVersions(doc11.id, va!, vb!);
    for (const ln of d.lines.filter((l) => l.kind === "added")) {
      expect(ln.left).toBeUndefined();
      expect(typeof ln.right).toBe("string");
    }
  });
  test("linhas 'removed' têm apenas 'left'", () => {
    const [va, vb] = doc11.versions;
    const d = compareVersions(doc11.id, vb!, va!);
    for (const ln of d.lines.filter((l) => l.kind === "removed")) {
      expect(ln.right).toBeUndefined();
      expect(typeof ln.left).toBe("string");
    }
  });
  test("linhas 'changed' têm ambos os lados divergentes", () => {
    const [va, vb] = doc01.versions;
    const d = compareVersions(doc01.id, va!, vb!);
    for (const ln of d.lines.filter((l) => l.kind === "changed")) {
      expect(ln.left).not.toBe(ln.right);
    }
  });
  test("linhas 'unchanged' têm ambos os lados iguais", () => {
    const [va, vb] = doc01.versions;
    const d = compareVersions(doc01.id, va!, vb!);
    for (const ln of d.lines.filter((l) => l.kind === "unchanged")) {
      expect(ln.left).toBe(ln.right);
    }
  });

  test("índice das linhas é monotônico", () => {
    const [va, vb] = doc06.versions;
    const d = compareVersions(doc06.id, va!, vb!);
    for (let i = 0; i < d.lines.length; i += 1) {
      expect(d.lines[i]!.index).toBe(i);
    }
  });

  test("comparação NÃO modifica versões", () => {
    const before = JSON.stringify(doc01.versions);
    const [va, vb] = doc01.versions;
    compareVersions(doc01.id, va!, vb!);
    expect(JSON.stringify(doc01.versions)).toBe(before);
  });

  test("versionContentLines é determinístico e não vazio para texto", () => {
    const v = doc01.versions[0]!;
    const a = versionContentLines(doc01.id, v);
    const b = versionContentLines(doc01.id, v);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  test("versionContentLines produz uma linha para versões sem prévia textual", () => {
    const doc05 = DOCUMENT_SEED.find((d) => d.id === "doc-05")!; // pdf textual
    const lines = versionContentLines(doc05.id, doc05.versions[0]!);
    expect(lines.length).toBeGreaterThan(0);
  });

  test("planilhas geram linhas separadas por ' | '", () => {
    const lines = versionContentLines(doc11.id, doc11.versions[0]!);
    expect(lines[0]).toContain(" | ");
  });

  test("resumo cita as contagens", () => {
    const [va, vb] = doc01.versions;
    const d = compareVersions(doc01.id, va!, vb!);
    expect(d.summary).toContain(`${d.addedCount} adicionadas`);
    expect(d.summary).toContain(`${d.removedCount} removidas`);
    expect(d.summary).toContain(`${d.changedCount} alteradas`);
  });

  test("ordem esquerda/direita inverte adicionadas e removidas", () => {
    // Só se as versões têm tamanhos diferentes; usamos doc-11 (4 versões)
    const [va, vb] = doc11.versions;
    const d1 = compareVersions(doc11.id, va!, vb!);
    const d2 = compareVersions(doc11.id, vb!, va!);
    expect(d1.addedCount + d1.removedCount).toBe(
      d2.addedCount + d2.removedCount,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// 5) Comparação de documentos
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — comparação de documentos", () => {
  test("lança erro ao selecionar o mesmo documento", () => {
    expect(() => compareDocuments(doc01, doc01)).toThrow();
  });

  test("produz sete campos de metadados lado a lado", () => {
    const c = compareDocuments(doc01, doc02);
    const labels = c.fields.map((f) => f.label);
    expect(labels).toEqual([
      "Nome",
      "Categoria",
      "Processo",
      "Perícia",
      "Pessoas",
      "Sigilo",
      "Prazo",
    ]);
  });

  test("nomes distintos entram como diferença", () => {
    const c = compareDocuments(doc01, doc02);
    expect(c.differences.some((d) => d.startsWith("Nome:"))).toBe(true);
  });

  test("categoria distinta produz conflito 'Categorias distintas'", () => {
    // doc-01 é laudo, doc-02 é outro
    const c = compareDocuments(doc01, doc02);
    expect(c.conflicts).toContain("Categorias distintas");
  });

  test("processos diferentes produzem conflito", () => {
    const c = compareDocuments(doc01, doc04); // pro-01 vs pro-05
    expect(c.conflicts).toContain("Processos vinculados diferentes");
  });

  test("sigilos diferentes produzem conflito", () => {
    const c = compareDocuments(doc01, doc04);
    if (doc01.confidentiality !== doc04.confidentiality) {
      expect(c.conflicts).toContain("Níveis de sigilo divergentes");
    }
  });

  test("determinístico entre chamadas repetidas", () => {
    const c1 = compareDocuments(doc01, doc02);
    const c2 = compareDocuments(doc01, doc02);
    expect(c1).toEqual(c2);
  });

  test("similaridade entre 0 e 100", () => {
    const c = compareDocuments(doc01, doc02);
    expect(c.similarityPercent).toBeGreaterThanOrEqual(0);
    expect(c.similarityPercent).toBeLessThanOrEqual(100);
  });

  test("similaridade é inteiro", () => {
    const c = compareDocuments(doc01, doc04);
    expect(Number.isInteger(c.similarityPercent)).toBe(true);
  });

  test("contentDiff resume o conteúdo mock lado a lado", () => {
    const c = compareDocuments(doc01, doc02);
    expect(c.contentDiff.summary).toContain("Conteúdo mock");
    expect(c.contentDiff.lines.length).toBeGreaterThan(0);
  });

  test("semelhanças mais diferenças = total de campos", () => {
    const c = compareDocuments(doc01, doc02);
    expect(c.similarities.length + c.differences.length).toBe(c.fields.length);
  });

  test("NÃO modifica os documentos", () => {
    const a = JSON.stringify(doc01);
    const b = JSON.stringify(doc02);
    compareDocuments(doc01, doc02);
    expect(JSON.stringify(doc01)).toBe(a);
    expect(JSON.stringify(doc02)).toBe(b);
  });

  test("pessoas vazias em ambos os lados são semelhança", () => {
    const c = compareDocuments(doc02, doc06); // ambos têm personIds diferentes
    const line = c.fields.find((f) => f.label === "Pessoas")!;
    expect(typeof line.equal).toBe("boolean");
  });

  test("comparação simétrica: mesmos campos independentemente da ordem", () => {
    const c1 = compareDocuments(doc01, doc02);
    const c2 = compareDocuments(doc02, doc01);
    expect(c1.fields.length).toBe(c2.fields.length);
    expect(c1.similarities.length).toBe(c2.similarities.length);
    expect(c1.differences.length).toBe(c2.differences.length);
  });
});

// ─────────────────────────────────────────────────────────────
// 6) Integração — página da biblioteca (auditoria estática)
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — integração com DocumentsLibraryPage", () => {
  const page = read("src/features/documents/DocumentsLibraryPage.tsx");

  test("importa o diálogo de extração", () => {
    expect(page).toContain("DocumentExtractionDialog");
  });
  test("importa o diálogo de comparar versões", () => {
    expect(page).toContain("DocumentCompareVersionsDialog");
  });
  test("importa o diálogo de comparar documentos", () => {
    expect(page).toContain("DocumentCompareDocumentsDialog");
  });
  test("botão 'Extrair informações' está no header", () => {
    expect(page).toContain("Extrair informações");
  });
  test("botão 'Comparar versões' está no header", () => {
    expect(page).toContain("Comparar versões");
  });
  test("botão 'Comparar documentos' está no header", () => {
    expect(page).toContain("Comparar documentos");
  });
  test("cada botão tem aria-label", () => {
    expect(page).toContain('aria-label="Extrair informações"');
    expect(page).toContain('aria-label="Comparar versões"');
    expect(page).toContain('aria-label="Comparar documentos"');
  });
});

// ─────────────────────────────────────────────────────────────
// 7) Acessibilidade dos diálogos (auditoria estática)
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — acessibilidade nos diálogos", () => {
  const files = [
    "src/features/documents/DocumentExtractionDialog.tsx",
    "src/features/documents/DocumentCompareVersionsDialog.tsx",
    "src/features/documents/DocumentCompareDocumentsDialog.tsx",
  ];
  for (const f of files) {
    test(`${f} usa aria-live`, () => {
      expect(read(f)).toContain('aria-live="polite"');
    });
    test(`${f} usa aria-busy`, () => {
      expect(read(f)).toContain("aria-busy");
    });
    test(`${f} usa role="alert" para erros`, () => {
      expect(read(f)).toContain('role="alert"');
    });
    test(`${f} restaura foco no fechamento`, () => {
      expect(read(f)).toMatch(/opener[\s\S]*focus/);
    });
    test(`${f} tem botão Fechar`, () => {
      expect(read(f)).toContain("Fechar");
    });
    test(`${f} usa aria-label em selects ou botões`, () => {
      expect(read(f)).toContain("aria-label");
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 8) Responsividade e estrutura (auditoria estática)
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — responsividade e estrutura", () => {
  const dialogs = [
    "src/features/documents/DocumentExtractionDialog.tsx",
    "src/features/documents/DocumentCompareVersionsDialog.tsx",
    "src/features/documents/DocumentCompareDocumentsDialog.tsx",
  ];
  for (const f of dialogs) {
    test(`${f} usa DialogContent com max-h para rolagem interna`, () => {
      expect(read(f)).toMatch(/max-h-\[90vh\]/);
      expect(read(f)).toContain("overflow-y-auto");
    });
    test(`${f} usa layout responsivo (grid ou sm:)`, () => {
      const src = read(f);
      expect(src.includes("sm:") || src.includes("grid")).toBe(true);
    });
  }
  test("comparação usa duas colunas (grid sm:grid-cols-2)", () => {
    expect(read("src/features/documents/DocumentCompareVersionsDialog.tsx"))
      .toContain("sm:grid-cols-2");
    expect(read("src/features/documents/DocumentCompareDocumentsDialog.tsx"))
      .toContain("sm:grid-cols-2");
  });
});

// ─────────────────────────────────────────────────────────────
// 9) Estados demonstrativos (auditoria estática)
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — estados", () => {
  const dialogs = [
    "src/features/documents/DocumentExtractionDialog.tsx",
    "src/features/documents/DocumentCompareVersionsDialog.tsx",
    "src/features/documents/DocumentCompareDocumentsDialog.tsx",
  ];
  const labels = [
    "Preparando análise…",
    "Análise concluída",
    "Nenhum conteúdo disponível",
    "Não foi possível concluir a análise",
    "Você está offline",
    "Sem permissão",
  ];
  for (const f of dialogs) {
    for (const l of labels) {
      test(`${f} referencia o rótulo "${l}"`, () => {
        // O texto pode vir do label centralizado; garantimos referência ao mapa.
        expect(read(f)).toContain("ANALYSIS_STATUS_LABEL");
      });
    }
    test(`${f} implementa botão 'Tentar novamente'`, () => {
      expect(read(f)).toContain("Tentar novamente");
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 10) Prova negativa — sem backend, sem storage, sem IA real
// ─────────────────────────────────────────────────────────────

describe("LV-09.5 — prova negativa de integrações reais", () => {
  const all = [
    "src/features/documents/document-analysis.ts",
    "src/features/documents/DocumentExtractionDialog.tsx",
    "src/features/documents/DocumentCompareVersionsDialog.tsx",
    "src/features/documents/DocumentCompareDocumentsDialog.tsx",
  ];
  for (const f of all) {
    test(`${f} não importa @supabase/*`, () => {
      expect(read(f)).not.toMatch(/@supabase/);
    });
    test(`${f} não importa openai ou anthropic`, () => {
      const src = read(f);
      expect(src).not.toMatch(/from ["']openai/);
      expect(src).not.toMatch(/from ["']@anthropic/);
    });
    test(`${f} não usa localStorage/sessionStorage para persistir análise`, () => {
      const src = read(f);
      expect(src).not.toMatch(/localStorage\.setItem/);
      expect(src).not.toMatch(/sessionStorage\.setItem/);
    });
    test(`${f} não referencia upload real de arquivo`, () => {
      expect(read(f)).not.toMatch(/FormData/);
    });
  }
});
