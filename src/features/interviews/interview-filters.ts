/**
 * LV-11 — Filtros, pesquisa e derivações puras.
 */

import { processos } from "@/lib/mock/data";
import type {
  DiligenceRecord,
  InterviewRecord,
  InterviewStatus,
  ModuleRecord,
} from "./interview-types";

export type InterviewTabKind = "todos" | "entrevistas" | "diligencias";

export type InterviewFilters = Readonly<{
  query: string;
  tab: InterviewTabKind;
  status: InterviewStatus | "todas";
  caseId: string | "todos";
  responsibleLabel: string | "todos";
  periodStart?: string;
  periodEnd?: string;
}>;

export const EMPTY_INTERVIEW_FILTERS: InterviewFilters = {
  query: "",
  tab: "todos",
  status: "todas",
  caseId: "todos",
  responsibleLabel: "todos",
};

export function hasActiveInterviewFilters(f: InterviewFilters): boolean {
  return (
    f.query.trim().length > 0 ||
    f.status !== "todas" ||
    f.caseId !== "todos" ||
    f.responsibleLabel !== "todos" ||
    Boolean(f.periodStart) ||
    Boolean(f.periodEnd)
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

export function matchesSearchRecord(record: ModuleRecord, rawQuery: string): boolean {
  const q = normalizeSearch(rawQuery);
  if (!q) return true;
  const parts: string[] = [
    record.title,
    record.responsibleLabel,
    getCaseNumberLabel(record.caseId),
    record.status,
  ];
  if (record.kind === "diligencia") {
    parts.push(record.address ?? "");
    parts.push(record.objective ?? "");
  } else {
    for (const b of record.transcriptBlocks) {
      parts.push(b.personLabel);
    }
    for (const note of record.notes) {
      parts.push(note.text.slice(0, 200));
    }
  }
  const haystack = normalizeSearch(parts.join(" \n "));
  return haystack.includes(q);
}

function inPeriod(record: ModuleRecord, start?: string, end?: string): boolean {
  const ref = record.scheduledAt ?? record.startedAt ?? record.createdAt;
  if (!ref) return true;
  const t = new Date(ref).getTime();
  if (Number.isNaN(t)) return true;
  if (start) {
    const s = new Date(start + "T00:00:00Z").getTime();
    if (t < s) return false;
  }
  if (end) {
    const e = new Date(end + "T23:59:59Z").getTime();
    if (t > e) return false;
  }
  return true;
}

export function applyInterviewFilters(
  records: readonly ModuleRecord[],
  filters: InterviewFilters,
): ModuleRecord[] {
  return records.filter((r) => {
    if (filters.tab === "entrevistas" && r.kind !== "entrevista") return false;
    if (filters.tab === "diligencias" && r.kind !== "diligencia") return false;
    if (filters.status !== "todas" && r.status !== filters.status) return false;
    if (filters.caseId !== "todos" && r.caseId !== filters.caseId) return false;
    if (filters.responsibleLabel !== "todos" && r.responsibleLabel !== filters.responsibleLabel) {
      return false;
    }
    if (!inPeriod(r, filters.periodStart, filters.periodEnd)) return false;
    if (!matchesSearchRecord(r, filters.query)) return false;
    return true;
  });
}

export function countByStatus(records: readonly ModuleRecord[]): {
  agendadas: number;
  emAndamento: number;
  concluidas: number;
  comPendencia: number;
} {
  let a = 0,
    e = 0,
    c = 0,
    p = 0;
  for (const r of records) {
    if (r.status === "agendada") a += 1;
    else if (r.status === "em_andamento") e += 1;
    else if (r.status === "concluida") c += 1;
    else if (r.status === "com_pendencia") p += 1;
  }
  return { agendadas: a, emAndamento: e, concluidas: c, comPendencia: p };
}

export function isInterview(r: ModuleRecord): r is InterviewRecord {
  return r.kind === "entrevista";
}

export function isDiligence(r: ModuleRecord): r is DiligenceRecord {
  return r.kind === "diligencia";
}

// Validação simples de formulário (retorna erros por campo)
export type FormErrors = Record<string, string>;

export function validateInterviewForm(input: {
  title: string;
  responsibleLabel: string;
  participantIds: readonly string[];
  templateId: string;
}): FormErrors {
  const errors: FormErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = "Informe um título.";
  else if (title.length > 160) errors.title = "Título muito longo.";
  if (!input.responsibleLabel.trim()) errors.responsibleLabel = "Informe o responsável.";
  if (input.participantIds.length === 0) {
    errors.participantIds = "Selecione ao menos um participante.";
  }
  if (!input.templateId) errors.templateId = "Selecione um roteiro.";
  return errors;
}

export function validateDiligenceForm(input: {
  title: string;
  responsibleLabel: string;
  address: string;
}): FormErrors {
  const errors: FormErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = "Informe um título.";
  else if (title.length > 160) errors.title = "Título muito longo.";
  if (!input.responsibleLabel.trim()) errors.responsibleLabel = "Informe o responsável.";
  if (!input.address.trim()) errors.address = "Informe o endereço.";
  return errors;
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}
