/**
 * LV-18.4 — Hooks de assinatura das stores de modelos de laudo.
 * Uso exclusivo de `useSyncExternalStore` para evitar cópias mutáveis
 * do estado dentro dos componentes.
 */
import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./report-template-store";
import {
  getTemplateHistorySnapshot,
  subscribeTemplateHistory,
} from "./report-template-history-store";
import {
  getTemplateVersionsSnapshot,
  subscribeTemplateVersions,
} from "./report-template-version-store";

export function useReportTemplatesSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function useReportTemplatesHistorySnapshot() {
  return useSyncExternalStore(
    subscribeTemplateHistory,
    getTemplateHistorySnapshot,
    getTemplateHistorySnapshot,
  );
}
export function useReportTemplatesVersionsSnapshot() {
  return useSyncExternalStore(
    subscribeTemplateVersions,
    getTemplateVersionsSnapshot,
    getTemplateVersionsSnapshot,
  );
}
