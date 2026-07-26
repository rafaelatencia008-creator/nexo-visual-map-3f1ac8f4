/**
 * LV-18.6 — Ponto de composição padrão do repositório de Modelos de Laudo.
 *
 * Exporta a instância única usada pela UI e pelos casos de uso que não
 * recebem repositório por parâmetro. A implementação continua 100%
 * frontend/mock, delegando para as stores globais existentes.
 */

import { createInMemoryReportTemplateRepository } from "./report-template-memory-repository";

/** Instância padrão de `ReportTemplateRepository` para a aplicação. */
export const reportTemplateRepository = createInMemoryReportTemplateRepository();
