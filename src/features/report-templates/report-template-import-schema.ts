/**
 * LV-18.3 — Schema de importação e parser seguro.
 *
 * O parser é a única fronteira que aceita `unknown`. Ele:
 *  - rejeita chaves perigosas (`__proto__`, `prototype`, `constructor`);
 *  - rejeita payloads acima do limite em bytes;
 *  - valida o envelope via Zod;
 *  - reconstrói objetos "limpos" (sem herança) na saída;
 *  - nunca faz merge recursivo com entrada externa.
 */

import { z } from "zod";

import {
  MAX_BLOCK_CONTENT_LENGTH,
  MAX_BLOCKS_PER_SECTION,
  MAX_IMPORT_BYTES,
  MAX_SECTIONS_PER_TEMPLATE,
  MAX_STRING_LENGTH,
  MAX_TEMPLATES_PER_IMPORT,
  MAX_VARIABLES_PER_TEMPLATE,
  REPORT_TEMPLATE_EXPORT_FORMAT,
  REPORT_TEMPLATE_SCHEMA_VERSION,
  type ExportedReportTemplate,
  type ReportTemplateExportEnvelope,
} from "./report-template-serialization";
import {
  REPORT_TEMPLATE_BLOCK_KINDS,
  REPORT_TEMPLATE_SPECIALTIES,
  REPORT_TEMPLATE_STATUSES,
  REPORT_TEMPLATE_VARIABLE_KINDS,
  ReportTemplateError,
} from "./report-template-types";

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Percorre o objeto recursivamente rejeitando chaves perigosas em
 * qualquer nível. Propriedades herdadas são ignoradas: usamos
 * `Object.keys` que retorna apenas próprias enumeráveis.
 */
function assertSafeKeys(value: unknown, path = "$"): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSafeKeys(item, `${path}[${i}]`));
    return;
  }
  // Rejeita objetos com protótipo custom (nem null nem Object.prototype).
  const proto = Object.getPrototypeOf(value as object);
  if (proto !== null && proto !== Object.prototype) {
    throw new ReportTemplateError(
      "import_dangerous_key",
      `Objeto com protótipo personalizado em ${path}.`,
      { path },
    );
  }
  const keys = Object.keys(value as Record<string, unknown>);
  for (const k of keys) {
    if (DANGEROUS_KEYS.has(k)) {
      throw new ReportTemplateError(
        "import_dangerous_key",
        `Chave perigosa detectada (${k}) em ${path}.`,
        { path, key: k },
      );
    }
    assertSafeKeys(
      (value as Record<string, unknown>)[k],
      `${path}.${k}`,
    );
  }
}

// ---------- Zod ----------

const safeString = (max: number) => z.string().max(max);
const idString = z.string().min(1).max(MAX_STRING_LENGTH);
const keyRe = /^[a-z][a-z0-9_]*$/;

const variableSchema = z
  .object({
    sourceId: idString,
    key: safeString(MAX_STRING_LENGTH).regex(keyRe),
    label: safeString(MAX_STRING_LENGTH),
    kind: z.enum(REPORT_TEMPLATE_VARIABLE_KINDS as unknown as [string, ...string[]]),
    required: z.boolean(),
    defaultValue: safeString(MAX_STRING_LENGTH),
  })
  .strict();

const blockSchema = z
  .object({
    sourceId: idString,
    kind: z.enum(REPORT_TEMPLATE_BLOCK_KINDS as unknown as [string, ...string[]]),
    title: safeString(MAX_STRING_LENGTH),
    content: safeString(MAX_BLOCK_CONTENT_LENGTH),
    position: z.number().int().min(0).max(10_000),
    variableRefs: z.array(safeString(MAX_STRING_LENGTH)).max(MAX_VARIABLES_PER_TEMPLATE),
  })
  .strict();

