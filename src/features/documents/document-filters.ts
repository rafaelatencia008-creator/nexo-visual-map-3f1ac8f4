/**
 * LV-09.3 — Filtros e pesquisa puros da biblioteca documental.
 */

import { clientes, pericias, processos } from "@/lib/mock/data";
import type {
  DocumentCategory,
  DocumentConfidentiality,
  DocumentRecord,
  DocumentStatus,
} from "./document-types";
import { computeDeadlineState } from "./document-form";

export type DeadlineFilter =
  | "todos"
  | "sem_prazo"
  | "com_prazo"
  | "vencendo"
  | "vencido";

export interface DocumentFilters {
  query: string;
  category: DocumentCategory | "todas";
  status: DocumentStatus | "todas";
  confidentiality: DocumentConfidentiality | "todas";
  caseId: string | "todos";
  deadline: DeadlineFilter;
}

export const EMPTY_FILTERS: DocumentFilters = {
  query: "",
  category: "todas",
  status: "todas",
  confidentiality: "todas",
  caseId: "todos",
  deadline: "todos",
};

export function hasActiveFilters(f: DocumentFilters): boolean {
  return (
    f.query.trim().length > 0 ||
    f.category !== "todas" ||
    f.status !== "todas" ||
    f.confidentiality !== "todas" ||
    f.caseId !== "todos" ||
    f.deadline !== "todos"
  );
}

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getCaseNumberLabel(caseId: string | undefined): string {
  if (!caseId) return "";
  const p = processos.find((x) => x.id === caseId);
  return p ? p.numero : "";
}

export function getExpertiseLabel(expertiseId: string | undefined): string {
  if (!expertiseId) return "";
  const p = pericias.find((x) => x.id === expertiseId);
  return p ? `Perícia ${p.id}` : "";
}

export function getPersonLabels(personIds: readonly string[]): string[] {
  return personIds
    .map((id) => clientes.find((c) => c.id === id)?.nome ?? "")
    .filter((s) => s.length > 0);
}

export function matchesSearch(doc: DocumentRecord, rawQuery: string): boolean {
  const q = normalize(rawQuery);
  if (q.length === 0) return true;
  const parts: string[] = [
    doc.name,
    doc.category,
    doc.responsibleLabel,
    getCaseNumberLabel(doc.caseId),
    getExpertiseLabel(doc.expertiseId),
    ...getPersonLabels(doc.personIds),
  ];
  return parts.some((p) => normalize(p).includes(q));
}

export function applyFilters(
  docs: readonly DocumentRecord[],
  filters: DocumentFilters,
  referenceIsoDate: string,
): DocumentRecord[] {
  return docs.filter((d) => {
    if (filters.category !== "todas" && d.category !== filters.category) return false;
    if (filters.status !== "todas" && d.status !== filters.status) return false;
    if (filters.confidentiality !== "todas" && d.confidentiality !== filters.confidentiality)
      return false;
    if (filters.caseId !== "todos" && d.caseId !== filters.caseId) return false;

    if (filters.deadline !== "todos") {
      const state = computeDeadlineState(d.deadlineAt, referenceIsoDate);
      if (filters.deadline === "sem_prazo" && state !== "sem_prazo") return false;
      if (filters.deadline === "com_prazo" && state === "sem_prazo") return false;
      if (
        filters.deadline === "vencendo" &&
        !(state === "vencendo" || state === "hoje")
      )
        return false;
      if (filters.deadline === "vencido" && state !== "vencido") return false;
    }

    return matchesSearch(d, filters.query);
  });
}
