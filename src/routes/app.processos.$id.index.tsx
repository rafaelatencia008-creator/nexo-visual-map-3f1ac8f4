import { createFileRoute, notFound } from "@tanstack/react-router";
import * as React from "react";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import {
  ProcessDetailError,
  ProcessDetailLoading,
  ProcessDetailNotFound,
} from "@/features/processos/ProcessDetailState";
import { ProcessDetailSummary } from "@/features/processos/ProcessDetailSummary";
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
import type { Case, CaseId } from "@/domain/core/case";
import type { ServiceError } from "@/domain/services/result";
import type { CaseReadinessView } from "@/domain/services/case-service";

export const Route = createFileRoute("/app/processos/$id/")({
  loader: ({ params }) => {
    if (!isCaseId(params.id)) throw notFound();
    return { caseId: params.id };
  },
  head: () => ({
    meta: [
      { title: "Processo — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProcessoDetalhePage,
  notFoundComponent: ProcessDetailNotFound,
});

type DetailState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; error: CaseDetailPublicError }
  | { kind: "ready"; case: Case; view: CaseReadinessView; canEdit: boolean };

function ProcessoDetalhePage() {
  const { caseId } = Route.useLoaderData();
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
      const [caseResult, permResult] = await Promise.all([
        environment.services.cases.getById(context, id),
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
      const readinessResult = await environment.services.cases.getReadiness(
        context,
        id,
      );
      if (!mountedRef.current || reqId !== requestIdRef.current) return;
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
      const canEdit =
        permResult.ok === true && permResult.data.allowed === true;
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
    void loadAll(caseId);
  }, [loadAll, caseId]);

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
    const readinessResult = await environment.services.cases.getReadiness(
      context,
      state.case.id,
    );
    if (!mountedRef.current) return null;
    if (!readinessResult.ok) {
      return mapCaseDetailError(readinessResult.error as ServiceError);
    }
    setState((prev) =>
      prev.kind === "ready"
        ? { ...prev, view: readinessResult.data }
        : prev,
    );
    return null;
  }, [state, environment, context]);

  if (state.kind === "loading") return <ProcessDetailLoading />;
  if (state.kind === "notFound") return <ProcessDetailNotFound />;
  if (state.kind === "error") {
    return (
      <ProcessDetailError
        message={state.error.message}
        onRetry={() => void loadAll(caseId)}
      />
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
        onReloadAll={() => void loadAll(caseId)}
      />
    </div>
  );
}
