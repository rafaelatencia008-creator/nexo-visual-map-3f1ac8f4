/**
 * LV-18.3 — Importação atômica de modelos de laudo.
 *
 * A importação:
 *  - roda sempre sobre um envelope já parseado e sanitizado;
 *  - aplica uma estratégia explícita de conflito;
 *  - é atômica por padrão (falha em qualquer modelo cancela tudo);
 *  - insere todos com uma única emissão da store principal;
 *  - registra um único evento agregado no histórico append-only;
 *  - força status final `rascunho`.
 */

import { appendTemplateHistoryEvent } from "./report-template-history-store";
import {
  parseReportTemplateImport,
  type ParsedImportResult,
} from "./report-template-import-schema";
import {
  REPORT_TEMPLATE_SCHEMA_VERSION,
  type ExportedReportTemplate,
  type ReportTemplateExportEnvelope,
} from "./report-template-serialization";
import {
  bulkInsertImportedTemplates,
  generateImportedBlockId,
  generateImportedSectionId,
  generateImportedTemplateId,
  generateImportedVariableId,
  getSnapshot,
} from "./report-template-store";
import {
  ReportTemplateError,
  type ReportTemplate,
  type ReportTemplateBlock,
  type ReportTemplateBlockId,
  type ReportTemplateId,
  type ReportTemplateSection,
  type ReportTemplateSectionId,
  type ReportTemplateVariable,
  type ReportTemplateVariableId,
} from "./report-template-types";

// ---------- Tipos ----------

export type ImportConflictStrategy =
  | "reject"
  | "regenerate_ids"
  | "duplicate";

export interface ImportOptions {
  readonly strategy?: ImportConflictStrategy;
  readonly clockIso?: string;
  readonly actor?: string;
}

export interface ImportWarning {
  readonly code: string;
  readonly message: string;
  readonly sourceId?: string;
}

export interface ImportConflict {
  readonly sourceId: string;
  readonly kind: "template" | "section" | "block" | "variable";
  readonly reason: string;
}

export interface ImportIdMapping {
  readonly kind: "template" | "section" | "block" | "variable";
  readonly sourceId: string;
  readonly newId: string;
  readonly templateSourceId: string;
  readonly templateNewId: string;
}

export interface ImportedTemplateSummary {
  readonly sourceId: string;
  readonly newId: ReportTemplateId;
  readonly name: string;
  readonly sectionsCount: number;
  readonly variablesCount: number;
  readonly status: "rascunho";
}

export interface ReportTemplateImportReport {
  readonly success: boolean;
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly strategy: ImportConflictStrategy;
  readonly schemaVersion: typeof REPORT_TEMPLATE_SCHEMA_VERSION;
  readonly warnings: readonly ImportWarning[];
  readonly conflicts: readonly ImportConflict[];
  readonly importedTemplates: readonly ImportedTemplateSummary[];
  readonly idMappings: readonly ImportIdMapping[];
}

export interface ImportPreview {
  readonly schemaVersion: typeof REPORT_TEMPLATE_SCHEMA_VERSION;
  readonly templateCount: number;
  readonly names: readonly string[];
  readonly conflicts: readonly ImportConflict[];
  readonly warnings: readonly ImportWarning[];
  readonly recommendedStrategy: ImportConflictStrategy;
  readonly idsToRegenerate: number;
}

// ---------- Helpers ----------

const FIXED_ISO = "2026-07-25T12:00:00.000Z";

function deepFreeze<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  if (Object.isFrozen(v)) return v;
  Object.freeze(v);
  for (const k of Object.keys(v as Record<string, unknown>)) {
    deepFreeze((v as Record<string, unknown>)[k]);
  }
  return v;
}

function truncate(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) : s;
}

function detectConflicts(env: ReportTemplateExportEnvelope): ImportConflict[] {
  const existing = new Set(getSnapshot().templates.map((t) => t.id));
  const out: ImportConflict[] = [];
  for (const t of env.templates) {
    if (existing.has(t.sourceId as ReportTemplateId)) {
      out.push({
        sourceId: t.sourceId,
        kind: "template",
        reason: "ID já existe na store atual.",
      });
    }
  }
  return out;
}

function countRegeneratedIds(env: ReportTemplateExportEnvelope): number {
  let n = 0;
  for (const t of env.templates) {
    n += 1; // template
    n += t.variables.length;
    for (const s of t.sections) {
      n += 1;
      n += s.blocks.length;
    }
  }
  return n;
}

// ---------- Preview ----------

