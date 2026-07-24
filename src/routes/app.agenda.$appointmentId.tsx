/**
 * LV-09.1B.6.3A — Rota canônica de detalhe de compromisso.
 *
 * Resolve o `appointmentId` via `resolveAppointmentRoute` (paginação
 * oficial de `appointments.list`) e monta o `AgendaItemDetailDialog`
 * existente. A parcela B extrai o corpo em `AgendaItemDetailContent`.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { useAgendaRouteState } from "@/features/agenda/route-state";
import {
  AgendaItemDetailDialog,
  type AgendaItemDeleted,
  type AgendaItemUpdated,
} from "@/features/agenda/AgendaItemDetailDialog";
import {
  resolveAppointmentRoute,
  type AppointmentRouteResolution,
} from "@/features/agenda/resolve-appointment-route";
import type { Appointment } from "@/domain/core/agenda";
import { buildPendingUpdateMarker } from "@/features/agenda/detail-reducers";
import { buildPendingRemovalMarker } from "@/features/agenda/item-mutations";

export const Route = createFileRoute("/app/agenda/$appointmentId")({
  head: () => ({
    meta: [
      { title: "Compromisso — Agenda — Nexo Pericial 360" },
      {
        name: "description",
        content: "Detalhe oficial de compromisso da Agenda profissional.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaAppointmentPage,
});

function AgendaAppointmentPage() {
  const { appointmentId } = Route.useParams();
  const {
    environment,
    context,
    accessibleCases,
    setPendingUpdated,
    setPendingRemoval,
    setReloadKey,
    loadGenerationRef,
  } = useAgendaRouteState();
  const navigate = useNavigate();

  const [resolution, setResolution] =
    React.useState<AppointmentRouteResolution | { kind: "loading" }>(
      { kind: "loading" },
    );
  const [nowEpoch, setNowEpoch] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    let cancelled = false;
    setResolution({ kind: "loading" });
    resolveAppointmentRoute(
      environment.services.appointments,
      context,
      appointmentId,
    ).then((r) => {
      if (cancelled) return;
      setResolution(r);
    });
    return () => {
      cancelled = true;
    };
  }, [environment, context, appointmentId]);

  // Referência temporal para o rótulo "Atrasado" e afins.
  React.useEffect(() => {
    const t = window.setInterval(() => setNowEpoch(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const goBack = React.useCallback(() => {
    navigate({ to: "/app/agenda" });
  }, [navigate]);

  const handleUpdated = React.useCallback(
    (updated: AgendaItemUpdated) => {
      setPendingUpdated(
        buildPendingUpdateMarker(loadGenerationRef.current, updated),
      );
      setReloadKey((k) => k + 1);
      // Atualiza a resolução localmente para refletir o novo estado.
      if (updated.type === "appointment") {
        setResolution({ kind: "found", appointment: updated.item });
      }
    },
    [setPendingUpdated, setReloadKey, loadGenerationRef],
  );

  const handleDeleted = React.useCallback(
    (deleted: AgendaItemDeleted) => {
      setPendingRemoval(
        buildPendingRemovalMarker(loadGenerationRef.current, {
          type: deleted.type,
          id: String(deleted.id),
        }),
      );
      setReloadKey((k) => k + 1);
      navigate({ to: "/app/agenda" });
    },
    [setPendingRemoval, setReloadKey, loadGenerationRef, navigate],
  );

  if (resolution.kind === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Carregando compromisso…
      </div>
    );
  }

  if (resolution.kind === "not_found") {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-md border border-border/60 bg-card p-6 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
        <h1 className="font-display text-xl font-semibold">
          Compromisso não encontrado
        </h1>
        <p className="text-sm text-muted-foreground">
          O compromisso solicitado não existe ou não está mais acessível.
        </p>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          onClick={goBack}
        >
          Voltar para a agenda
        </button>
      </div>
    );
  }

  if (resolution.kind === "error") {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-destructive" aria-hidden />
        <h1 className="font-display text-xl font-semibold text-destructive">
          Não foi possível carregar
        </h1>
        <p className="text-sm text-muted-foreground">
          {resolution.code === "forbidden"
            ? "Você não tem permissão para visualizar este compromisso."
            : resolution.message ||
              "Ocorreu um erro ao consultar o compromisso."}
        </p>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          onClick={goBack}
        >
          Voltar para a agenda
        </button>
      </div>
    );
  }

  const appointment: Appointment = resolution.appointment;

  return (
    <AgendaItemDetailDialog
      selected={{
        type: "appointment",
        caseId: appointment.caseId,
        id: appointment.id,
      }}
      onClose={goBack}
      environment={environment}
      context={context}
      cases={accessibleCases}
      onUpdated={handleUpdated}
      onDeleted={handleDeleted}
      referenceEpoch={nowEpoch}
    />
  );
}