const sectionSchema = z
  .object({
    sourceId: idString,
    title: safeString(MAX_STRING_LENGTH),
    description: safeString(MAX_STRING_LENGTH),
    position: z.number().int().min(0).max(10_000),
    blocks: z.array(blockSchema).max(MAX_BLOCKS_PER_SECTION),
  })
  .strict();

const exportedTemplateSchema = z
  .object({
    schemaVersion: z.literal(REPORT_TEMPLATE_SCHEMA_VERSION),
    sourceId: idString,
    name: safeString(MAX_STRING_LENGTH).min(1),
    description: safeString(MAX_STRING_LENGTH),
    specialty: z.enum(REPORT_TEMPLATE_SPECIALTIES as unknown as [string, ...string[]]),
    status: z.enum(REPORT_TEMPLATE_STATUSES as unknown as [string, ...string[]]),
    sections: z.array(sectionSchema).max(MAX_SECTIONS_PER_TEMPLATE),
    variables: z.array(variableSchema).max(MAX_VARIABLES_PER_TEMPLATE),
  })
  .strict();

const envelopeSchema = z
  .object({
    format: z.literal(REPORT_TEMPLATE_EXPORT_FORMAT),
    schemaVersion: z.literal(REPORT_TEMPLATE_SCHEMA_VERSION),
    exportedAt: safeString(64),
    exportedBy: safeString(MAX_STRING_LENGTH),
    source: z.literal("mock"),
    templates: z.array(exportedTemplateSchema).max(MAX_TEMPLATES_PER_IMPORT),
  })
  .strict();

// ---------- Verificações estruturais complementares ----------

function assertNoDuplicateIds(env: ReportTemplateExportEnvelope): void {
  const seenTpl = new Set<string>();
  for (let i = 0; i < env.templates.length; i++) {
    const t = env.templates[i]!;
    if (seenTpl.has(t.sourceId)) {
      throw new ReportTemplateError(
        "import_duplicate_id",
        `ID de modelo duplicado no pacote: ${t.sourceId}`,
        { index: i, sourceId: t.sourceId },
      );
    }
    seenTpl.add(t.sourceId);
    assertTemplateInternalIntegrity(t, i);
  }
}

function assertTemplateInternalIntegrity(
  t: ExportedReportTemplate,
  index: number,
): void {
  const secIds = new Set<string>();
  const blockIds = new Set<string>();
  const declaredKeys = new Set<string>();

  for (const v of t.variables) {
    if (declaredKeys.has(v.key)) {
      throw new ReportTemplateError(
        "import_duplicate_variable_key",
        `Chave duplicada em ${t.sourceId}: ${v.key}`,
        { index, sourceId: t.sourceId, key: v.key },
      );
    }
    declaredKeys.add(v.key);
    if (v.kind === "numero" && v.defaultValue.length > 0 && Number.isNaN(Number(v.defaultValue))) {
      throw new ReportTemplateError(
        "import_template_invalid",
        `Valor padrão numérico inválido em ${t.sourceId}/${v.key}.`,
        { index, sourceId: t.sourceId, key: v.key },
      );
    }
  }

  t.sections.forEach((s, sIdx) => {
    if (secIds.has(s.sourceId)) {
      throw new ReportTemplateError(
        "import_duplicate_id",
        `ID de seção duplicado em ${t.sourceId}: ${s.sourceId}`,
        { index, sourceId: t.sourceId, sectionId: s.sourceId },
      );
    }
    secIds.add(s.sourceId);
    if (s.position !== sIdx) {
      throw new ReportTemplateError(
        "import_template_invalid",
        `Posição de seção não normalizada em ${t.sourceId} (esperado ${sIdx}, veio ${s.position}).`,
        { index, sectionId: s.sourceId },
      );
    }
    s.blocks.forEach((b, bIdx) => {
      if (blockIds.has(b.sourceId)) {
        throw new ReportTemplateError(
          "import_duplicate_id",
          `ID de bloco duplicado em ${t.sourceId}: ${b.sourceId}`,
          { index, blockId: b.sourceId },
        );
      }
      blockIds.add(b.sourceId);
      if (b.position !== bIdx) {
        throw new ReportTemplateError(
          "import_template_invalid",
          `Posição de bloco não normalizada em ${t.sourceId}/${s.sourceId}.`,
          { index, sectionId: s.sourceId, blockId: b.sourceId },
        );
      }
      for (const ref of b.variableRefs) {
        if (!declaredKeys.has(ref)) {
          throw new ReportTemplateError(
            "import_invalid_variable_reference",
            `Referência a variável inexistente em ${t.sourceId}: ${ref}`,
            { index, sourceId: t.sourceId, ref },
          );
        }
      }
      // varre também referências embutidas {{ chave }}
      const inline = b.content.match(/\{\{([a-z0-9_]+)\}\}/g) ?? [];
      for (const m of inline) {
        const key = m.slice(2, -2);
        if (!declaredKeys.has(key)) {
          throw new ReportTemplateError(
            "import_invalid_variable_reference",
            `Referência inline a variável inexistente em ${t.sourceId}: ${key}`,
            { index, sourceId: t.sourceId, ref: key },
          );
        }
      }
    });
  });
}

