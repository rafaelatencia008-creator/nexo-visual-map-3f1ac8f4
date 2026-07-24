/**
 * LV-09.1B.6.3A — Rota canônica de criação de prazo/compromisso.
 *
 * Nesta parcela A, a rota monta temporariamente o `AgendaCreateDialog`
 * existente. A parcela B (LV-09.1B.6.3B) extrai o corpo para
 * `AgendaCreateContent` e a página passa a renderizá-lo como conteúdo
 * pleno (sem shell de diálogo). O comportamento oficial não muda.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";

import { useAgendaRouteState } from "@/features/agenda/route-state";
import {
  AgendaCreateDialog,
  type AgendaCreatedItem,
} from "@/features/agenda/AgendaCreateDialog";
import { isCaseId } from "@/domain/core/ids";

type AgendaNovoSearch = { readonly caseId?: string };

export const Route = createFileRoute("/app/agenda/novo")({
  head: () => ({
    meta: [
      { title: "Novo item da agenda — Nexo Pericial 360" },
      {
        name: "description",
        content: "Criação de prazo ou compromisso na Agenda profissional.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): AgendaNovoSearch => ({
    caseId: typeof s.caseId === "string" && s.caseId.length > 0 ? s.caseId : undefined,
  }),
  component: AgendaNovoPage,
});

function AgendaNovoPage() {
  const {
    environment,
    context,
    accessibleCases,
    casesState,
    setPendingCreated,
    setReloadKey,
    loadGenerationRef,
  } = useAgendaRouteState();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const initialCaseId =
    search.caseId && search.caseId.length > 0
      ? (search.caseId as CaseId)
      : undefined;

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        navigate({ to: "/app/agenda" });
      }
    },
    [navigate],
  );

  const handleCreated = React.useCallback(
    (created: AgendaCreatedItem) => {
      if (created.type === "appointment") {
        // Compromisso criado: navega diretamente para o detalhe canônico.
        navigate({
          to: "/app/agenda/$appointmentId",
          params: { appointmentId: String(created.item.id) },
        });
        return;
      }
      // Prazo criado: registra o marcador no estado compartilhado ANTES de
      // navegar, incrementando a geração exigida. O calendário decidirá
      // entre visible/hidden quando a nova geração concluir.
      const requiredGeneration = loadGenerationRef.current + 1;
      setPendingCreated({
        id: String(created.item.id),
        type: "deadline",
        requiredGeneration,
      });
      setReloadKey((k) => k + 1);
      navigate({ to: "/app/agenda" });
    },
    [navigate, loadGenerationRef, setPendingCreated, setReloadKey],
  );

  if (casesState.kind === "loading") {
    return (
      <div className="text-sm text-muted-foreground">Carregando processos…</div>
    );
  }
  if (casesState.kind === "error") {
    return (
      <div className="text-sm text-destructive">
        Falha ao carregar processos: {casesState.message}
      </div>
    );
  }

  return (
    <AgendaCreateDialog
      open
      onOpenChange={handleOpenChange}
      environment={environment}
      context={context}
      cases={accessibleCases}
      initialCaseId={initialCaseId}
      onCreated={handleCreated}
    />
  );
}
