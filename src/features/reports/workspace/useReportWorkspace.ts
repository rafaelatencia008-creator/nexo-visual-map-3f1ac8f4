/**
 * LV-19.2 — Hook do workspace de elaboração de laudo.
 *
 * Único ponto de assinatura reativa da UI. Consome EXCLUSIVAMENTE a fachada
 * de casos de uso (LV-19.1). Não importa a store concreta.
 *
 * A UI (componentes do workspace) deve consumir apenas este hook e/ou
 * chamadas às funções exportadas de `report-workspace-use-cases`.
 */
import { useCallback, useSyncExternalStore } from "react";
import {
  getWorkspaceSnapshot,
  subscribeWorkspace,
  tryLocateReport,
  type ReportWorkspaceSnapshot,
} from "../report-workspace-use-cases";

/**
 * Retorna o snapshot congelado do workspace de um laudo, ou `undefined` se o
 * laudo não existir. Estabiliza referência entre renders enquanto o
 * documento subjacente não mudar (cache WeakMap da LV-19.1).
 */
export function useReportWorkspace(
  reportId: string | undefined,
): ReportWorkspaceSnapshot | undefined {
  const getSnapshot = useCallback((): ReportWorkspaceSnapshot | undefined => {
    if (!reportId) return undefined;
    if (!tryLocateReport(reportId)) return undefined;
    return getWorkspaceSnapshot(reportId);
  }, [reportId]);
  return useSyncExternalStore(subscribeWorkspace, getSnapshot, getSnapshot);
}