export function previewReportTemplateImport(
  json: string,
): ImportPreview {
  let parsed: ParsedImportResult;
  try {
    parsed = parseReportTemplateImport(json);
  } catch (e) {
    if (e instanceof ReportTemplateError) {
      appendTemplateHistoryEvent({
        templateId: "rtpl-import" as ReportTemplateId,
        action: "template_import_blocked",
        description: `Preview bloqueado: ${e.code}`,
        result: "blocked",
        metadata: { code: e.code },
      });
    }
    throw e;
  }
  const env = parsed.envelope;
  if (env.templates.length === 0) {
    throw new ReportTemplateError(
      "import_empty",
      "Envelope não contém nenhum modelo.",
    );
  }
  const conflicts = detectConflicts(env);
  const warnings: ImportWarning[] = [];
  for (const t of env.templates) {
    if (t.status !== "rascunho") {
      warnings.push({
        code: "status_forced_to_draft",
        message: `Modelo "${truncate(t.name)}" será importado como rascunho.`,
        sourceId: t.sourceId,
      });
    }
  }
  const preview: ImportPreview = deepFreeze({
    schemaVersion: env.schemaVersion,
    templateCount: env.templates.length,
    names: env.templates.map((t) => t.name),
    conflicts,
    warnings,
    recommendedStrategy: conflicts.length > 0 ? "regenerate_ids" : "regenerate_ids",
    idsToRegenerate: countRegeneratedIds(env),
  });
  appendTemplateHistoryEvent({
    templateId: "rtpl-import" as ReportTemplateId,
    action: "template_import_previewed",
    description: `Preview de importação (${preview.templateCount} modelo(s)).`,
    metadata: {
      count: preview.templateCount,
      conflicts: preview.conflicts.length,
      schemaVersion: env.schemaVersion,
    },
  });
  return preview;
}

// ---------- Importação (efetiva) ----------

function buildImportedTemplate(
  t: ExportedReportTemplate,
  strategy: ImportConflictStrategy,
  clockIso: string,
  actor: string,
  mappings: ImportIdMapping[],
): ReportTemplate {
  const regenerate = strategy !== "reject";
  const newTplId = regenerate
    ? generateImportedTemplateId()
    : (t.sourceId as ReportTemplateId);
  mappings.push({
    kind: "template",
    sourceId: t.sourceId,
    newId: newTplId,
    templateSourceId: t.sourceId,
    templateNewId: newTplId,
  });

  const variables: ReportTemplateVariable[] = t.variables.map((v) => {
    const newId = regenerate
      ? generateImportedVariableId()
      : (v.sourceId as ReportTemplateVariableId);
    mappings.push({
      kind: "variable",
      sourceId: v.sourceId,
      newId,
      templateSourceId: t.sourceId,
      templateNewId: newTplId,
    });
    return {
      id: newId,
      key: v.key,
      label: v.label,
      kind: v.kind,
      required: v.required,
      defaultValue: v.defaultValue,
    };
  });

  const sections: ReportTemplateSection[] = t.sections.map((s, sIdx) => {
    const newSecId = regenerate
      ? generateImportedSectionId()
      : (s.sourceId as ReportTemplateSectionId);
    mappings.push({
      kind: "section",
      sourceId: s.sourceId,
      newId: newSecId,
      templateSourceId: t.sourceId,
      templateNewId: newTplId,
    });
    const blocks: ReportTemplateBlock[] = s.blocks.map((b, bIdx) => {
      const newBlockId = regenerate
        ? generateImportedBlockId()
        : (b.sourceId as ReportTemplateBlockId);
      mappings.push({
        kind: "block",
        sourceId: b.sourceId,
        newId: newBlockId,
        templateSourceId: t.sourceId,
        templateNewId: newTplId,
      });
      return {
        id: newBlockId,
        kind: b.kind,
        title: b.title,
        content: b.content,
        position: bIdx,
        variableRefs: [...b.variableRefs],
      };
    });
    return {
      id: newSecId,
      title: s.title,
      description: s.description,
      position: sIdx,
      blocks,
    };
  });

  const finalName =
    strategy === "duplicate" ? `${t.name} (importado)` : t.name;

  return {
    id: newTplId,
    name: finalName,
    description: t.description,
    // Recomendação obrigatória: todo modelo importado entra como rascunho.
    status: "rascunho",
    specialty: t.specialty,
    createdAt: clockIso,
    updatedAt: clockIso,
    createdBy: actor,
    sections,
    variables,
    duplicatedFrom: null,
  };
}

