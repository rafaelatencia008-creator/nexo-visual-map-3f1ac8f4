/**
 * LV-14 — Adaptadores de leitura para fontes mock.
 *
 * Apenas leitura. Nunca modifica os módulos LV-09..LV-12.
 * Se um módulo estiver vazio no runtime, o adaptador devolve lista vazia.
 */

import { listInterviewRecords } from "@/features/interviews/interview-mock-store";
import { listDocuments } from "@/features/documents/document-mock-store";
import { listQuestions } from "@/features/questions-evidence/question-mock-store";
import type { ReportSourceKind } from "./report-types";

export type ReportSourceCandidate = {
  readonly kind: ReportSourceKind;
  readonly refId: string;
  readonly label: string;
  readonly hint?: string;
};

function shorten(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function matchCase(candidateCaseId: string | undefined, caseId: string): boolean {
  // Sem vínculo => sempre listável como referência.
  if (!candidateCaseId) return true;
  return candidateCaseId === caseId;
}

export function loadInterviewCandidates(
  caseId: string,
): readonly ReportSourceCandidate[] {
  return listInterviewRecords()
    .filter((r) => r.kind === "entrevista" && matchCase(r.caseId, caseId))
    .map((r) => ({
      kind: "entrevista" as const,
      refId: r.id,
      label: r.title,
      hint: r.responsibleLabel,
    }));
}

export function loadDiligenceCandidates(
  caseId: string,
): readonly ReportSourceCandidate[] {
  return listInterviewRecords()
    .filter((r) => r.kind === "diligencia" && matchCase(r.caseId, caseId))
    .map((r) => ({
      kind: "diligencia" as const,
      refId: r.id,
      label: r.title,
      hint: r.responsibleLabel,
    }));
}

export function loadDocumentCandidates(
  caseId: string,
): readonly ReportSourceCandidate[] {
  return listDocuments()
    .filter((d) => matchCase(d.caseId, caseId))
    .map((d) => ({
      kind: "documento" as const,
      refId: d.id,
      label: d.name,
      hint: d.category,
    }));
}

export function loadQuestionCandidates(
  caseId: string,
): readonly ReportSourceCandidate[] {
  return listQuestions()
    .filter((q) => matchCase(q.caseId, caseId))
    .map((q) => ({
      kind: "quesito" as const,
      refId: q.id,
      label: shorten(q.text, 100),
      hint: q.originLabel ?? q.origin,
    }));
}

export function loadEvidenceCandidates(
  caseId: string,
): readonly ReportSourceCandidate[] {
  const out: ReportSourceCandidate[] = [];
  for (const q of listQuestions()) {
    if (!matchCase(q.caseId, caseId)) continue;
    for (const link of q.evidenceLinks) {
      out.push({
        kind: "evidencia",
        refId: link.id,
        label: shorten(link.sourceLabel, 100),
        hint: link.evidenceType,
      });
    }
  }
  return out;
}

/**
 * Coleta todos os candidatos por tipo para o caso informado.
 */
export function collectSourceCandidates(
  caseId: string,
): Readonly<Record<ReportSourceKind, readonly ReportSourceCandidate[]>> {
  return {
    entrevista: loadInterviewCandidates(caseId),
    diligencia: loadDiligenceCandidates(caseId),
    documento: loadDocumentCandidates(caseId),
    quesito: loadQuestionCandidates(caseId),
    evidencia: loadEvidenceCandidates(caseId),
  };
}
