/**
 * LV-09.1B.6.3B.1 — Rota canônica de criação de prazo/compromisso.
 *
 * A página agora renderiza `AgendaCreateContent` diretamente, sem shell de
 * diálogo. A navegação pós-criação e o retorno para a Agenda são
 * controlados pela rota; por isso ela passa `closeAfterCreate={false}`.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useAgendaRouteState } from "@/features/agenda/route-state";
import {
  AgendaCreateContent,
  type AgendaCreatedItem,
} from "@/features/agenda/AgendaCreateContent";
import { resolveAgendaNovoCaseId } from "@/features/agenda/route-params";
import type { CaseId } from "@/domain/core/ids";

type AgendaNovoSearch = {
  readonly caseId?: CaseId;
};

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
  validateSearch: (search: Record<string, unknown>): AgendaNovoSearch => ({
    caseId: resolveAgendaNovoCaseId(search.caseId),
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
  const initialCaseId = search.caseId;

  const handleRequestClose = React.useCallback(() => {
    navigate({ to: "/app/agenda" });
  }, [navigate]);

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
      // navegar, incrementando a geração exigida.
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app/agenda" aria-label="Voltar para a agenda">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Voltar para a agenda
          </Link>
        </Button>
      </div>
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Novo item na agenda
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um prazo ou compromisso vinculado a um processo.
        </p>
      </header>

      {casesState.kind === "loading" ? (
        <div role="status" aria-busy className="text-sm text-muted-foreground">
          Carregando processos…
        </div>
      ) : casesState.kind === "error" ? (
        <div role="alert" className="text-sm text-destructive">
          Falha ao carregar processos: {casesState.message}
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 bg-card p-4 sm:p-6">
          <AgendaCreateContent
            active
            surface="page"
            closeAfterCreate={false}
            environment={environment}
            context={context}
            cases={accessibleCases}
            initialCaseId={initialCaseId}
            onCreated={handleCreated}
            onRequestClose={handleRequestClose}
          />
        </div>
      )}
    </div>
  );
}
