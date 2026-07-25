/**
 * LV-09.5 — Extração e comparação documental (mock).
 *
 * Helpers puros e determinísticos. Nada é buscado, transmitido ou processado.
 * Todos os resultados são reconstruídos a partir de (documentId, versionId).
 * Proibido: Math.random, crypto.randomUUID, Date.now.
 */

import {
  buildSheetPreview,
  buildTextPage,
  classifyPreview,
  getPreviewPageCount,
  hashString,
  previewSeed,
  seededRandom,
} from "./document-preview";
import type { DocumentRecord, DocumentVersion } from "./document-types";

/** Aviso obrigatório em toda análise demonstrativa. */
export const ANALYSIS_DEMO_NOTICE =
  "Análise demonstrativa. Nenhum arquivo real foi processado nesta etapa.";

export type AnalysisStatus =
  | "preparing"
  | "ready"
  | "empty"
  | "error"
  | "offline"
  | "forbidden";

export const ANALYSIS_STATUS_LABEL: Record<AnalysisStatus, string> = {
  preparing: "Preparando análise…",
  ready: "Análise concluída",
  empty: "Nenhum conteúdo disponível",
  error: "Não foi possível concluir a análise",
  offline: "Você está offline",
  forbidden: "Sem permissão",
};

// ─────────────────────────────────────────────────────────────
// Extração de informações
// ─────────────────────────────────────────────────────────────

export interface AnalysisItem {
  readonly value: string;
  /** Confiança demonstrativa entre 0 e 100. */
  readonly confidence: number;
}

export interface ExtractionResult {
  readonly summary: string;
  readonly persons: readonly AnalysisItem[];
  readonly dates: readonly AnalysisItem[];
  readonly values: readonly AnalysisItem[];
  readonly caseNumbers: readonly AnalysisItem[];
  readonly deadlines: readonly AnalysisItem[];
  readonly keywords: readonly AnalysisItem[];
  readonly inconsistencies: readonly AnalysisItem[];
  readonly excerpts: readonly AnalysisItem[];
}

const SAMPLE_PERSONS: readonly string[] = [
  "Maria Silva",
  "João Pereira",
  "Ana Beatriz Salgado",
  "Ricardo Monteiro",
  "Helena Vasconcelos",
  "Marina Toledo",
  "Carlos Andrade",
  "Beatriz Nunes",
  "Fernando Aguiar",
  "Paula Ribeiro",
];

const SAMPLE_KEYWORDS: readonly string[] = [
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
];

const SAMPLE_INCONSISTENCIES: readonly string[] = [
  "Data de assinatura anterior à data de emissão",
  "Divergência entre valor por extenso e numérico",
  "Ausência de número de processo em página 2",
  "Nome da parte grafado de duas formas diferentes",
  "Prazo mencionado no texto não coincide com o cadastrado",
  "Numeração de páginas descontínua",
];

