/**
 * LV-19.1 — Derivações puras do workspace de laudo.
 *
 * Funções determinísticas, sem estado, sem I/O e sem dependência da store.
 * Recebem entidades já lidas do domínio e devolvem projeções congeladas.
 *
 * Regra canônica ÚNICA de status derivado de seção:
 *   vazia       → nenhum bloco com conteúdo significativo (trim).
 *   concluida   → section.status === "aprovada".
 *   em_andamento→ qualquer outro caso.
 *
 * Preencher ou revisar todos os blocos NÃO conclui automaticamente
 * a seção; apenas habilita a ação `canMarkComplete`.
 */

import type { ReportBlock, ReportDocument, ReportSection } from "./report-types";
import type {
  ReportSectionProgress,
  ReportWorkspaceProgress,
  ReportWorkspaceSnapshot,
  SectionDerivedStatus,
} from "./report-workspace-types";

function isBlockFilled(block: ReportBlock): boolean {
  return block.content.trim().length > 0;
}

/**
 * Regra canônica única (LV-19.1).
 * Não use nenhuma outra fonte para derivar este estado.
 */
export function deriveSectionStatus(section: ReportSection): SectionDerivedStatus {
  if (section.status === "aprovada") return "concluida";
  if (section.blocks.length === 0) return "vazia";
  const anyFilled = section.blocks.some(isBlockFilled);
  return anyFilled ? "em_andamento" : "vazia";
}

export function deriveSectionProgress(section: ReportSection): ReportSectionProgress {
  const totalBlocks = section.blocks.length;
  const filledBlocks = section.blocks.reduce(
    (acc, b) => acc + (isBlockFilled(b) ? 1 : 0),
    0,
  );
  const emptyBlocks = totalBlocks - filledBlocks;
  const derivedStatus = deriveSectionStatus(section);
  const isCompleted = derivedStatus === "concluida";
  // Habilita ação de concluir quando há pelo menos 1 bloco, todos preenchidos
  // e todos revisados. A conclusão em si permanece explícita (não automática).
  const canMarkComplete =
    !isCompleted &&
    totalBlocks > 0 &&
    filledBlocks === totalBlocks &&
    section.blocks.every((b) => b.reviewed);
  return Object.freeze({
    sectionId: section.id,
    derivedStatus,
    totalBlocks,
    filledBlocks,
    emptyBlocks,
    canMarkComplete,
    isCompleted,
  });
}

export function deriveReportProgress(
  report: ReportDocument,
): ReportWorkspaceProgress {
  const totalSections = report.sections.length;
  let completedSections = 0;
  let totalBlocks = 0;
  let filledBlocks = 0;
  for (const section of report.sections) {
    if (deriveSectionStatus(section) === "concluida") completedSections += 1;
    for (const block of section.blocks) {
      totalBlocks += 1;
      if (isBlockFilled(block)) filledBlocks += 1;
    }
  }
  const emptyBlocks = totalBlocks - filledBlocks;
  const pendingBlocks = emptyBlocks;
  const percentage = totalSections === 0 ? 0 : completedSections / totalSections;
  return Object.freeze({
    totalSections,
    completedSections,
    totalBlocks,
    filledBlocks,
    emptyBlocks,
    pendingBlocks,
    percentage,
  });
}

export function deriveWorkspaceSnapshot(
  report: ReportDocument,
): ReportWorkspaceSnapshot {
  const sections = Object.freeze(
    report.sections.map((s) => deriveSectionProgress(s)),
  );
  const progress = deriveReportProgress(report);
  return Object.freeze({
    report,
    sections,
    progress,
    origin: report.templateOrigin,
  });
}
