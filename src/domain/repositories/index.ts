/**
 * LV-17 — Contratos de repositórios preparados para a LV-18.
 *
 * IMPORTANTE:
 *   - Contêm APENAS interfaces e adaptadores mock que delegam para as
 *     stores em memória já existentes.
 *   - NÃO existe HTTP, `fetch`, Supabase, autenticação nem persistência.
 *   - A LV-18 poderá substituir os adaptadores mock por implementações
 *     reais sem alterar os componentes de UI.
 */

import {
  createReport,
  getReport,
  getReportsSnapshot,
  isReportFrozen,
  listReports,
  listReportVersions,
  subscribeReports,
  subscribeReportVersions,
} from "@/features/reports/report-mock-store";
import type {
  ReportDocument,
  ReportListSummary,
  ReportVersion,
} from "@/features/reports/report-types";

/** Assinatura de listener para stores observáveis. */
export type Unsubscribe = () => void;

export interface ReadRepository<TSummary, TFull, TId extends string = string> {
  list(): readonly TSummary[];
  getById(id: TId): TFull | undefined;
  subscribe(listener: () => void): Unsubscribe;
}

export interface ReportRepository
  extends ReadRepository<ReportListSummary, ReportDocument> {
  create(input: { title: string; templateId: string; caseId?: string }): ReportDocument;
  isFrozen(reportId: string): boolean;
}

export interface ReportVersionRepository {
  listForReport(reportId: string): readonly ReportVersion[];
  subscribe(listener: () => void): Unsubscribe;
}

// Contratos declarativos para módulos que ainda não expõem repositório dedicado.
// A implementação ativa continua sendo as stores existentes. A LV-18 fará a ligação.
export interface CaseRepository {
  list(): readonly unknown[];
  getById(id: string): unknown;
}

export interface InterviewRepository {
  list(): readonly unknown[];
  getById(id: string): unknown;
}

export interface DocumentRepository {
  list(): readonly unknown[];
  getById(id: string): unknown;
}

export type Repositories = Readonly<{
  reports: ReportRepository;
  reportVersions: ReportVersionRepository;
}>;

let cached: Repositories | null = null;

/**
 * Retorna adaptadores mock para as stores existentes. Uso exclusivo em UI
 * que quiser adotar o novo contrato — a store direta continua funcionando.
 */
export function getMockRepositories(): Repositories {
  if (cached) return cached;
  const reports: ReportRepository = {
    list: () => listReports(),
    getById: (id) => getReport(id),
    subscribe: (listener) => subscribeReports(listener),
    create: (input) =>
      createReport({
        title: input.title,
        templateId: input.templateId,
        caseId: input.caseId,
      }),
    isFrozen: (id) => isReportFrozen(id),
  };
  const reportVersions: ReportVersionRepository = {
    listForReport: (reportId) => listReportVersions(reportId),
    subscribe: (listener) => subscribeReportVersions(listener),
  };
  cached = Object.freeze({ reports, reportVersions });
  // marca como usada em runtime (evita tree-shaking do snapshot em testes)
  void getReportsSnapshot;
  return cached;
}