function pickN<T>(arr: readonly T[], n: number, r: () => number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  const count = Math.max(0, Math.min(n, pool.length));
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function conf(r: () => number): number {
  return 55 + Math.floor(r() * 45); // 55..99
}

function fakeDate(r: () => number): string {
  const d = 1 + Math.floor(r() * 27);
  const m = 1 + Math.floor(r() * 12);
  const y = 2024 + Math.floor(r() * 3);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function fakeValue(r: () => number): string {
  const intPart = 100 + Math.floor(r() * 199_900);
  const decPart = String(Math.floor(r() * 100)).padStart(2, "0");
  return `R$ ${intPart.toLocaleString("pt-BR")},${decPart}`;
}

function fakeCaseNumber(r: () => number): string {
  const seq = String(Math.floor(r() * 10_000_000)).padStart(7, "0");
  const dv = String(Math.floor(r() * 100)).padStart(2, "0");
  const year = 2020 + Math.floor(r() * 6);
  const vara = String(Math.floor(r() * 10_000)).padStart(4, "0");
  return `${seq}-${dv}.${year}.8.26.${vara}`;
}

/**
 * Extrai informações mock a partir do par (documento, versão).
 * Determinístico: chamadas repetidas produzem o mesmo resultado.
 */
export function extractFromDocument(
  doc: DocumentRecord,
  version: DocumentVersion,
): ExtractionResult {
  const rand = seededRandom(previewSeed(doc.id, version.id, 100));
  const persons = pickN(SAMPLE_PERSONS, 2 + Math.floor(rand() * 4), rand).map(
    (v) => ({ value: v, confidence: conf(rand) }),
  );
  const dates: AnalysisItem[] = [];
  const dateCount = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < dateCount; i += 1) {
    dates.push({ value: fakeDate(rand), confidence: conf(rand) });
  }
  const values: AnalysisItem[] = [];
  const valueCount = 1 + Math.floor(rand() * 4);
  for (let i = 0; i < valueCount; i += 1) {
    values.push({ value: fakeValue(rand), confidence: conf(rand) });
  }
  const caseNumbers: AnalysisItem[] = [];
  const caseCount = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < caseCount; i += 1) {
    caseNumbers.push({ value: fakeCaseNumber(rand), confidence: conf(rand) });
  }
  const deadlines: AnalysisItem[] = [];
  const deadlineCount = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < deadlineCount; i += 1) {
    deadlines.push({
      value: `Prazo em ${fakeDate(rand)}`,
      confidence: conf(rand),
    });
  }
  const keywords = pickN(SAMPLE_KEYWORDS, 3 + Math.floor(rand() * 4), rand).map(
    (v) => ({ value: v, confidence: conf(rand) }),
  );
  const inconsistencies = pickN(
    SAMPLE_INCONSISTENCIES,
    1 + Math.floor(rand() * 2),
    rand,
  ).map((v) => ({ value: v, confidence: conf(rand) }));

  const kind = classifyPreview(version.fileName, version.mimeType);
  const excerpts: AnalysisItem[] = [];
  if (kind === "text") {
    const pageCount = getPreviewPageCount("text", doc.id, version.id);
    const totalPages = Math.min(3, Math.max(1, pageCount));
    for (let i = 0; i < totalPages; i += 1) {
      const p = buildTextPage(doc.id, version.id, i);
      excerpts.push({
        value: p.paragraphs[0] ?? p.title,
        confidence: conf(rand),
      });
    }
  } else if (kind === "sheet") {
    const sheet = buildSheetPreview(doc.id, version.id);
    for (const row of sheet.rows.slice(0, 3)) {
      excerpts.push({ value: row.join(" · "), confidence: conf(rand) });
    }
  } else if (kind === "image") {
    excerpts.push({
      value: "Imagem demonstrativa — sem trechos textuais extraídos.",
      confidence: conf(rand),
    });
  } else if (kind === "audio" || kind === "video") {
    excerpts.push({
      value: "Mídia demonstrativa — transcrição não disponível nesta etapa.",
      confidence: conf(rand),
    });
  } else {
    excerpts.push({
      value: "Formato sem trechos textuais extraíveis nesta etapa.",
      confidence: conf(rand),
    });
  }

  const summary =
    `Documento "${doc.name}" (v${version.version}) apresenta ` +
    `${persons.length} pessoas mencionadas, ${dates.length} datas, ` +
    `${values.length} valores, ${caseNumbers.length} números de processo ` +
    `e ${keywords.length} palavras-chave relevantes. ` +
    `Análise demonstrativa gerada a partir do conteúdo mock de ${version.fileName}.`;

  return {
    summary,
    persons,
    dates,
    values,
    caseNumbers,
    deadlines,
    keywords,
    inconsistencies,
    excerpts,
  };
}

