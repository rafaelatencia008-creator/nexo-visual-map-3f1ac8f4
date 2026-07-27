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

/**
 * Cache referencial da projeção do workspace.
 *
 * Chaveado pela referência IMUTÁVEL do `ReportDocument`. A store cria um
 * novo `ReportDocument` a cada mutação atômica (via spread), portanto:
 *   - Leituras sem mutação retornam o MESMO objeto de snapshot (===).
 *   - Após mutação válida, a chave muda e uma nova projeção é gerada.
 *   - Leituras subsequentes voltam a estabilizar na nova projeção.
 *   - Relatórios distintos jamais compartilham projeção (identidade WeakMap).
 *
 * O WeakMap NÃO é uma nova store: não guarda estado de domínio, não
 * persiste, e é coletado junto com o próprio `ReportDocument`.
 */
const snapshotCache = new WeakMap<ReportDocument, ReportWorkspaceSnapshot>();

/**
 * Congela profundamente o `ReportDocument` no local, na fronteira do
 * snapshot. Não clona: preserva `snapshot.report === doc` e a estabilidade
 * referencial. `Object.freeze` é idempotente e não altera dados de domínio.
 */
function deepFreezeReportInPlace(doc: ReportDocument): void {
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (block.sources && !Object.isFrozen(block.sources)) {
        for (const src of block.sources) Object.freeze(src);
        Object.freeze(block.sources);
      }
      Object.freeze(block);
    }
    if (!Object.isFrozen(section.blocks)) Object.freeze(section.blocks);
    Object.freeze(section);
  }
  if (!Object.isFrozen(doc.sections)) Object.freeze(doc.sections);
  if (doc.templateOrigin && !Object.isFrozen(doc.templateOrigin)) {
    Object.freeze(doc.templateOrigin);
  }
  if (!Object.isFrozen(doc)) Object.freeze(doc);
}

export function deriveWorkspaceSnapshot(
  report: ReportDocument,
): ReportWorkspaceSnapshot {
  const cached = snapshotCache.get(report);
  if (cached) return cached;
  deepFreezeReportInPlace(report);
  const sections = Object.freeze(
    report.sections.map((s) => deriveSectionProgress(s)),
  );
  const progress = deriveReportProgress(report);
  const snap: ReportWorkspaceSnapshot = Object.freeze({
    report,
    sections,
    progress,
    origin: report.templateOrigin,
  });
  snapshotCache.set(report, snap);
  return snap;
}

/** Inspeção de cache para testes de auditoria; não usado em produção. */
export function __peekWorkspaceSnapshotCache(
  report: ReportDocument,
): ReportWorkspaceSnapshot | undefined {
  return snapshotCache.get(report);
}
