/**
 * LV-19.1 — Tipos do workspace de elaboração do laudo.
 *
 * Somente tipos e códigos de erro. Sem estado, sem I/O, sem lógica.
 */

import type {
  ReportDocument,
  ReportSection,
  ReportTemplateOrigin,
} from "./report-types";

/**
 * Regra canônica única (definida em `report-workspace-derivation.ts`):
 *  - `vazia`: nenhum bloco possui conteúdo significativo (após trim).
 *  - `concluida`: `section.status === "aprovada"`.
 *  - `em_andamento`: qualquer outro estado.
 *
 * A ação de "marcar como concluída" e "reabrir" permanecem explícitas —
 * preencher todos os blocos NÃO conclui a seção automaticamente.
 */
export type SectionDerivedStatus = "vazia" | "em_andamento" | "concluida";

export type ReportSectionProgress = {
  readonly sectionId: string;
  readonly derivedStatus: SectionDerivedStatus;
  readonly totalBlocks: number;
  readonly filledBlocks: number;
  readonly emptyBlocks: number;
  readonly canMarkComplete: boolean;
  readonly isCompleted: boolean;
};

export type ReportWorkspaceProgress = {
  readonly totalSections: number;
  readonly completedSections: number;
  readonly totalBlocks: number;
  readonly filledBlocks: number;
  readonly emptyBlocks: number;
  readonly pendingBlocks: number;
  /** Fração 0..1 baseada em seções concluídas / total. */
  readonly percentage: number;
};

export type ReportWorkspaceSnapshot = {
  readonly report: ReportDocument;
  readonly sections: readonly ReportSectionProgress[];
  readonly progress: ReportWorkspaceProgress;
  readonly origin: ReportTemplateOrigin | undefined;
};

// ---------- Códigos de erro ----------

export const REPORT_WORKSPACE_ERROR_CODES = [
  "report_not_found",
  "report_section_not_found",
  "report_block_not_found",
  "report_workspace_frozen",
  "report_workspace_empty_patch",
  "report_workspace_no_change",
  "report_workspace_invalid_title",
] as const;

export type ReportWorkspaceErrorCode =
  (typeof REPORT_WORKSPACE_ERROR_CODES)[number];

export const REPORT_WORKSPACE_ERROR_MESSAGE: Readonly<
  Record<ReportWorkspaceErrorCode, string>
> = {
  report_not_found: "Laudo não encontrado.",
  report_section_not_found: "Seção do laudo não encontrada.",
  report_block_not_found: "Bloco do laudo não encontrado.",
  report_workspace_frozen: "Laudo congelado — reabra para editar.",
  report_workspace_empty_patch: "Nenhum campo informado para atualizar.",
  report_workspace_no_change: "Nenhuma alteração efetiva a aplicar.",
  report_workspace_invalid_title: "Título inválido.",
};

export class ReportWorkspaceError extends Error {
  readonly code: ReportWorkspaceErrorCode;
  constructor(code: ReportWorkspaceErrorCode, detail?: string) {
    const base = REPORT_WORKSPACE_ERROR_MESSAGE[code];
    super(detail ? `${base} ${detail}` : base);
    this.code = code;
    this.name = "ReportWorkspaceError";
  }
}

// Utility re-export para consumidores do módulo.
export type { ReportSection };
