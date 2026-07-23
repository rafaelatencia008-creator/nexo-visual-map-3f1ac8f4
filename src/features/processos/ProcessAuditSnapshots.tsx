/**
 * LV-08.6B / LV-08.6B.1 — container "Histórico de alterações e Snapshots"
 * da ficha do processo. Utiliza exclusivamente contratos oficiais.
 */

import * as React from "react";
import { toast } from "sonner";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import { ProcessAuditHistoryCard } from "@/features/processos/ProcessAuditHistoryCard";
import { ProcessSnapshotsCard } from "@/features/processos/ProcessSnapshotsCard";
import { CreateProcessSnapshotDialog } from "@/features/processos/CreateProcessSnapshotDialog";
import { ProcessSnapshotDetailsDialog } from "@/features/processos/ProcessSnapshotDetailsDialog";
import {
  ProcessAuditSnapshotError,
  ProcessAuditSnapshotLoading,
  RefreshingBanner,
} from "@/features/processos/ProcessAuditSnapshotState";
import {
  AUDIT_SNAPSHOT_PAGE_LIMIT,
  EMPTY_AUDIT_FILTER,
  mapAuditSnapshotError,
  type AuditFilterBuildError,
  type AuditFilterFormValues,
  type AuditSnapshotPublicError,
  type ProcessAuditSnapshotState,
} from "@/features/processos/process-audit-snapshot-model";
import type { AuditEventListOptions } from "@/domain/services/audit-service";
import type { AuditEvent, CaseSnapshot } from "@/domain/core/case-audit";
import type { Case } from "@/domain/core/case";
import type { CaseSnapshotId } from "@/domain/core/ids";
import type { ServiceError } from "@/domain/services/result";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";

export const AUDIT_SECTION_TITLE_ID = "audit-section-title";

export type ProcessAuditSnapshotsProps = Readonly<{ case: Case }>;

