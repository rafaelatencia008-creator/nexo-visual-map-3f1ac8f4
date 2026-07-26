/**
 * LV-15 — Exportação estritamente local do documento pericial.
 *
 * Regras:
 *  - Nenhuma chamada de rede.
 *  - Nenhum acesso a servidor.
 *  - Marca "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE" obrigatória.
 *  - Se houver pendência impeditiva, apenas exportação como "rascunho".
 */

import {
  REPORT_GENERAL_STATUS_LABEL,
  REPORT_SECTION_STATUS_LABEL,
  REPORT_SOURCE_KIND_LABEL,
  REPORT_TEMPLATE_LABEL,
  REPORT_WATERMARK,
  type ReportDocument,
  type ReportExportFormat,
  type ReportExportMode,
} from "./report-types";
import { computeReviewSummary } from "./report-review";

export type ReportExportPayload = {
  readonly filename: string;
  readonly mime: string;
  readonly content: string;
  readonly format: ReportExportFormat;
  readonly mode: ReportExportMode;
  readonly watermark: string;
};

export type ReportExportDecision =
  | { readonly ok: true; readonly payload: ReportExportPayload }
  | { readonly ok: false; readonly reason: string };

function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "documento"
  );
}

function safeFilename(doc: ReportDocument, ext: string): string {
  return `${slug(doc.title || "documento")}-${doc.id}.${ext}`;
}

export function documentToTxt(doc: ReportDocument): string {
  const summary = computeReviewSummary(doc);
  const lines: string[] = [];
  lines.push(REPORT_WATERMARK);
  lines.push("");
  lines.push(`Título: ${doc.title}`);
  lines.push(`Modelo: ${REPORT_TEMPLATE_LABEL[doc.templateId]}`);
  lines.push(`Perícia: ${doc.caseLabel} (${doc.caseId})`);
  lines.push(`Criado em: ${doc.createdAt}`);
  lines.push(`Atualizado em: ${doc.updatedAt}`);
  lines.push(`Status geral: ${REPORT_GENERAL_STATUS_LABEL[summary.generalStatus]}`);
  lines.push("");
  for (const s of doc.sections) {
    lines.push(`## ${s.title} — ${REPORT_SECTION_STATUS_LABEL[s.status]}`);
    if (s.blocks.length === 0) {
      lines.push("(seção sem blocos)");
    }
    for (const b of s.blocks) {
      lines.push(`### ${b.title}`);
      lines.push(b.content.trim().length ? b.content : "(sem conteúdo)");
      if (b.sources.length > 0) {
        lines.push("Fontes:");
        for (const src of b.sources) {
          lines.push(
            `  - ${REPORT_SOURCE_KIND_LABEL[src.kind]}: ${src.label} (${src.refId})`,
          );
        }
      }
      lines.push("");
    }
    lines.push("");
  }
  lines.push(REPORT_WATERMARK);
  return lines.join("\n");
}