// ---------- Entrada principal ----------

export interface ParsedImportResult {
  readonly envelope: ReportTemplateExportEnvelope;
}

/**
 * Parseia uma string JSON, valida o envelope e devolve um resultado
 * congelado. Nunca modifica nenhuma store. Erros são sempre
 * `ReportTemplateError` com código estável.
 */
export function parseReportTemplateImport(json: string): ParsedImportResult {
  if (typeof json !== "string") {
    throw new ReportTemplateError(
      "import_json_invalid",
      "Entrada de importação deve ser uma string JSON.",
    );
  }
  const byteLen = new TextEncoder().encode(json).byteLength;
  if (byteLen > MAX_IMPORT_BYTES) {
    throw new ReportTemplateError(
      "import_payload_too_large",
      `Payload excede o limite de ${MAX_IMPORT_BYTES} bytes.`,
      { bytes: byteLen, limit: MAX_IMPORT_BYTES },
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new ReportTemplateError(
      "import_json_invalid",
      `JSON inválido: ${(e as Error).message}`,
    );
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ReportTemplateError(
      "import_format_invalid",
      "Raiz do envelope precisa ser um objeto.",
    );
  }
  assertSafeKeys(raw);

  // Detecção precoce de formato / schemaVersion para erro específico.
  const asRec = raw as Record<string, unknown>;
  if (asRec.format !== REPORT_TEMPLATE_EXPORT_FORMAT) {
    throw new ReportTemplateError(
      "import_format_invalid",
      `Formato desconhecido: ${String(asRec.format)}.`,
      { format: String(asRec.format) },
    );
  }
  if (asRec.schemaVersion !== REPORT_TEMPLATE_SCHEMA_VERSION) {
    throw new ReportTemplateError(
      "import_schema_version_unsupported",
      `Versão de schema não suportada: ${String(asRec.schemaVersion)}.`,
      { schemaVersion: asRec.schemaVersion },
    );
  }

  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const pathStr = first?.path.join(".") ?? "$";
    // heurística: se o problema é limite de array, retorna limit_exceeded.
    const isLimit = first && (first.code === "too_big" || first.code === "too_small");
    throw new ReportTemplateError(
      isLimit ? "import_limit_exceeded" : "import_template_invalid",
      `Payload inválido em ${pathStr}: ${first?.message ?? "desconhecido"}.`,
      { path: pathStr },
    );
  }
  // Reconstroi objeto plano (sem funções/protótipos custom)
  const clean = JSON.parse(JSON.stringify(parsed.data)) as ReportTemplateExportEnvelope;
  assertNoDuplicateIds(clean);
  return Object.freeze({ envelope: Object.freeze(clean) });
}