export function ProcessAuditSnapshots({
  case: caseEntity,
}: ProcessAuditSnapshotsProps) {
  const caseId = caseEntity.id;
  const { environment, context } = useMockDomain();

  const [state, setState] = React.useState<ProcessAuditSnapshotState>({
    kind: "loading",
  });
  const [filter, setFilter] = React.useState<AuditFilterFormValues>(
    EMPTY_AUDIT_FILTER,
  );
  const [filterError, setFilterError] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [createError, setCreateError] =
    React.useState<AuditSnapshotPublicError | null>(null);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailSnapshotId, setDetailSnapshotId] =
    React.useState<CaseSnapshotId | null>(null);
  const [detailSnapshot, setDetailSnapshot] =
    React.useState<CaseSnapshot | null>(null);
  const [detailError, setDetailError] =
    React.useState<AuditSnapshotPublicError | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const mountedRef = React.useRef(true);
  const requestIdRef = React.useRef(0);
  const detailRequestIdRef = React.useRef(0);
  const writeOperationRef = React.useRef(false);
  const viewTriggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAll = React.useCallback(
    async (
      auditOptions: AuditEventListOptions | null,
      opts: { readonly filtered: boolean; readonly isRefresh: boolean },
    ) => {
      const reqId = ++requestIdRef.current;
      if (opts.isRefresh) {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, refreshing: true } : prev,
        );
      } else {
        setState({ kind: "loading" });
      }
      const listOptions: AuditEventListOptions =
        auditOptions ?? { page: { limit: AUDIT_SNAPSHOT_PAGE_LIMIT } };
      const [auditRes, snapRes, permAudit, permReadSnap, permCreateSnap] =
        await Promise.all([
          environment.services.auditEvents.listByCase(
            context,
            caseId,
            listOptions,
          ),
          environment.services.caseSnapshots.listByCase(context, caseId, {
            page: { limit: AUDIT_SNAPSHOT_PAGE_LIMIT },
          }),
          environment.services.permissions.evaluate(context, {
            action: "auditEvent.read",
            caseId,
          }),
          environment.services.permissions.evaluate(context, {
            action: "caseSnapshot.read",
            caseId,
          }),
          environment.services.permissions.evaluate(context, {
            action: "caseSnapshot.create",
            caseId,
          }),
        ]);
      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      if (!permAudit.ok) {
        setState({
          kind: "error",
          error: mapAuditSnapshotError(permAudit.error as ServiceError),
        });
        return;
      }
      if (!permReadSnap.ok) {
        setState({
          kind: "error",
          error: mapAuditSnapshotError(permReadSnap.error as ServiceError),
        });
        return;
      }
      if (!permCreateSnap.ok) {
        setState({
          kind: "error",
          error: mapAuditSnapshotError(permCreateSnap.error as ServiceError),
        });
        return;
      }

      const canReadAudit = permAudit.data.allowed === true;
      const canReadSnapshots = permReadSnap.data.allowed === true;
      const canCreateSnapshot = permCreateSnap.data.allowed === true;

      let evs: readonly AuditEvent[] = [];
      let snaps: readonly CaseSnapshot[] = [];

      if (canReadAudit) {
        if (!auditRes.ok) {
          setState({
            kind: "error",
            error: mapAuditSnapshotError(auditRes.error as ServiceError),
          });
          return;
        }
        evs = auditRes.data.items;
      } else if (!auditRes.ok && auditRes.error.code !== "forbidden") {
        setState({
          kind: "error",
          error: mapAuditSnapshotError(auditRes.error as ServiceError),
        });
        return;
      }

      if (canReadSnapshots) {
        if (!snapRes.ok) {
          setState({
            kind: "error",
            error: mapAuditSnapshotError(snapRes.error as ServiceError),
          });
          return;
        }
        snaps = snapRes.data.items;
      } else if (!snapRes.ok && snapRes.error.code !== "forbidden") {
        setState({
          kind: "error",
          error: mapAuditSnapshotError(snapRes.error as ServiceError),
        });
        return;
      }


      setState({
        kind: "ready",
        events: evs,
        snapshots: snaps,
        permissions: {
          canReadAudit,
          canReadSnapshots,
          canCreateSnapshot,
        },
        refreshing: false,
        filtered: opts.filtered,
      });
    },
    [environment, context, caseId],
  );

  React.useEffect(() => {
    void loadAll(null, { filtered: false, isRefresh: false });
  }, [loadAll]);

  const handleApplyFilter = React.useCallback(
    (opts: AuditEventListOptions) => {
      setFilterError(null);
      const isFiltered =
        opts.actions !== undefined ||
        opts.occurredFrom !== undefined ||
        opts.occurredTo !== undefined;
      void loadAll(opts, { filtered: isFiltered, isRefresh: true });
    },
    [loadAll],
  );

  const handleFilterValidationError = React.useCallback(
    (reason: AuditFilterBuildError) => {
      setFilterError(
        reason === "range_inverted"
          ? "A data inicial não pode ser maior que a data final."
          : "Informe uma data válida.",
      );
    },
    [],
  );

  const handleClearFilter = React.useCallback(() => {
    setFilter(EMPTY_AUDIT_FILTER);
    setFilterError(null);
    void loadAll(null, { filtered: false, isRefresh: true });
  }, [loadAll]);

  const refreshAfterCreate = React.useCallback(() => {
    void loadAll(null, { filtered: false, isRefresh: true });
    setFilter(EMPTY_AUDIT_FILTER);
    setFilterError(null);
  }, [loadAll]);

  const handleCreate = React.useCallback(
    async (input: CreateCaseSnapshotInput) => {
      if (writeOperationRef.current) return;
      writeOperationRef.current = true;
      setSubmitting(true);
      setCreateError(null);
      try {
        const res = await environment.services.caseSnapshots.create(
          context,
          input,
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          setCreateError(mapAuditSnapshotError(res.error as ServiceError));
          return;
        }
        setCreateOpen(false);
        toast.success("Snapshot criado.");
        refreshAfterCreate();
      } finally {
        writeOperationRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [environment, context, refreshAfterCreate],
  );

  const loadDetail = React.useCallback(
    async (snapshotId: CaseSnapshotId) => {
      const reqId = ++detailRequestIdRef.current;
      setDetailLoading(true);
      setDetailError(null);
      setDetailSnapshot(null);
      const res = await environment.services.caseSnapshots.getById(
        context,
        caseId,
        snapshotId,
      );
      if (!mountedRef.current || reqId !== detailRequestIdRef.current) return;
      if (!res.ok) {
        setDetailError(mapAuditSnapshotError(res.error as ServiceError));
        setDetailLoading(false);
        return;
      }
      setDetailSnapshot(res.data);
      setDetailLoading(false);
    },
    [environment, context, caseId],
  );

  const handleViewSnapshot = React.useCallback(
    (snapshotId: CaseSnapshotId) => {
      // Preserva o gatilho para devolver o foco ao fechar o diálogo.
      const active = document.activeElement;
      if (active instanceof HTMLElement) viewTriggerRef.current = active;
      setDetailSnapshotId(snapshotId);
      setDetailOpen(true);
      setDetailSnapshot(null);
      setDetailError(null);
      void loadDetail(snapshotId);
    },
    [loadDetail],
  );

  const handleDetailRetry = React.useCallback(() => {
    if (detailSnapshotId === null) return;
    void loadDetail(detailSnapshotId);
  }, [detailSnapshotId, loadDetail]);

  const handleDetailOpenChange = React.useCallback((next: boolean) => {
    setDetailOpen(next);
    if (!next) {
      // Descarta respostas pendentes e devolve o foco.
      detailRequestIdRef.current += 1;
      setDetailLoading(false);
      const trigger = viewTriggerRef.current;
      if (trigger !== null) {
        window.setTimeout(() => {
          trigger.focus();
        }, 0);
      }
    }
  }, []);

  if (state.kind === "loading") return <ProcessAuditSnapshotLoading />;
  if (state.kind === "error") {
    return (
      <ProcessAuditSnapshotError
        message={state.error.message}
        onRetry={() =>
          void loadAll(null, { filtered: false, isRefresh: false })
        }
      />
    );
  }

  const canSeeSection =
    state.permissions.canReadAudit || state.permissions.canReadSnapshots;
  if (!canSeeSection) {
    return (
      <section
        aria-labelledby={AUDIT_SECTION_TITLE_ID}
        className="space-y-2 rounded-md border bg-muted/20 p-4"
      >
        <h2
          id={AUDIT_SECTION_TITLE_ID}
          className="text-base font-semibold text-foreground"
        >
          Histórico de alterações e snapshots
        </h2>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para visualizar o histórico e os snapshots
          deste processo.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={AUDIT_SECTION_TITLE_ID}
      className="space-y-4"
    >
      <h2
        id={AUDIT_SECTION_TITLE_ID}
        className="text-base font-semibold text-foreground"
      >
        Histórico de alterações e snapshots
      </h2>
      {state.refreshing ? <RefreshingBanner /> : null}
      {state.permissions.canReadAudit ? (
        <ProcessAuditHistoryCard
          events={state.events}
          currentUserId={context.userId}
          filter={filter}
          onFilterChange={setFilter}
          onApplyFilter={handleApplyFilter}
          onFilterValidationError={handleFilterValidationError}
          onClearFilter={handleClearFilter}
          filterError={filterError}
          loading={state.refreshing}
          filtered={state.filtered}
        />

      ) : null}
      {state.permissions.canReadSnapshots ? (
        <ProcessSnapshotsCard
          snapshots={state.snapshots}
          canCreate={state.permissions.canCreateSnapshot}
          onCreateClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          onViewSnapshot={handleViewSnapshot}
          currentUserId={context.userId}
        />
      ) : null}
      <CreateProcessSnapshotDialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!submitting) setCreateOpen(o);
        }}
        caseId={caseId}
        submitting={submitting}
        error={createError}
        onSubmit={handleCreate}
      />
      <ProcessSnapshotDetailsDialog
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        loading={detailLoading}
        error={detailError}
        snapshot={detailSnapshot}
        currentUserId={context.userId}
        canRetry={detailSnapshotId !== null}
        onRetry={handleDetailRetry}
      />
    </section>
  );
}
