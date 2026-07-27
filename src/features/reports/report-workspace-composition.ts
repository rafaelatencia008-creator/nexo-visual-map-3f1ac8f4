/**
 * LV-19.1 — Composição da instância padrão de `ReportWorkspaceRepository`.
 *
 * Um único ponto exporta a instância injetada por padrão nos casos de uso
 * (padrão LV-18.6). Testes e módulos alternativos podem construir a sua
 * própria via `createInMemoryReportWorkspaceRepository`.
 */

import { createInMemoryReportWorkspaceRepository } from "./report-workspace-memory-repository";
import type { ReportWorkspaceRepository } from "./report-workspace-repository";

export const reportWorkspaceRepository: ReportWorkspaceRepository =
  createInMemoryReportWorkspaceRepository();
