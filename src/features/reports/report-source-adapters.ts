/**
 * LV-14 — Adaptadores de leitura para fontes mock.
 *
 * Apenas leitura. Nunca modifica os módulos LV-09..LV-12. Se um módulo
 * de origem estiver indisponível no runtime (test/isolamento), o adaptador
 * retorna lista vazia — o vínculo continua sendo uma referência visual.
 */

import type { ReportSourceKind } from "./report-types";

export type ReportSourceCandidate = {
  readonly kind: ReportSourceKind;
  readonly refId: string;
  readonly label: string;
  readonly hint?: string;
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Coleta candidatos de origem para o caso informado, agrupados por tipo.
 * Filtra por caseId quando o módulo expõe o vínculo; caso contrário, mostra
 * todos os itens disponíveis apenas como referência.
 */
export function collectSourceCandidates(
  caseId: string,
): Readonly<Record<ReportSourceKind, readonly ReportSourceCandidate[]>> {
  return {
    entrevista: safe(() => loadInterviews(caseId), []),
    diligencia: safe(() => loadDiligences(caseId), []),
    documento: safe(() => loadDocuments(caseId), []),
    quesito: safe(() => loadQuestions(caseId), []),
    evidencia: safe(() => loadEvidences(caseId), []),
  };
}

// ---- Loaders individuais ----

type Loader = (caseId: string) => readonly ReportSourceCandidate[];

const loadInterviews: Loader = (caseId) => {
  // Import dinâmico via require-like: evitamos ciclo de tipos usando "unknown".
  const mod = requireOptional("@/features/interviews/interview-mock-store") as
    | { listInterviews?: () => readonly InterviewLike[] }
    | undefined;
  if (!mod?.listInterviews) return [];
  return mod
    .listInterviews()
    .filter((i) => (i.caseId ? i.caseId === caseId : true))
    .filter((i) => (i.kind ? i.kind === "interview" : true))
    .map((i) => ({
      kind: "entrevista" as const,
      refId: i.id,
      label: i.title ?? `Entrevista ${i.id}`,
      hint: i.subjectLabel,
    }));
};

const loadDiligences: Loader = (caseId) => {
  const mod = requireOptional("@/features/interviews/interview-mock-store") as
    | { listInterviews?: () => readonly InterviewLike[] }
    | undefined;
  if (!mod?.listInterviews) return [];
  return mod
    .listInterviews()
    .filter((i) => (i.caseId ? i.caseId === caseId : true))
    .filter((i) => i.kind === "diligence")
    .map((i) => ({
      kind: "diligencia" as const,
      refId: i.id,
      label: i.title ?? `Diligência ${i.id}`,
      hint: i.subjectLabel,
    }));
};

const loadDocuments: Loader = (caseId) => {
  const mod = requireOptional("@/features/documents/document-mock-store") as
    | { listDocuments?: () => readonly DocumentLike[] }
    | undefined;
  if (!mod?.listDocuments) return [];
  return mod
    .listDocuments()
    .filter((d) => (d.caseId ? d.caseId === caseId : true))
    .map((d) => ({
      kind: "documento" as const,
      refId: d.id,
      label: d.title ?? d.filename ?? `Documento ${d.id}`,
      hint: d.filename,
    }));
};

const loadQuestions: Loader = (caseId) => {
  const mod = requireOptional("@/features/questions-evidence/question-mock-store") as
    | { listQuestions?: () => readonly QuestionLike[] }
    | undefined;
  if (!mod?.listQuestions) return [];
  return mod
    .listQuestions()
    .filter((q) => (q.caseId ? q.caseId === caseId : true))
    .map((q) => ({
      kind: "quesito" as const,
      refId: q.id,
      label: q.statement
        ? shorten(q.statement, 80)
        : q.label ?? `Quesito ${q.id}`,
      hint: q.origin,
    }));
};

const loadEvidences: Loader = (caseId) => {
  const mod = requireOptional("@/features/questions-evidence/question-mock-store") as
    | { listEvidences?: () => readonly EvidenceLike[] }
    | undefined;
  if (!mod?.listEvidences) return [];
  return mod
    .listEvidences()
    .filter((e) => (e.caseId ? e.caseId === caseId : true))
    .map((e) => ({
      kind: "evidencia" as const,
      refId: e.id,
      label: e.label ?? e.title ?? `Evidência ${e.id}`,
      hint: e.type,
    }));
};

// ---- Estruturas duck-typed (evitam acoplamento rígido) ----

type InterviewLike = {
  id: string;
  caseId?: string;
  title?: string;
  subjectLabel?: string;
  kind?: "interview" | "diligence";
};
type DocumentLike = {
  id: string;
  caseId?: string;
  title?: string;
  filename?: string;
};
type QuestionLike = {
  id: string;
  caseId?: string;
  statement?: string;
  label?: string;
  origin?: string;
};
type EvidenceLike = {
  id: string;
  caseId?: string;
  label?: string;
  title?: string;
  type?: string;
};

function shorten(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/**
 * Import opcional isolado — se o módulo não estiver disponível (bundler
 * resolvendo lazy, ou ausente em teste), retorna undefined sem lançar.
 *
 * O tsgo com moduleResolution=bundler exige que o path exista; por isso
 * usamos um mapeador local com as duas entradas conhecidas.
 */
function requireOptional(id: string): unknown {
  try {
    // Em ambiente Node/Vite dev, `require` não existe; usamos import.meta.glob.
    return SYNC_MODULES[id];
  } catch {
    return undefined;
  }
}

// Registro estático — importado eagerly, mas somente leitura.
// Como estes módulos JÁ existem no projeto (LV-09..LV-12), o import é seguro.
import * as interviewStore from "@/features/interviews/interview-mock-store";
import * as documentStore from "@/features/documents/document-mock-store";
import * as questionStore from "@/features/questions-evidence/question-mock-store";

const SYNC_MODULES: Record<string, unknown> = {
  "@/features/interviews/interview-mock-store": interviewStore,
  "@/features/documents/document-mock-store": documentStore,
  "@/features/questions-evidence/question-mock-store": questionStore,
};
