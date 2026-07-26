/**
 * LV-17 — Reset da demonstração.
 *
 * Restaura em cadeia todas as stores mock que possuem função `reset*Store`
 * documentada. Sem `localStorage`, sem `sessionStorage`, sem rede.
 *
 * Este reset atua sobre as stores de laudos, entrevistas, copiloto e
 * modelos de laudo (LV-18) — incluindo suas stores auxiliares de versões
 * e histórico append-only, restauradas em cadeia por
 * `resetReportTemplateStore`. As fixtures do domínio
 * (`createMockDomainEnvironment`) são reconstruídas a cada montagem de
 * `MockDomainProvider`, portanto não precisam de reset global — recarregar
 * o painel ou navegar já cobre esse caso.
 */

import { resetReportStore } from "@/features/reports/report-mock-store";
import { resetInterviewStore } from "@/features/interviews/interview-mock-store";
import { resetCopilotStore } from "@/features/copilot/copilot-mock-store";
import { reportTemplateRepository } from "@/features/report-templates/report-template-composition";
import { logDemo } from "./logger";

export function resetDemoData(): void {
  resetReportStore();
  resetInterviewStore();
  resetCopilotStore();
  resetReportTemplateStore();
  logDemo("reset", "Estado demonstrativo restaurado");
}
