/**
 * LV-18.3 — Envelope, constantes e serialização determinística.
 *
 * Regras:
 *  - JSON puro, sem funções, sem símbolos, sem `undefined`, sem valores
 *    numéricos não finitos, sem ciclos, sem propriedades herdadas.
 *  - Chaves de objetos ordenadas alfabeticamente em todos os níveis, para
 *    que mesma entrada sempre produza exatamente a mesma string.
 *  - Nenhum acesso a rede, storage ou APIs externas.
 */

import {
  ReportTemplateError,
  type ReportTemplateBlockKind,
  type ReportTemplateSpecialty,
  type ReportTemplateStatus,
  type ReportTemplateVariableKind,
} from "./report-template-types";

// ---------- Limites de segurança ----------

export const REPORT_TEMPLATE_EXPORT_FORMAT = "nexo-report-template" as const;
export const REPORT_TEMPLATE_SCHEMA_VERSION = 1 as const;

export const MAX_IMPORT_BYTES = 524_288; // 512 KiB
export const MAX_TEMPLATES_PER_IMPORT = 50;
export const MAX_SECTIONS_PER_TEMPLATE = 50;
export const MAX_BLOCKS_PER_SECTION = 100;
export const MAX_VARIABLES_PER_TEMPLATE = 100;
export const MAX_STRING_LENGTH = 500;
export const MAX_BLOCK_CONTENT_LENGTH = 20_000;

// ---------- Tipos do envelope ----------

export interface ExportedReportTemplateVariable {
  readonly sourceId: string;
  readonly key: string;
  readonly label: string;
  readonly kind: ReportTemplateVariableKind;
  readonly required: boolean;
  readonly defaultValue: string;
}

export interface ExportedReportTemplateBlock {
  readonly sourceId: string;
  readonly kind: ReportTemplateBlockKind;
  readonly title: string;
  readonly content: string;
  readonly position: number;
  readonly variableRefs: readonly string[];
}

export interface ExportedReportTemplateSection {
  readonly sourceId: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly blocks: readonly ExportedReportTemplateBlock[];
}

export interface ExportedReportTemplate {
  readonly schemaVersion: typeof REPORT_TEMPLATE_SCHEMA_VERSION;
  readonly sourceId: string;
  readonly name: string;
  readonly description: string;
  readonly specialty: ReportTemplateSpecialty;
  readonly status: ReportTemplateStatus;
  readonly sections: readonly ExportedReportTemplateSection[];
  readonly variables: readonly ExportedReportTemplateVariable[];
}

export interface ReportTemplateExportEnvelope {
  readonly format: typeof REPORT_TEMPLATE_EXPORT_FORMAT;
  readonly schemaVersion: typeof REPORT_TEMPLATE_SCHEMA_VERSION;
  readonly exportedAt: string;
  readonly exportedBy: string;
  readonly source: "mock";
  readonly templates: readonly ExportedReportTemplate[];
}

// ---------- Serialização determinística ----------

/**
 * Serializa qualquer POJO seguro em JSON canônico:
 *  - chaves alfabéticas em cada objeto;
 *  - arrays preservam ordem;
 *  - `undefined`, funções e símbolos são rejeitados;
 *  - valores não finitos são rejeitados;
 *  - ciclos são rejeitados.
 */
export function canonicalStringify(value: unknown, indent = 2): string {
  const seen = new Set<object>();
  const pad = (n: number) => " ".repeat(n * indent);

  function walk(v: unknown, depth: number): string {
    if (v === null) return "null";
    switch (typeof v) {
      case "string":
        return JSON.stringify(v);
      case "number":
        if (!Number.isFinite(v)) {
          throw new ReportTemplateError(
            "serialization_failed",
            "Valor numérico não finito.",
          );
        }
        return JSON.stringify(v);
      case "boolean":
        return v ? "true" : "false";
      case "undefined":
        throw new ReportTemplateError(
          "serialization_failed",
          "Valor `undefined` não é serializável.",
        );
      case "function":
      case "symbol":
        throw new ReportTemplateError(
          "serialization_failed",
          `Tipo não serializável: ${typeof v}.`,
        );
      case "bigint":
        throw new ReportTemplateError(
          "serialization_failed",
          "BigInt não é serializável.",
        );
      case "object": {
        if (seen.has(v as object)) {
          throw new ReportTemplateError(
            "serialization_failed",
            "Ciclo detectado durante serialização.",
          );
        }
        seen.add(v as object);
        try {
          if (Array.isArray(v)) {
            if (v.length === 0) return "[]";
            const inner = v.map(
              (item) => pad(depth + 1) + walk(item, depth + 1),
            );
            return `[\n${inner.join(",\n")}\n${pad(depth)}]`;
          }
          const raw = v as Record<string, unknown>;
          const own = Object.keys(raw)
            .filter((k) => Object.prototype.hasOwnProperty.call(raw, k))
            .filter((k) => {
              const val = raw[k];
              return (
                val !== undefined &&
                typeof val !== "function" &&
                typeof val !== "symbol"
              );
            })
            .sort();
          if (own.length === 0) return "{}";
          const parts = own.map(
            (k) =>
              pad(depth + 1) +
              JSON.stringify(k) +
              ": " +
              walk(raw[k], depth + 1),
          );
          return `{\n${parts.join(",\n")}\n${pad(depth)}}`;
        } finally {
          seen.delete(v as object);
        }
      }
      default:
        throw new ReportTemplateError(
          "serialization_failed",
          `Tipo não suportado: ${typeof v}.`,
        );
    }
  }

  return walk(value, 0);
}
