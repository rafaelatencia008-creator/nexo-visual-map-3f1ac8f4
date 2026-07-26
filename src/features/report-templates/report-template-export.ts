/**
 * LV-18.3 — Exportação de modelos de laudo.
 *
 * Nenhuma alteração de store, nenhuma nova versão criada, nenhuma emissão
 * de listener da store principal. A exportação lê o snapshot atual, monta
 * um envelope determinístico e (opcionalmente) registra um evento de
 * histórico informativo com metadata sanitizada.
 */

import { appendTemplateHistoryEvent } from "./report-template-history-store";
import {
  canonicalStringify,
  REPORT_TEMPLATE_EXPORT_FORMAT,
  REPORT_TEMPLATE_SCHEMA_VERSION,
  type ExportedReportTemplate,
  type ExportedReportTemplateBlock,
  type ExportedReportTemplateSection,
  type ExportedReportTemplateVariable,
  type ReportTemplateExportEnvelope,
} from "./report-template-serialization";
import {
  getSnapshot,
  getTemplate,
} from "./report-template-store";
import {
  ReportTemplateError,
  type ReportTemplate,
  type ReportTemplateId,
} from "./report-template-types";

const DEFAULT_EXPORTED_BY = "usr-demo";
const DEFAULT_EXPORTED_AT = "2026-07-25T12:00:00.000Z";

// ---------- Opções ----------

export interface ExportOptions {
  readonly exportedAt?: string;
  readonly exportedBy?: string;
  readonly recordHistory?: boolean;
}

// ---------- Conversão modelo → exportável ----------

function toExportedBlock(
  b: ReportTemplate["sections"][number]["blocks"][number],
): ExportedReportTemplateBlock {
  return {
    sourceId: b.id,
    kind: b.kind,
    title: b.title,
    content: b.content,
    position: b.position,
    variableRefs: [...b.variableRefs],
  };
}

function toExportedSection(
  s: ReportTemplate["sections"][number],
): ExportedReportTemplateSection {
  return {
    sourceId: s.id,
    title: s.title,
    description: s.description,
    position: s.position,
    blocks: s.blocks.map(toExportedBlock),
  };
}

function toExportedVariable(
  v: ReportTemplate["variables"][number],
): ExportedReportTemplateVariable {
  return {
    sourceId: v.id,
    key: v.key,
    label: v.label,
    kind: v.kind,
    required: v.required,
    defaultValue: v.defaultValue,
  };
}

/** Converte um `ReportTemplate` em `ExportedReportTemplate` puro. */
export function toExportedTemplate(t: ReportTemplate): ExportedReportTemplate {
  return {
    schemaVersion: REPORT_TEMPLATE_SCHEMA_VERSION,
    sourceId: t.id,
    name: t.name,
    description: t.description,
    specialty: t.specialty,
    status: t.status,
    sections: t.sections.map(toExportedSection),
    variables: t.variables.map(toExportedVariable),
  };
}

// ---------- Envelope ----------

function buildEnvelope(
  templates: readonly ReportTemplate[],
  options: ExportOptions | undefined,
): ReportTemplateExportEnvelope {
  const exportedAt = options?.exportedAt ?? DEFAULT_EXPORTED_AT;
  const exportedBy = options?.exportedBy ?? DEFAULT_EXPORTED_BY;
  const envelope: ReportTemplateExportEnvelope = Object.freeze({
    format: REPORT_TEMPLATE_EXPORT_FORMAT,
    schemaVersion: REPORT_TEMPLATE_SCHEMA_VERSION,
    exportedAt,
    exportedBy,
    source: "mock",
    templates: Object.freeze(
      templates.map((t) => Object.freeze(toExportedTemplate(t))),
    ) as readonly ExportedReportTemplate[],
  });
  return envelope;
}

// ---------- API pública ----------

/** Exporta um modelo individual. Lança se o modelo não existir. */
export function exportReportTemplate(
  templateId: ReportTemplateId,
  options?: ExportOptions,
): ReportTemplateExportEnvelope {
  const t = getTemplate(templateId);
  if (!t) {
    throw new ReportTemplateError(
      "template_not_found",
      `Modelo ${templateId} não encontrado.`,
      { templateId },
    );
  }
  const env = buildEnvelope([t], options);
  if (options?.recordHistory !== false) {
    appendTemplateHistoryEvent({
      templateId,
      action: "template_exported",
      description: `Modelo exportado (schema v${REPORT_TEMPLATE_SCHEMA_VERSION}).`,
      metadata: {
        schemaVersion: REPORT_TEMPLATE_SCHEMA_VERSION,
        count: 1,
        exportedAt: env.exportedAt,
      },
    });
  }
  return env;
}

/**
 * Exporta múltiplos modelos. Se `templateIds` não for fornecido, exporta
 * todos os modelos atuais. IDs duplicados na seleção são deduplicados.
 * Modelo inexistente na seleção lança erro tipado. Seleção vazia
 * (`[]`) é tratada explicitamente e produz um envelope vazio.
 */
export function exportReportTemplates(
  templateIds?: readonly ReportTemplateId[],
  options?: ExportOptions,
): ReportTemplateExportEnvelope {
  const snapshot = getSnapshot();
  let list: ReportTemplate[];
  if (templateIds === undefined) {
    list = [...snapshot.templates];
  } else {
    const seen = new Set<string>();
    list = [];
    for (const id of templateIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const t = snapshot.templates.find((x) => x.id === id);
      if (!t) {
        throw new ReportTemplateError(
          "template_not_found",
          `Modelo ${id} não encontrado.`,
          { templateId: id },
        );
      }
      list.push(t);
    }
  }
  const env = buildEnvelope(list, options);
  if (options?.recordHistory !== false && list.length > 0) {
    appendTemplateHistoryEvent({
      templateId: list[0]!.id,
      action: "template_exported",
      description: `Exportação em lote (${list.length} modelo(s)).`,
      metadata: {
        schemaVersion: REPORT_TEMPLATE_SCHEMA_VERSION,
        count: list.length,
        exportedAt: env.exportedAt,
      },
    });
  }
  return env;
}

// ---------- Serialização ----------

/** Serializa um modelo individual como string JSON canônica. */
export function serializeReportTemplate(
  templateId: ReportTemplateId,
  options?: ExportOptions,
): string {
  const env = exportReportTemplate(templateId, {
    ...options,
    recordHistory: options?.recordHistory ?? false,
  });
  try {
    return canonicalStringify(env);
  } catch (e) {
    if (e instanceof ReportTemplateError) throw e;
    throw new ReportTemplateError(
      "serialization_failed",
      `Falha ao serializar: ${(e as Error).message}`,
    );
  }
}

/** Serializa vários modelos em uma única string JSON canônica. */
export function serializeReportTemplates(
  templateIds?: readonly ReportTemplateId[],
  options?: ExportOptions,
): string {
  const env = exportReportTemplates(templateIds, {
    ...options,
    recordHistory: options?.recordHistory ?? false,
  });
  try {
    return canonicalStringify(env);
  } catch (e) {
    if (e instanceof ReportTemplateError) throw e;
    throw new ReportTemplateError(
      "serialization_failed",
      `Falha ao serializar: ${(e as Error).message}`,
    );
  }
}