export function documentToJson(doc: ReportDocument): string {
  const summary = computeReviewSummary(doc);
  const payload = {
    watermark: REPORT_WATERMARK,
    document: doc,
    review: {
      generalStatus: summary.generalStatus,
      blockingCount: summary.blockingCount,
      warningCount: summary.warningCount,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function prepareExport(
  doc: ReportDocument,
  format: ReportExportFormat,
  mode: ReportExportMode,
): ReportExportDecision {
  const summary = computeReviewSummary(doc);
  if (mode === "revisada" && summary.blockingCount > 0) {
    return {
      ok: false,
      reason:
        "Exportação como 'versão revisada' bloqueada: existem pendências impeditivas.",
    };
  }
  if (format === "print") {
    return {
      ok: true,
      payload: {
        filename: safeFilename(doc, "html"),
        mime: "text/html",
        content: documentToTxt(doc),
        format,
        mode,
        watermark: REPORT_WATERMARK,
      },
    };
  }
  if (format === "txt") {
    return {
      ok: true,
      payload: {
        filename: safeFilename(doc, "txt"),
        mime: "text/plain;charset=utf-8",
        content: documentToTxt(doc),
        format,
        mode,
        watermark: REPORT_WATERMARK,
      },
    };
  }
  return {
    ok: true,
    payload: {
      filename: safeFilename(doc, "json"),
      mime: "application/json",
      content: documentToJson(doc),
      format,
      mode,
      watermark: REPORT_WATERMARK,
    },
  };
}

// ============================================================================
// LV-16 — Exportação de versões (snapshot imutável)
// ============================================================================

import type {
  ReportChecklist,
  ReportChecklistItemId,
  ReportVersion,
} from "./report-types";
import { REPORT_CHECKLIST_LABEL, REPORT_CHECKLIST_ORDER, REPORT_VERSION_TYPE_LABEL, REPORT_VERSION_STATUS_LABEL, REPORT_GENERAL_STATUS_LABEL as GS_LABEL } from "./report-types";

function checklistLines(cl: ReportChecklist): string[] {
  const out: string[] = ["Checklist:"];
  for (const k of REPORT_CHECKLIST_ORDER) {
    out.push(`  [${cl[k] ? "x" : " "}] ${REPORT_CHECKLIST_LABEL[k]}`);
  }
  return out;
}

export function versionToTxt(v: ReportVersion): string {
  const lines: string[] = [];
  lines.push(v.watermark);
  lines.push("");
  lines.push(`Snapshot imutável da versão`);
  lines.push(`Versão nº ${v.number} — ${REPORT_VERSION_TYPE_LABEL[v.type]} (${REPORT_VERSION_STATUS_LABEL[v.status]})`);
  lines.push(`Título: ${v.title}`);
  lines.push(`Modelo: ${v.templateId}`);
  lines.push(`Perícia: ${v.caseLabel} (${v.caseId})`);
  lines.push(`Autor: ${v.authorLabel}`);
  lines.push(`Criada em: ${v.createdAt}`);
  lines.push(`Motivo: ${v.reason}`);
  lines.push(`Status geral no momento: ${GS_LABEL[v.generalStatus]}`);
  lines.push(`Pendências no momento: ${v.pendingCount}`);
  lines.push("");
  lines.push(...checklistLines(v.snapshot.checklist));
  lines.push("");
  for (const s of v.snapshot.document.sections) {
    lines.push(`## ${s.title}`);
    if (s.blocks.length === 0) lines.push("(seção sem blocos)");
    for (const b of s.blocks) {
      lines.push(`### ${b.title}`);
      lines.push(b.content.trim().length ? b.content : "(sem conteúdo)");
      if (b.sources.length > 0) {
        lines.push("Fontes:");
        for (const src of b.sources) {
          lines.push(`  - ${src.kind}: ${src.label} (${src.refId})`);
        }
      }
      lines.push("");
    }
    lines.push("");
  }
  lines.push(v.watermark);
  return lines.join("\n");
}

export function versionToJson(v: ReportVersion): string {
  return JSON.stringify(
    {
      watermark: v.watermark,
      snapshotOfVersion: v.number,
      versionType: v.type,
      versionStatus: v.status,
      demonstrative: true,
      version: v,
    },
    null,
    2,
  );
}

export type ReportVersionExportDecision =
  | { readonly ok: true; readonly payload: ReportExportPayload; readonly version: ReportVersion }
  | { readonly ok: false; readonly reason: string };

function versionSlug(v: ReportVersion, ext: string): string {
  const base = v.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "documento";
  return `${base}-v${v.number}.${ext}`;
}

export function prepareVersionExport(
  v: ReportVersion,
  format: "txt" | "json" | "print",
): ReportVersionExportDecision {
  if (format === "json") {
    return {
      ok: true,
      version: v,
      payload: {
        filename: versionSlug(v, "json"),
        mime: "application/json",
        content: versionToJson(v),
        format,
        mode: "revisada",
        watermark: v.watermark,
      },
    };
  }
  const content = versionToTxt(v);
  return {
    ok: true,
    version: v,
    payload: {
      filename: versionSlug(v, format === "print" ? "html" : "txt"),
      mime: format === "print" ? "text/html" : "text/plain;charset=utf-8",
      content,
      format,
      mode: "revisada",
      watermark: v.watermark,
    },
  };
}