/** Serializa o resultado da extração em texto copiável. */
export function extractionToText(result: ExtractionResult): string {
  const bloc = (title: string, items: readonly AnalysisItem[]): string => {
    if (items.length === 0) return `${title}:\n- (nenhum)`;
    return `${title}:\n${items.map((i) => `- ${i.value} (${i.confidence}%)`).join("\n")}`;
  };
  return [
    ANALYSIS_DEMO_NOTICE,
    "",
    `Resumo: ${result.summary}`,
    "",
    bloc("Pessoas mencionadas", result.persons),
    "",
    bloc("Datas encontradas", result.dates),
    "",
    bloc("Valores encontrados", result.values),
    "",
    bloc("Números de processo", result.caseNumbers),
    "",
    bloc("Prazos", result.deadlines),
    "",
    bloc("Palavras-chave", result.keywords),
    "",
    bloc("Possíveis inconsistências", result.inconsistencies),
    "",
    bloc("Trechos relevantes", result.excerpts),
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────
// Comparação de versões
// ─────────────────────────────────────────────────────────────

export type DiffKind = "added" | "removed" | "changed" | "unchanged";

export interface DiffLine {
  readonly kind: DiffKind;
  readonly left?: string;
  readonly right?: string;
  readonly index: number;
}

export interface VersionDiff {
  readonly summary: string;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly changedCount: number;
  readonly unchangedCount: number;
  readonly lines: readonly DiffLine[];
}

/** Constrói o conteúdo textual mock associado a uma versão. */
export function versionContentLines(
  docId: string,
  version: DocumentVersion,
): string[] {
  const kind = classifyPreview(version.fileName, version.mimeType);
  if (kind === "text") {
    const count = getPreviewPageCount("text", docId, version.id);
    const out: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const p = buildTextPage(docId, version.id, i);
      out.push(`# ${p.title}`);
      for (const par of p.paragraphs) out.push(par);
    }
    return out;
  }
  if (kind === "sheet") {
    const s = buildSheetPreview(docId, version.id);
    return [s.headers.join(" | "), ...s.rows.map((r) => r.join(" | "))];
  }
  if (kind === "image") {
    return [`Imagem demonstrativa vinculada a ${version.fileName}.`];
  }
  if (kind === "audio") {
    return [`Áudio demonstrativo vinculado a ${version.fileName}.`];
  }
  if (kind === "video") {
    return [`Vídeo demonstrativo vinculado a ${version.fileName}.`];
  }
  return [`Conteúdo sem prévia associado a ${version.fileName}.`];
}

/**
 * Compara duas versões do MESMO documento. Nunca modifica versões.
 * Lança erro se as versões forem idênticas.
 */
export function compareVersions(
  docId: string,
  left: DocumentVersion,
  right: DocumentVersion,
): VersionDiff {
  if (left.id === right.id) {
    throw new Error("Selecione versões diferentes para comparar.");
  }
  const l = versionContentLines(docId, left);
  const r = versionContentLines(docId, right);
  const max = Math.max(l.length, r.length);
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;
  for (let i = 0; i < max; i += 1) {
    const a = l[i];
    const b = r[i];
    if (a === undefined && b !== undefined) {
      lines.push({ kind: "added", right: b, index: i });
      added += 1;
    } else if (a !== undefined && b === undefined) {
      lines.push({ kind: "removed", left: a, index: i });
      removed += 1;
    } else if (a === b) {
      lines.push({ kind: "unchanged", left: a, right: b, index: i });
      unchanged += 1;
    } else {
      lines.push({ kind: "changed", left: a, right: b, index: i });
      changed += 1;
    }
  }
  const summary =
    `Comparação entre v${left.version} e v${right.version}: ` +
    `${added} adicionadas, ${removed} removidas, ${changed} alteradas, ` +
    `${unchanged} inalteradas.`;
  return {
    summary,
    addedCount: added,
    removedCount: removed,
    changedCount: changed,
    unchangedCount: unchanged,
    lines,
  };
}

// ─────────────────────────────────────────────────────────────
// Comparação de documentos
// ─────────────────────────────────────────────────────────────

export interface FieldCompare {
  readonly label: string;
  readonly left: string;
  readonly right: string;
  readonly equal: boolean;
}

export interface DocumentComparison {
  readonly fields: readonly FieldCompare[];
  readonly similarities: readonly string[];
  readonly differences: readonly string[];
  readonly conflicts: readonly string[];
  readonly similarityPercent: number;
  readonly contentDiff: VersionDiff;
}

function fmtList(arr: readonly string[]): string {
  return arr.length === 0 ? "—" : arr.join(", ");
}

/**
 * Compara dois documentos distintos. Nunca modifica nenhum dos dois.
 * Lança erro se forem o mesmo documento.
 */
export function compareDocuments(
  a: DocumentRecord,
  b: DocumentRecord,
): DocumentComparison {
  if (a.id === b.id) {
    throw new Error("Selecione documentos diferentes para comparar.");
  }
  const av = a.versions[0]!;
  const bv = b.versions[0]!;
  const fields: FieldCompare[] = [
    { label: "Nome", left: a.name, right: b.name, equal: a.name === b.name },
    {
      label: "Categoria",
      left: a.category,
      right: b.category,
      equal: a.category === b.category,
    },
    {
      label: "Processo",
      left: a.caseId ?? "—",
      right: b.caseId ?? "—",
      equal: (a.caseId ?? "") === (b.caseId ?? ""),
    },
    {
      label: "Perícia",
      left: a.expertiseId ?? "—",
      right: b.expertiseId ?? "—",
      equal: (a.expertiseId ?? "") === (b.expertiseId ?? ""),
    },
    {
      label: "Pessoas",
      left: fmtList(a.personIds),
      right: fmtList(b.personIds),
      equal: a.personIds.slice().sort().join(",") === b.personIds.slice().sort().join(","),
    },
    {
      label: "Sigilo",
      left: a.confidentiality,
      right: b.confidentiality,
      equal: a.confidentiality === b.confidentiality,
    },
    {
      label: "Prazo",
      left: a.deadlineAt ?? "—",
      right: b.deadlineAt ?? "—",
      equal: (a.deadlineAt ?? "") === (b.deadlineAt ?? ""),
    },
  ];
  const similarities: string[] = [];
  const differences: string[] = [];
  const conflicts: string[] = [];
  for (const f of fields) {
    if (f.equal) {
      similarities.push(`${f.label} coincide (${f.left || "—"})`);
    } else {
      differences.push(`${f.label}: "${f.left}" ↔ "${f.right}"`);
    }
  }
  if (a.caseId && b.caseId && a.caseId !== b.caseId) {
    conflicts.push("Processos vinculados diferentes");
  }
  if (a.confidentiality !== b.confidentiality) {
    conflicts.push("Níveis de sigilo divergentes");
  }
  if (a.category !== b.category) {
    conflicts.push("Categorias distintas");
  }

  // Compara o conteúdo mock da versão atual de cada documento.
  const leftLines = versionContentLines(a.id, av);
  const rightLines = versionContentLines(b.id, bv);
  const max = Math.max(leftLines.length, rightLines.length);
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;
  for (let i = 0; i < max; i += 1) {
    const la = leftLines[i];
    const rb = rightLines[i];
    if (la === undefined && rb !== undefined) {
      lines.push({ kind: "added", right: rb, index: i });
      added += 1;
    } else if (la !== undefined && rb === undefined) {
      lines.push({ kind: "removed", left: la, index: i });
      removed += 1;
    } else if (la === rb) {
      lines.push({ kind: "unchanged", left: la, right: rb, index: i });
      unchanged += 1;
    } else {
      lines.push({ kind: "changed", left: la, right: rb, index: i });
      changed += 1;
    }
  }
  const contentDiff: VersionDiff = {
    summary:
      `Conteúdo mock: ${added} adicionadas, ${removed} removidas, ` +
      `${changed} alteradas, ${unchanged} inalteradas.`,
    addedCount: added,
    removedCount: removed,
    changedCount: changed,
    unchangedCount: unchanged,
    lines,
  };

  const total = max || 1;
  const fieldsEqual = fields.filter((f) => f.equal).length;
  const fieldRatio = fieldsEqual / fields.length;
  const contentRatio = unchanged / total;
  // Peso: 40% metadados, 60% conteúdo. Adiciona uma leve variação
  // determinística por par de IDs para diferenciar pares muito parecidos.
  const seedTweak = (hashString(`${a.id}::${b.id}`) % 5) / 100; // 0..0.04
  const raw = fieldRatio * 0.4 + contentRatio * 0.6 - seedTweak;
  const similarityPercent = Math.max(0, Math.min(100, Math.round(raw * 100)));

  return {
    fields,
    similarities,
    differences,
    conflicts,
    similarityPercent,
    contentDiff,
  };
}