function runImport(
  env: ReportTemplateExportEnvelope,
  options: ImportOptions | undefined,
): ReportTemplateImportReport {
  const strategy = options?.strategy ?? "regenerate_ids";
  const clockIso = options?.clockIso ?? FIXED_ISO;
  const actor = options?.actor ?? "usr-demo";

  if (env.templates.length === 0) {
    throw new ReportTemplateError(
      "import_empty",
      "Envelope não contém nenhum modelo.",
    );
  }

  // Estratégia reject: se qualquer sourceId conflita, aborta antes de mutar.
  if (strategy === "reject") {
    const existing = new Set(getSnapshot().templates.map((t) => t.id));
    for (const t of env.templates) {
      if (existing.has(t.sourceId as ReportTemplateId)) {
        throw new ReportTemplateError(
          "import_conflict",
          `Conflito de ID rejeitado: ${t.sourceId}`,
          { sourceId: t.sourceId },
        );
      }
    }
  }

  const mappings: ImportIdMapping[] = [];
  const warnings: ImportWarning[] = [];
  for (const t of env.templates) {
    if (t.status !== "rascunho") {
      warnings.push({
        code: "status_forced_to_draft",
        message: `"${truncate(t.name)}" importado como rascunho.`,
        sourceId: t.sourceId,
      });
    }
  }

  const prepared = env.templates.map((t) =>
    buildImportedTemplate(t, strategy, clockIso, actor, mappings),
  );

  // Inserção atômica — se falhar, nada foi tocado; error propaga para o chamador.
  const inserted = bulkInsertImportedTemplates(prepared);

  const importedTemplates: ImportedTemplateSummary[] = inserted.map((t) => ({
    sourceId:
      mappings.find((m) => m.kind === "template" && m.newId === t.id)
        ?.sourceId ?? t.id,
    newId: t.id,
    name: t.name,
    sectionsCount: t.sections.length,
    variablesCount: t.variables.length,
    status: "rascunho" as const,
  }));

  const report: ReportTemplateImportReport = deepFreeze({
    success: true,
    importedCount: inserted.length,
    skippedCount: 0,
    strategy,
    schemaVersion: env.schemaVersion,
    warnings,
    conflicts: [],
    importedTemplates,
    idMappings: mappings,
  });

  appendTemplateHistoryEvent({
    templateId: inserted[0]!.id,
    action: "template_imported",
    description: `Importação concluída (${inserted.length} modelo(s), estratégia ${strategy}).`,
    metadata: {
      count: inserted.length,
      strategy,
      schemaVersion: env.schemaVersion,
    },
  });

  return report;
}

/** Importa exatamente um modelo. Se o pacote tiver mais que um, erro. */
export function importReportTemplate(
  json: string,
  options?: ImportOptions,
): ReportTemplateImportReport {
  const parsed = safeParse(json, options);
  if (parsed.envelope.templates.length !== 1) {
    const err = new ReportTemplateError(
      "import_template_invalid",
      `Esperado exatamente 1 modelo, veio ${parsed.envelope.templates.length}.`,
    );
    recordFailure(err);
    throw err;
  }
  return runReport(parsed.envelope, options);
}

/** Importa um pacote (1..N modelos) de forma atômica. */
export function importReportTemplates(
  json: string,
  options?: ImportOptions,
): ReportTemplateImportReport {
  const parsed = safeParse(json, options);
  return runReport(parsed.envelope, options);
}

function safeParse(
  json: string,
  _options: ImportOptions | undefined,
): ParsedImportResult {
  try {
    return parseReportTemplateImport(json);
  } catch (e) {
    if (e instanceof ReportTemplateError) recordFailure(e);
    throw e;
  }
}

function runReport(
  env: ReportTemplateExportEnvelope,
  options: ImportOptions | undefined,
): ReportTemplateImportReport {
  try {
    return runImport(env, options);
  } catch (e) {
    if (e instanceof ReportTemplateError) recordFailure(e);
    throw e;
  }
}

function recordFailure(e: ReportTemplateError): void {
  try {
    appendTemplateHistoryEvent({
      templateId: "rtpl-import" as ReportTemplateId,
      action:
        e.code === "import_conflict" ||
        e.code === "import_dangerous_key" ||
        e.code === "import_payload_too_large" ||
        e.code === "import_limit_exceeded"
          ? "template_import_blocked"
          : "template_import_failed",
      description: `Importação abortada: ${e.code}`,
      result: e.code === "import_conflict" ? "blocked" : "failure",
      metadata: { code: e.code },
    });
  } catch {
    /* histórico é secundário */
  }
}
