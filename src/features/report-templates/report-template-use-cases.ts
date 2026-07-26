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
