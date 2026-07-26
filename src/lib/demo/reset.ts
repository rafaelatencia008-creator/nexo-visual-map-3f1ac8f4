/**
 * LV-17 — Reset da demonstração.
 *
 * Restaura em cadeia todas as stores mock que possuem função `reset*Store`
 * documentada. Sem `localStorage`, sem `sessionStorage`, sem rede.
 *
 * Este reset atua apenas sobre as stores de laudos, entrevistas e copiloto,
 * que são as stores que aceitam mutação livre pelo usuário na demonstração.
 * As fixtures do domínio (`createMockDomainEnvironment`) são reconstruídas
 * a cada montagem de `MockDomainProvider`, portanto não precisam de reset
 * global — recarregar o painel ou navegar já cobre esse caso.
 */

import { resetReportStore } from "@/features/reports/report-mock-store";
import { resetInterviewStore } from "@/features/interviews/interview-mock-store";
import { resetCopilotStore } from "@/features/copilot/copilot-mock-store";
import { logDemo } from "./logger";

export function resetDemoData(): void {
  resetReportStore();
  resetInterviewStore();
  resetCopilotStore();
  logDemo("reset", "Estado demonstrativo restaurado");
}
