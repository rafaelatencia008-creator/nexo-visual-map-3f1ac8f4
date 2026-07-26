/**
 * LV-18.4 / LV-18.6 — Hooks de assinatura das stores de modelos de laudo.
 * Uso exclusivo de `useSyncExternalStore` para evitar cópias mutáveis
 * do estado dentro dos componentes. Os hooks leem via repositório
 * padrão, desacoplando a UI das stores concretas.
 */
import { useSyncExternalStore } from "react";
import { reportTemplateRepository } from "./report-template-composition";
import type { ReportTemplateRepository } from "./report-template-repository";

export function useReportTemplatesSnapshot(
  repository: ReportTemplateRepository = reportTemplateRepository,
) {
  return useSyncExternalStore(
    (cb) => repository.subscribe(cb),
    () => repository.getSnapshot(),
    () => repository.getSnapshot(),
  );
}

export function useReportTemplatesHistorySnapshot(
  repository: ReportTemplateRepository = reportTemplateRepository,
) {
  return useSyncExternalStore(
    (cb) => repository.subscribeHistory(cb),
    () => repository.getHistorySnapshot(),
    () => repository.getHistorySnapshot(),
  );
}

export function useReportTemplatesVersionsSnapshot(
  repository: ReportTemplateRepository = reportTemplateRepository,
) {
  return useSyncExternalStore(
    (cb) => repository.subscribeVersions(cb),
    () => repository.getVersionSnapshot(),
    () => repository.getVersionSnapshot(),
  );
}
