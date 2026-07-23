import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import {
  ProcessDetailError,
  ProcessDetailLoading,
  ProcessDetailNotFound,
} from "@/features/processos/ProcessDetailState";
import { ProcessDetailSummary } from "@/features/processos/ProcessDetailSummary";
import { ProcessPeopleRelations } from "@/features/processos/ProcessPeopleRelations";
import { ProcessPlanTimeline } from "@/features/processos/ProcessPlanTimeline";
import { ProcessAuditSnapshots } from "@/features/processos/ProcessAuditSnapshots";
import {
  ProcessReadinessChecklist,
  type ChecklistSaveResult,
} from "@/features/processos/ProcessReadinessChecklist";
import {
  mapCaseDetailError,
  type CaseChecklistUpdateInput,
  type CaseDetailPublicError,
} from "@/features/processos/process-detail-model";
import { isCaseId } from "@/domain/core/ids";
import type { Case } from "@/domain/core/case";
import type { CaseId } from "@/domain/core/ids";
import type { ServiceError } from "@/domain/services/result";
import type { CaseReadinessView } from "@/domain/services/case-service";

export const Route = createFileRoute("/app/processos/$id/")({
  head: () => ({
    meta: [
      { title: "Resumo do processo — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProcessoDetalhePage,
});

type DetailState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; error: CaseDetailPublicError }
  | { kind: "ready"; case: Case; view: CaseReadinessView; canEdit: boolean };

function ProcessoDetalhePage() {
  const params = Route.useParams();
  const rawId = params.id;
  const { environment, context } = useMockDomain();
  const [state, setState] = React.useState<DetailState>({ kind: "loading" });
  const requestIdRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAll = React.useCallback(
    async (id: CaseId) => {
      const reqId = ++requestIdRef.current;
      setState({ kind: "loading" });

      // LV-08.3.1 — as três consultas iniciais devem ser criadas
      // simultaneamente, ANTES de qualquer await, para carregarem em paralelo.
      const [caseResult, readinessResult, permissionResult] = await Promise.all([
        environment.services.cases.getById(context, id),
        environment.services.cases.getReadiness(context, id),
        environment.services.permissions.evaluate(context, {
          action: "case.update",
          caseId: id,
        }),
      ]);

      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      if (!caseResult.ok) {
        if (caseResult.error.code === "not_found") {
          setState({ kind: "notFound" });
          return;
        }
        setState({
          kind: "error",
          error: mapCaseDetailError(caseResult.error as ServiceError),
        });
        return;
      }

      if (!readinessResult.ok) {
        if (readinessResult.error.code === "not_found") {
          setState({ kind: "notFound" });
          return;
        }
        setState({
          kind: "error",
          error: mapCaseDetailError(readinessResult.error as ServiceError),
        });
        return;
      }

      // LV-08.3.1 — falha técnica do serviço de permissão NÃO pode
      // silenciosamente virar acesso somente leitura.
      if (!permissionResult.ok) {
        setState({
          kind: "error",
          error: mapCaseDetailError(permissionResult.error as ServiceError),
        });
        return;
      }

      const canEdit = permissionResult.data.allowed === true;
      setState({
        kind: "ready",
        case: caseResult.data,
        view: readinessResult.data,
        canEdit,
      });
    },
    [environment, context],
  );

  React.useEffect(() => {
    if (!isCaseId(rawId)) {
      // ID inválido: nenhum serviço é chamado.
      requestIdRef.current += 1;
      setState({ kind: "notFound" });
      return;
    }
    void loadAll(rawId);
  }, [loadAll, rawId]);

  const handleSave = React.useCallback(
    async (input: CaseChecklistUpdateInput): Promise<ChecklistSaveResult> => {
      if (state.kind !== "ready") {
        return {
          status: "error",
          error: mapCaseDetailError({
            code: "internal_error",
            message: "invalid_state",
          }),
        };
      }
      const currentCase = state.case;
      const updateResult = await environment.services.cases.update(
        context,
        currentCase.id,
        input,
      );
      if (!updateResult.ok) {
        return {
          status: "error",
          error: mapCaseDetailError(updateResult.error as ServiceError),
        };
      }
      const updated = updateResult.data;
      const readinessResult = await environment.services.cases.getReadiness(
        context,
        updated.id,
      );
      if (!mountedRef.current) return { status: "unchanged" };
      if (!readinessResult.ok) {
        setState({
          kind: "ready",
          case: updated,
          view: state.view,
          canEdit: state.canEdit,
        });
        return {
          status: "success",
          readinessError: mapCaseDetailError(
            readinessResult.error as ServiceError,
          ).message,
        };
      }
      setState({
        kind: "ready",
        case: updated,
        view: readinessResult.data,
        canEdit: state.canEdit,
      });
      return { status: "success" };
    },
    [state, environment, context],
  );

  const reloadReadiness = React.useCallback(async (): Promise<CaseDetailPublicError | null> => {
    if (state.kind !== "ready") return null;
    const targetId = state.case.id;
    // LV-08.3.1 — vincula a releitura ao ciclo mais recente do carregamento
    // completo. Se um novo loadAll (com incremento de requestIdRef) ocorrer
    // antes desta releitura retornar, a resposta é descartada.
    const reqIdAtStart = requestIdRef.current;
    const readinessResult = await environment.services.cases.getReadiness(
      context,
      targetId,
    );
    if (!mountedRef.current) return null;
    if (reqIdAtStart !== requestIdRef.current) return null;
    if (!readinessResult.ok) {
      return mapCaseDetailError(readinessResult.error as ServiceError);
    }
    setState((prev) => {
      // Confirma que o processo em tela ainda é o mesmo do início da releitura.
      if (prev.kind !== "ready" || prev.case.id !== targetId) return prev;
      return { ...prev, view: readinessResult.data };
    });
    return null;
  }, [state, environment, context]);

  const retryLoad = React.useCallback(() => {
    if (!isCaseId(rawId)) {
      setState({ kind: "notFound" });
      return;
    }
    void loadAll(rawId);
  }, [loadAll, rawId]);

  if (state.kind === "loading") return <ProcessDetailLoading />;
  if (state.kind === "notFound") return <ProcessDetailNotFound />;
  if (state.kind === "error") {
    return (
      <ProcessDetailError message={state.error.message} onRetry={retryLoad} />
    );
  }
  return (
    <div className="space-y-6">
      <ProcessDetailSummary case={state.case} />
      <ProcessReadinessChecklist
        case={state.case}
        view={state.view}
        canEdit={state.canEdit}
        onSave={handleSave}
        onReloadReadiness={reloadReadiness}
        onReloadAll={retryLoad}
      />
      <ProcessPeopleRelations case={state.case} />
      <ProcessPlanTimeline case={state.case} />
      <ProcessAuditSnapshots case={state.case} />
    </div>
  );
}
