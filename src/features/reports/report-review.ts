/**
 * LV-15 — Motor puro de revisão do documento pericial.
 *
 * Nenhum efeito colateral, nenhuma I/O.
 * Recebe um `ReportDocument` e devolve pendências determinísticas + status geral.
 */

import {
  REPORT_MANDATORY_SECTIONS,
  REPORT_SECTION_LABEL,
  isMandatorySection,
  type ReportDocument,
  type ReportGeneralStatus,
  type ReportPendingItem,
  type ReportSection,
} from "./report-types";

export type ReportReviewSummary = {
  readonly totalSections: number;
  readonly sectionsNotStarted: number;
  readonly sectionsInProgress: number;
  readonly sectionsReviewed: number;
  readonly sectionsApproved: number;
  readonly totalBlocks: number;
  readonly blocksUnreviewed: number;
  readonly blocksEmpty: number;
  readonly blocksWithoutSources: number;
  readonly totalSources: number;
  readonly blockingCount: number;
  readonly warningCount: number;
  readonly pendings: readonly ReportPendingItem[];
  readonly generalStatus: ReportGeneralStatus;
  readonly canApproveExport: boolean;
  readonly canExportReviewed: boolean;
};

function isBlockEmpty(text: string): boolean {
  return text.trim().length === 0;
}

export function computeSectionsCoverage(doc: ReportDocument) {
  let notStarted = 0;
  let inProgress = 0;
  let reviewed = 0;
  let approved = 0;
  for (const s of doc.sections) {
    if (s.status === "nao_iniciada") notStarted += 1;
    else if (s.status === "em_elaboracao") inProgress += 1;
    else if (s.status === "revisada") reviewed += 1;
    else approved += 1;
  }
  return { notStarted, inProgress, reviewed, approved };
}

export function computePendingItems(
  doc: ReportDocument,
): readonly ReportPendingItem[] {
  const items: ReportPendingItem[] = [];

  if (doc.title.trim().length === 0) {
    items.push({
      kind: "titulo_vazio",
      severity: "impeditivo",
      message: "O documento não possui título.",
    });
  }

  if (!doc.caseId || doc.caseId.trim().length === 0) {
    items.push({
      kind: "sem_pericia",
      severity: "impeditivo",
      message: "O documento não está vinculado a uma perícia.",
    });
  }

  const approvedCount = doc.sections.filter((s) => s.status === "aprovada").length;
  if (approvedCount === 0) {
    items.push({
      kind: "nenhuma_secao_aprovada",
      severity: "impeditivo",
      message: "Nenhuma seção foi marcada como aprovada.",
    });
  }

  for (const kind of REPORT_MANDATORY_SECTIONS) {
    const sec = doc.sections.find((s) => s.kind === kind);
    if (!sec) continue;
    const empty =
      sec.blocks.length === 0 ||
      sec.blocks.every((b) => isBlockEmpty(b.content));
    if (empty) {
      items.push({
        kind: "secao_obrigatoria_vazia",
        severity: "impeditivo",
        message: `Seção obrigatória "${REPORT_SECTION_LABEL[kind]}" está vazia.`,
        sectionId: sec.id,
      });
    }
    if (sec.status !== "revisada" && sec.status !== "aprovada") {
      items.push({
        kind: "secao_obrigatoria_nao_revisada",
        severity: "impeditivo",
        message: `Seção obrigatória "${REPORT_SECTION_LABEL[kind]}" ainda não foi revisada.`,
        sectionId: sec.id,
      });
    }
    for (const b of sec.blocks) {
      if (isBlockEmpty(b.content)) {
        items.push({
          kind: "bloco_obrigatorio_vazio",
          severity: "impeditivo",
          message: `Bloco vazio em seção obrigatória "${REPORT_SECTION_LABEL[kind]}".`,
          sectionId: sec.id,
          blockId: b.id,
        });
      }
    }
  }

  // Avisos (não impeditivos).
  for (const s of doc.sections) {
    if (s.status === "em_elaboracao") {
      items.push({
        kind: "secao_em_elaboracao",
        severity: "aviso",
        message: `Seção "${s.title}" ainda em elaboração.`,
        sectionId: s.id,
      });
    }
    for (const b of s.blocks) {
      if (b.sources.length === 0) {
        items.push({
          kind: "bloco_sem_fonte",
          severity: "aviso",
          message: `Bloco "${b.title}" sem fonte vinculada.`,
          sectionId: s.id,
          blockId: b.id,
        });
      }
      if (
        b.manuallyEdited &&
        !b.reviewed &&
        b.lastEditedAt !== undefined &&
        s.status === "revisada"
      ) {
        items.push({
          kind: "bloco_editado_apos_revisao",
          severity: "aviso",
          message: `Bloco "${b.title}" editado após a última revisão.`,
          sectionId: s.id,
          blockId: b.id,
        });
      }
    }
  }

  const anexos = doc.sections.find((s) => s.kind === "anexos");
  if (
    anexos &&
    (anexos.blocks.length === 0 ||
      anexos.blocks.every((b) => isBlockEmpty(b.content)))
  ) {
    items.push({
      kind: "sem_anexos",
      severity: "aviso",
      message: "Documento sem anexos preenchidos.",
      sectionId: anexos.id,
    });
  }

  return items;
}

