/**
 * LV-18.5 — Tipos da aplicação de Modelos de Laudo ao fluxo de criação.
 *
 * Este módulo é puro e sem dependências de UI. Concentra:
 *  - Metadata de origem (rastreabilidade imutável).
 *  - Entrada e resultado do caso de uso `applyReportTemplateToReport`.
 *  - Erros tipados por código.
 *
 * Domínio 100% frontend/mock. Sem persistência, sem rede, sem IA.
 */

import type {
  ReportTemplateId as TemplateId,
  ReportTemplateSpecialty,
  ReportTemplateVariableKind,
} from "@/features/report-templates/report-template-types";
import type { ReportSection, ReportDocument, ReportTemplateOrigin } from "./report-types";

export type { ReportTemplateOrigin };

/** Valores das variáveis, como texto normalizado (input do formulário). */
export type ReportTemplateVariableValues = Readonly<Record<string, string>>;

export interface ReportTemplateApplicationInput {
  readonly templateId: TemplateId;
  /** Se omitido, usa a versão publicada mais recente. */
  readonly templateVersionId?: string;
  readonly title: string;
  readonly caseId: string;
  readonly caseLabel: string;
  readonly variableValues: ReportTemplateVariableValues;
  readonly appliedBy?: string;
  /** Fingerprint obtido no preview — obriga reexame de concorrência. */
  readonly fingerprint?: string;
  /** Contexto opcional para checagem de compatibilidade. */
  readonly contextSpecialty?: ReportTemplateSpecialty;
}

/** Bloco pré-resolvido (texto puro, variáveis já substituídas). */
export interface PreparedBlockPreview {
  readonly title: string;
  readonly content: string;
  readonly variableRefs: readonly string[];
}

export interface PreparedSectionPreview {
  readonly title: string;
  readonly description: string;
  readonly blocks: readonly PreparedBlockPreview[];
}

export interface ReportTemplateApplicationPreview {
  readonly templateId: TemplateId;
  readonly templateVersionId: string;
  readonly templateVersionNumber: number;
  readonly templateName: string;
  readonly templateSpecialty: ReportTemplateSpecialty;
  readonly sections: readonly PreparedSectionPreview[];
  readonly sectionsCount: number;
  readonly blocksCount: number;
  readonly variableKeys: readonly string[];
  readonly resolvedValues: ReportTemplateVariableValues;
  readonly warnings: readonly string[];
  /** Fingerprint que deve ser reapresentado no confirm. */
  readonly fingerprint: string;
}

export interface ReportTemplateApplicationResult {
  readonly report: ReportDocument;
  readonly origin: ReportTemplateOrigin;
  readonly sectionsCount: number;
  readonly blocksCount: number;
}

export interface VariableFieldError {
  readonly key: string;
  readonly code:
    | "required"
    | "invalid_number"
    | "invalid_date"
    | "invalid_boolean"
    | "too_long"
    | "unknown"
    | "invalid_shape";
  readonly message: string;
}

// ---------- Erros tipados ----------

export type ReportTemplateApplicationErrorCode =
  | "report_template_required"
  | "report_template_not_found"
  | "report_template_not_published"
  | "report_template_version_not_found"
  | "report_template_version_not_published"
  | "report_template_version_mismatch"
  | "report_template_changed"
  | "report_template_invalid"
  | "report_template_incompatible"
  | "report_template_variable_required"
  | "report_template_variable_invalid"
  | "report_template_variable_unknown"
  | "report_template_reference_invalid"
  | "report_template_application_failed"
  | "report_creation_failed";

export class ReportTemplateApplicationError extends Error {
  readonly code: ReportTemplateApplicationErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly fieldErrors?: readonly VariableFieldError[];
  constructor(
    code: ReportTemplateApplicationErrorCode,
    message: string,
    context?: Readonly<Record<string, unknown>>,
    fieldErrors?: readonly VariableFieldError[],
  ) {
    super(message);
    this.name = "ReportTemplateApplicationError";
    this.code = code;
    this.context = context ? Object.freeze({ ...context }) : undefined;
    this.fieldErrors = fieldErrors ? Object.freeze(fieldErrors.slice()) : undefined;
  }
}

/** Rótulos legíveis em português. */
export const REPORT_TEMPLATE_APPLICATION_ERROR_LABEL: Readonly<
  Record<ReportTemplateApplicationErrorCode, string>
> = {
  report_template_required: "Selecione um modelo para continuar.",
  report_template_not_found: "Modelo não encontrado.",
  report_template_not_published: "Este modelo não está publicado.",
  report_template_version_not_found: "Versão do modelo não encontrada.",
  report_template_version_not_published:
    "A versão selecionada não é uma versão publicada do modelo.",
  report_template_version_mismatch:
    "A versão informada não pertence ao modelo selecionado.",
  report_template_changed:
    "O modelo foi alterado desde a pré-visualização. Refaça o preview.",
  report_template_invalid: "O modelo possui erros estruturais e não pode ser aplicado.",
  report_template_incompatible:
    "O modelo não é compatível com a especialidade do laudo.",
  report_template_variable_required: "Preencha as variáveis obrigatórias.",
  report_template_variable_invalid:
    "Um ou mais valores de variáveis são inválidos.",
  report_template_variable_unknown:
    "Foram enviadas variáveis desconhecidas ao modelo.",
  report_template_reference_invalid:
    "O modelo referencia variáveis inexistentes.",
  report_template_application_failed: "Falha ao aplicar o modelo.",
  report_creation_failed: "Falha ao criar o laudo.",
};

export type { ReportSection };
