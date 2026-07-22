/**
 * LV-08.1 — modelo funcional puro da lista de Processos.
 *
 * Somente TypeScript. Nenhum React, storage ou rede. Toda a rotulagem,
 * o mapeamento de erros e a construção do `CaseListRequest` vivem aqui,
 * mantendo a rota livre de lógica de domínio.
 */

import {
  CASE_STATUSES,
  CONFIDENTIALITY_LEVELS,
  type Case,
  type CaseStatus,
  type ConfidentialityLevel,
} from "@/domain/core/case";
import type { CaseListRequest } from "@/domain/services/case-service";
import type { CaseFilter, CaseSortField } from "@/domain/services/inputs";
import type { PageRequest, SortDirection } from "@/domain/services/pagination";
import type { ServiceError } from "@/domain/services/result";

// ---- Rotulagem oficial (11 status + 3 níveis) ------------------------------

export const CASE_STATUS_LABELS_PT: Readonly<Record<CaseStatus, string>> = {
  draft: "Rascunho",
  triage: "Triagem",
  active: "Ativo",
  diligence: "Diligências",
  drafting: "Em elaboração",
  review: "Em revisão",
  completed: "Concluído",
  delivered: "Entregue",
  clarifications: "Esclarecimentos",
  archived: "Arquivado",
  cancelled: "Cancelado",
};

export const CONFIDENTIALITY_LABELS_PT: Readonly<
  Record<ConfidentialityLevel, string>
> = {
  standard: "Padrão",
  restricted: "Restrito",
  high: "Alto sigilo",
};

// ---- Ordenações disponíveis para a interface -------------------------------

export type ProcessSortOption = Readonly<{
  id: string;
  label: string;
  sortBy: CaseSortField;
  sortDir: SortDirection;
}>;

export const PROCESS_SORT_OPTIONS: readonly ProcessSortOption[] = [
  { id: "updated-desc", label: "Atualizados recentemente", sortBy: "updatedAt", sortDir: "desc" },
  { id: "created-asc", label: "Mais antigos", sortBy: "createdAt", sortDir: "asc" },
  { id: "reference-asc", label: "Referência A–Z", sortBy: "reference", sortDir: "asc" },
  { id: "title-asc", label: "Título A–Z", sortBy: "title", sortDir: "asc" },
  { id: "status-asc", label: "Status", sortBy: "status", sortDir: "asc" },
] as const;

export const DEFAULT_SORT_ID: string = PROCESS_SORT_OPTIONS[0]!.id;
export const PROCESS_PAGE_LIMIT = 8;

export function getSortOption(id: string): ProcessSortOption {
  const found = PROCESS_SORT_OPTIONS.find((o) => o.id === id);
  return found ?? PROCESS_SORT_OPTIONS[0]!;
}

// ---- Construção pura da requisição -----------------------------------------

export type ProcessListFilterInput = Readonly<{
  search: string;
  status: CaseStatus | "all";
  confidentiality: ConfidentialityLevel | "all";
  sortId: string;
  cursor?: string;
  limit?: number;
}>;

export function buildCaseListRequest(
  input: ProcessListFilterInput,
): CaseListRequest {
  const filter: Record<string, unknown> = {};
  const term = input.search.trim();
  if (term.length > 0) filter.search = term;
  if (input.status !== "all") filter.statuses = [input.status];
  if (input.confidentiality !== "all") {
    filter.confidentiality = [input.confidentiality];
  }
  const sort = getSortOption(input.sortId);
  const limit = input.limit ?? PROCESS_PAGE_LIMIT;
  const page: PageRequest =
    input.cursor !== undefined
      ? { limit, cursor: input.cursor }
      : { limit };
  const req: {
    page: PageRequest;
    sortBy: CaseSortField;
    sortDir: SortDirection;
    filter?: CaseFilter;
  } = { page, sortBy: sort.sortBy, sortDir: sort.sortDir };
  if (Object.keys(filter).length > 0) {
    req.filter = filter as CaseFilter;
  }
  return req;
}

// ---- Mapeamento público de erros -------------------------------------------

export function mapServiceErrorToMessage(error: ServiceError): string {
  switch (error.code) {
    case "unauthorized":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "forbidden":
      return "Você não tem permissão para visualizar estes processos.";
    case "offline":
      return "Você está sem conexão no momento. Verifique sua rede e tente novamente.";
    case "unavailable":
      return "O serviço está temporariamente indisponível. Tente novamente em instantes.";
    case "validation_error":
      return "Não foi possível aplicar os filtros informados. Ajuste a busca e tente novamente.";
    case "not_found":
    case "conflict":
    case "internal_error":
    default:
      return "Não foi possível carregar os processos.";
  }
}

// ---- Indicação resumida de prontidão (não substitui LV-08.3) ---------------

export type ProcessReadinessHint = "ready" | "review";

export function summarizeReadiness(c: Case): ProcessReadinessHint {
  if (
    c.objectDefined === true &&
    c.deadlineStatus !== "not_reviewed" &&
    c.conflictCheck !== "not_reviewed"
  ) {
    return "ready";
  }
  return "review";
}

export const READINESS_HINT_LABELS: Readonly<Record<ProcessReadinessHint, string>> = {
  ready: "Pronto para avançar",
  review: "Revisão necessária",
};

// ---- Guardas em tempo de módulo --------------------------------------------

{
  // Garante que as tabelas visuais permaneçam sincronizadas com o catálogo
  // oficial do domínio — se um novo status for adicionado ao domínio, o
  // build falha aqui até a etiqueta ser incluída.
  for (const s of CASE_STATUSES) {
    if (!(s in CASE_STATUS_LABELS_PT)) {
      throw new Error(`CASE_STATUS_LABELS_PT: falta ${s}`);
    }
  }
  for (const c of CONFIDENTIALITY_LEVELS) {
    if (!(c in CONFIDENTIALITY_LABELS_PT)) {
      throw new Error(`CONFIDENTIALITY_LABELS_PT: falta ${c}`);
    }
  }
}
