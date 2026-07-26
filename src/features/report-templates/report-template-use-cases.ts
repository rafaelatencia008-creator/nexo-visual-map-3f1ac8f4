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
  createTemplate,
  duplicateTemplate,
  getSnapshot,
  getTemplate,
  isVariableInUse,
  listTemplates,
  moveBlock,
  moveSection,
  reactivateTemplate,
  removeBlock,
  removeSection,
  removeVariable,
  resetReportTemplateStore,
  subscribe,
  updateBlock,
  updateSection,
  updateTemplateMetadata,
  updateVariable,
} from "./report-template-store";

export type { ReportTemplateSnapshot } from "./report-template-store";