export function computeGeneralStatus(
  doc: ReportDocument,
  pendings: readonly ReportPendingItem[] = computePendingItems(doc),
): ReportGeneralStatus {
  const blocking = pendings.filter((p) => p.severity === "impeditivo");
  const mandatorySections = doc.sections.filter((s) => isMandatorySection(s.kind));

  const allMandatoryApproved =
    mandatorySections.length > 0 &&
    mandatorySections.every((s) => s.status === "aprovada");
  if (allMandatoryApproved && blocking.length === 0) {
    return "aprovado_demonstrativo";
  }

  const allMandatoryReviewed =
    mandatorySections.length > 0 &&
    mandatorySections.every(
      (s) => s.status === "revisada" || s.status === "aprovada",
    );
  if (allMandatoryReviewed) return "revisado";

  const anyContent = doc.sections.some((s) =>
    s.blocks.some((b) => b.content.trim().length > 0),
  );
  const anyActivity = doc.sections.some(
    (s) => s.status !== "nao_iniciada",
  );
  if (anyContent && anyActivity) return "em_revisao";
  if (anyContent) return "em_revisao";
  return "rascunho";
}

export function computeReviewSummary(doc: ReportDocument): ReportReviewSummary {
  const cov = computeSectionsCoverage(doc);
  const pendings = computePendingItems(doc);
  const totalBlocks = doc.sections.reduce((n, s) => n + s.blocks.length, 0);
  const blocksUnreviewed = doc.sections.reduce(
    (n, s) => n + s.blocks.filter((b) => !b.reviewed).length,
    0,
  );
  const blocksEmpty = doc.sections.reduce(
    (n, s) => n + s.blocks.filter((b) => isBlockEmpty(b.content)).length,
    0,
  );
  const blocksWithoutSources = doc.sections.reduce(
    (n, s) => n + s.blocks.filter((b) => b.sources.length === 0).length,
    0,
  );
  const totalSources = doc.sections.reduce(
    (n, s) => n + s.blocks.reduce((m, b) => m + b.sources.length, 0),
    0,
  );
  const blockingCount = pendings.filter((p) => p.severity === "impeditivo").length;
  const warningCount = pendings.filter((p) => p.severity === "aviso").length;
  const generalStatus = computeGeneralStatus(doc, pendings);
  return {
    totalSections: doc.sections.length,
    sectionsNotStarted: cov.notStarted,
    sectionsInProgress: cov.inProgress,
    sectionsReviewed: cov.reviewed,
    sectionsApproved: cov.approved,
    totalBlocks,
    blocksUnreviewed,
    blocksEmpty,
    blocksWithoutSources,
    totalSources,
    blockingCount,
    warningCount,
    pendings,
    generalStatus,
    canApproveExport: generalStatus === "aprovado_demonstrativo",
    canExportReviewed: blockingCount === 0,
  };
}

export function canApproveSection(section: ReportSection): {
  readonly ok: boolean;
  readonly reason?: string;
} {
  if (section.blocks.length === 0)
    return { ok: false, reason: "Seção vazia não pode ser aprovada." };
  if (section.blocks.some((b) => b.content.trim().length === 0))
    return { ok: false, reason: "Existem blocos sem conteúdo." };
  if (section.blocks.some((b) => !b.reviewed))
    return { ok: false, reason: "Existem blocos não revisados." };
  return { ok: true };
}
