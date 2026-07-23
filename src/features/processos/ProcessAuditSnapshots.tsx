/**
 * LV-08.6B — container "Histórico de alterações e Snapshots" da ficha
 * do processo. Utiliza exclusivamente contratos oficiais e trava
 * síncrona `writeOperationRef` durante a criação de snapshots.
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
  EMPTY_AUDIT_FILTER,
  buildAuditFilter,
  mapAuditSnapshotError,
  type AuditFilterFormValues,
  type AuditSnapshotPermissions,
  type AuditSnapshotPublicError,
} from "@/features/processos/process-audit-snapshot-model";
import type { AuditEventListOptions } from "@/domain/services/audit-service";
import type { AuditEvent, CaseSnapshot } from "@/domain/core/case-audit";
import type { CaseId } from "@/domain/core/ids";
import type { ServiceError } from "@/domain/services/result";
import type { CreateCaseSnapshotInput } from "@/domain/services/inputs";

export type ProcessAuditSnapshotsProps = Readonly<{ caseId: CaseId }>;

type State =
  | { kind: "loading" }
  | { kind: "error"; error: AuditSnapshotPublicError }
  | {
      kind: "ready";
      events: readonly AuditEvent[];
      snapshots: readonly CaseSnapshot[];
      permissions: AuditSnapshotPermissions;
    };

export function ProcessAuditSnapshots({ caseId }: ProcessAuditSnapshotsProps) {
  const { environment, context } = useMockDomain();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<AuditFilterFormValues>(
    EMPTY_AUDIT_FILTER,
  );
  const [filterError, setFilterError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] =
    React.useState<AuditSnapshotPublicError | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailSnapshot, setDetailSnapshot] =
    React.useState<CaseSnapshot | null>(null);

  const mountedRef = React.useRef(true);
  const requestIdRef = React.useRef(0);
  const writeOperationRef = React.useRef(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAll = React.useCallback(
    async (options: AuditEventListOptions | null = null) => {
      const reqId = ++requestIdRef.current;
      const isInitial = state.kind !== "ready";
      if (isInitial) setState({ kind: "loading" });
      else setRefreshing(true);
      const auditOptions = options ?? {};
      const [auditRes, snapRes, permAudit, permReadSnap, permCreateSnap] =
        await Promise.all([
          environment.services.auditEvents.listByCase(context, caseId, auditOptions),
          environment.services.caseSnapshots.listByCase(context, caseId),
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
      const errored = [auditRes, snapRes, permAudit, permReadSnap, permCreateSnap]
        .find((r) => !r.ok);
      if (errored && !errored.ok) {
        setState({
          kind: "error",
          error: mapAuditSnapshotError(errored.error as ServiceError),
        });
        setRefreshing(false);
        return;
      }
      if (
        !auditRes.ok ||
        !snapRes.ok ||
        !permAudit.ok ||
        !permReadSnap.ok ||
        !permCreateSnap.ok
      ) {
        setRefreshing(false);
        return;
      }
      setState({
        kind: "ready",
        events: auditRes.data.items,
        snapshots: snapRes.data.items,
        permissions: {
          canReadAudit: permAudit.data.allowed === true,
          canReadSnapshots: permReadSnap.data.allowed === true,
          canCreateSnapshot: permCreateSnap.data.allowed === true,
        },
      });
      setRefreshing(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [environment, context, caseId],
  );

  React.useEffect(() => {
    void loadAll(null);
  }, [loadAll]);

  const applyFilter = React.useCallback(
    (opts: AuditEventListOptions | null) => {
      if (opts === null) {
        const built = buildAuditFilter(filter);
        if (!built.ok) {
          setFilterError(
            built.reason === "range_inverted"
              ? "A data inicial não pode ser maior que a data final."
              : "Informe uma data válida no formato DD/MM/AAAA.",
          );
          return;
        }
      }
      setFilterError(null);
      void loadAll(opts);
    },
    [filter, loadAll],
  );

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
        toast.success("Snapshot criado com sucesso.");
        await loadAll(null);
      } finally {
        writeOperationRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [environment, context, loadAll],
  );

  const handleViewSnapshot = React.useCallback((s: CaseSnapshot) => {
    setDetailSnapshot(s);
    setDetailOpen(true);
  }, []);

  if (state.kind === "loading") return <ProcessAuditSnapshotLoading />;
  if (state.kind === "error") {
    return (
      <ProcessAuditSnapshotError
        message={state.error.message}
        onRetry={() => void loadAll(null)}
      />
    );
  }

  const canSeeSection =
    state.permissions.canReadAudit || state.permissions.canReadSnapshots;
  if (!canSeeSection) {
    return (
      <section
        aria-label="Histórico de alterações e snapshots"
        className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground"
      >
        Você não tem permissão para visualizar o histórico e os snapshots
        deste processo.
      </section>
    );
  }

  return (
    <section
      aria-label="Histórico de alterações e snapshots"
      className="space-y-4"
    >
      {refreshing ? <RefreshingBanner /> : null}
      {state.permissions.canReadAudit ? (
        <ProcessAuditHistoryCard
          caseId={caseId}
          events={state.events}
          currentUserId={context.userId}
          filter={filter}
          onFilterChange={setFilter}
          onApplyFilter={applyFilter}
          filterError={filterError}
          loading={refreshing}
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
        onOpenChange={setDetailOpen}
        loading={false}
        error={null}
        snapshot={detailSnapshot}
        currentUserId={context.userId}
      />
    </section>
  );
}
