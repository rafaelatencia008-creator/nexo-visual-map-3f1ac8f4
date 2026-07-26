/**
 * LV-18.1 — Casos de uso estruturais.
 *
 * Estes casos de uso são fachadas finas sobre `report-template-store`.
 * Ficam separados da store para permitir que a LV-18.5 (UI) e a LV-18.6
 * (contrato de repositório) consumam nomes semânticos sem depender do
 * arquivo de store diretamente. Nenhuma lógica adicional é adicionada
 * nesta LV — apenas re-exportações organizadas.
 */

export {
  addBlock,
  addSection,
  addVariable,
  archiveTemplate,
  createManualTemplateVersion,
  createTemplate,
  duplicateTemplate,
  getSnapshot,
  getTemplate,
  isVariableInUse,
  listTemplates,
  moveBlock,
  moveSection,
  publishTemplate,
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
} from "./report-template-store";

export type { ReportTemplateSnapshot } from "./report-template-store";

export {
  createTemplateVersion,
  getTemplateVersion,
  getTemplateVersionsSnapshot,
  listTemplateVersions,
  resetTemplateVersionStore,
  subscribeTemplateVersions,
} from "./report-template-version-store";
export type { ReportTemplateVersion } from "./report-template-version-store";

export {
  appendTemplateHistoryEvent,
  getTemplateHistorySnapshot,
  listTemplateHistory,
  resetTemplateHistoryStore,
  subscribeTemplateHistory,
} from "./report-template-history-store";
export type {
  ReportTemplateHistoryAction,
  ReportTemplateHistoryEvent,
  ReportTemplateHistoryResult,
} from "./report-template-history-store";

export { compareReportTemplates } from "./report-template-version-diff";
export type { ReportTemplateDiff } from "./report-template-version-diff";

export { validateReportTemplate } from "./report-template-validation";
export type {
  ReportTemplateValidationCode,
  ReportTemplateValidationIssue,
  ReportTemplateValidationResult,
  ReportTemplateValidationSeverity,
} from "./report-template-validation";

// LV-18.3 — Importação e exportação
export {
  canonicalStringify,
  MAX_BLOCK_CONTENT_LENGTH,
  MAX_BLOCKS_PER_SECTION,
  MAX_IMPORT_BYTES,
  MAX_SECTIONS_PER_TEMPLATE,
  MAX_STRING_LENGTH,
  MAX_TEMPLATES_PER_IMPORT,
  MAX_VARIABLES_PER_TEMPLATE,
  REPORT_TEMPLATE_EXPORT_FORMAT,
  REPORT_TEMPLATE_SCHEMA_VERSION,
} from "./report-template-serialization";
export type {
  ExportedReportTemplate,
  ExportedReportTemplateBlock,
  ExportedReportTemplateSection,
  ExportedReportTemplateVariable,
  ReportTemplateExportEnvelope,
} from "./report-template-serialization";

export {
  exportReportTemplate,
  exportReportTemplates,
  serializeReportTemplate,
  serializeReportTemplates,
  toExportedTemplate,
} from "./report-template-export";
export type { ExportOptions } from "./report-template-export";

export { parseReportTemplateImport } from "./report-template-import-schema";
export type { ParsedImportResult } from "./report-template-import-schema";

export {
  importReportTemplate,
  importReportTemplates,
  previewReportTemplateImport,
} from "./report-template-import";
export type {
  ImportConflict,
  ImportConflictStrategy,
  ImportIdMapping,
  ImportOptions,
  ImportPreview,
  ImportWarning,
  ImportedTemplateSummary,
  ReportTemplateImportReport,
} from "./report-template-import";
