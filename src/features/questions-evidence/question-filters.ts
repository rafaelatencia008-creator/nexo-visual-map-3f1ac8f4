/**
 * LV-12 — Filtros, pesquisa e derivações puras.
 */
import { processos } from "@/lib/mock/data";
import type {
  ExpertQuestion,
  QuestionOrigin,
  QuestionPriority,
  QuestionStatus,
} from "./question-types";

export type QuestionTab =
  | "todos"
  | "pendentes"
  | "respondidos"
  | "com_lacunas"
  | "com_divergencia"
  | "preparados";

export type DeadlineFilter = "todos" | "sem_prazo" | "no_prazo" | "vencendo" | "vencido";
export type EvidenceFilter = "todos" | "com" | "sem";
export type PrepFilter = "todos" | "preparado" | "nao_preparado";

export type QuestionFilters = Readonly<{
  query: string;
  tab: QuestionTab;
  origin: QuestionOrigin | "todas";
  status: QuestionStatus | "todas";
  priority: QuestionPriority | "todas";
  caseId: string | "todos";
  expertiseId: string | "todas";
  responsibleLabel: string | "todos";
  deadline: DeadlineFilter;
  evidence: EvidenceFilter;
  prepared: PrepFilter;
}>;

export const EMPTY_QUESTION_FILTERS: QuestionFilters = {
  query: "",
  tab: "todos",
  origin: "todas",
  status: "todas",
  priority: "todas",
  caseId: "todos",
  expertiseId: "todas",
  responsibleLabel: "todos",
  deadline: "todos",
  evidence: "todos",
  prepared: "todos",
};

export function hasActiveQuestionFilters(f: QuestionFilters): boolean {
  return (
    f.query.trim().length > 0 ||
    f.tab !== "todos" ||
    f.origin !== "todas" ||
    f.status !== "todas" ||
    f.priority !== "todas" ||
    f.caseId !== "todos" ||
    f.expertiseId !== "todas" ||
    f.responsibleLabel !== "todos" ||
    f.deadline !== "todos" ||
    f.evidence !== "todos" ||
    f.prepared !== "todos"
  );
}

export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getCaseNumberLabel(caseId: string | undefined): string {
  if (!caseId) return "";
  return processos.find((p) => p.id === caseId)?.numero ?? "";
}

export function matchesSearchQuestion(q: ExpertQuestion, rawQuery: string): boolean {
  const s = normalizeSearch(rawQuery);
  if (!s) return true;
  const parts: string[] = [
    q.text,
    q.technicalAnalysis ?? "",
    q.technicalAnswer ?? "",
    q.conclusion ?? "",
    q.observations ?? "",
    q.objective ?? "",
    q.responsibleLabel,
    q.origin,
    q.originLabel ?? "",
    getCaseNumberLabel(q.caseId),
    q.expertiseId ?? "",
    q.tags.join(" "),
  ];
  for (const l of q.evidenceLinks) {
    parts.push(l.sourceLabel);
    if (l.excerpt) parts.push(l.excerpt);
    if (l.technicalNote) parts.push(l.technicalNote);
  }
  const haystack = normalizeSearch(parts.join(" \n "));
  return haystack.includes(s);
}

export function deadlineState(
  q: ExpertQuestion,
  referenceIso: string,
): "sem_prazo" | "no_prazo" | "vencendo" | "vencido" {
  if (!q.dueAt) return "sem_prazo";
  const t = new Date(q.dueAt).getTime();
  const now = new Date(referenceIso).getTime();
  if (Number.isNaN(t)) return "sem_prazo";
  if (t < now) return "vencido";
  const days = (t - now) / 86_400_000;
  if (days <= 7) return "vencendo";
  return "no_prazo";
}

function matchesTab(q: ExpertQuestion, tab: QuestionTab): boolean {
  switch (tab) {
    case "todos":
      return true;
    case "pendentes":
      return q.status === "nao_analisado" || q.status === "em_analise" ||
             q.status === "parcial" || q.status === "sem_evidencia";
    case "respondidos":
      return q.status === "respondido" || q.status === "nao_aplicavel";
    case "com_lacunas":
      return q.gapItems.some((g) => !g.resolved);
    case "com_divergencia":
      return q.status === "com_divergencia" ||
             q.evidenceLinks.some((l) => l.contradictsAnswer);
    case "preparados":
      return q.readyForReport;
  }
}

export function applyQuestionFilters(
  records: readonly ExpertQuestion[],
  filters: QuestionFilters,
  referenceIso: string,
): ExpertQuestion[] {
  return records.filter((q) => {
    if (!matchesTab(q, filters.tab)) return false;
    if (filters.origin !== "todas" && q.origin !== filters.origin) return false;
    if (filters.status !== "todas" && q.status !== filters.status) return false;
    if (filters.priority !== "todas" && q.priority !== filters.priority) return false;
    if (filters.caseId !== "todos" && q.caseId !== filters.caseId) return false;
    if (filters.expertiseId !== "todas" && q.expertiseId !== filters.expertiseId) return false;
    if (filters.responsibleLabel !== "todos" && q.responsibleLabel !== filters.responsibleLabel)
      return false;
    if (filters.deadline !== "todos") {
      const st = deadlineState(q, referenceIso);
      if (st !== filters.deadline) return false;
    }
    if (filters.evidence === "com" && q.evidenceLinks.length === 0) return false;
    if (filters.evidence === "sem" && q.evidenceLinks.length > 0) return false;
    if (filters.prepared === "preparado" && !q.readyForReport) return false;
    if (filters.prepared === "nao_preparado" && q.readyForReport) return false;
    if (!matchesSearchQuestion(q, filters.query)) return false;
    return true;
  });
}

export function countIndicators(records: readonly ExpertQuestion[]): {
  total: number;
  respondidos: number;
  parciais: number;
  semEvidencia: number;
  comDivergencia: number;
} {
  let r = 0, p = 0, s = 0, d = 0;
  for (const q of records) {
    if (q.status === "respondido") r += 1;
    if (q.status === "parcial") p += 1;
    if (q.status === "sem_evidencia" || q.evidenceLinks.length === 0) s += 1;
    if (q.status === "com_divergencia") d += 1;
  }
  return {
    total: records.length,
    respondidos: r,
    parciais: p,
    semEvidencia: s,
    comDivergencia: d,
  };
}
