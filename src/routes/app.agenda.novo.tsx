/**
 * LV-09.1B.6.3B.1 — Rota canônica de criação de prazo/compromisso.
 * LV-09.1B.6.3B.1.1 — Saída segura: o botão superior "Voltar para a agenda"
 * delega o pedido de fechamento ao Content (via handle imperativo), que
 * decide entre voltar direto ou abrir "Descartar rascunho?". Só usamos o
 * fallback direto para /app/agenda se o Content ainda não estiver montado
 * (loading/erro), sem duplicar detecção de rascunho na rota.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useAgendaRouteState } from "@/features/agenda/route-state";
import {
  AgendaCreateContent,
  type AgendaCreateContentHandle,
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

  const contentRef = React.useRef<AgendaCreateContentHandle | null>(null);

  const handleRequestClose = React.useCallback(() => {
    navigate({ to: "/app/agenda" });
  }, [navigate]);

  const handleBackRequest = React.useCallback(() => {
    const handle = contentRef.current;
    if (handle) {
      handle.requestClose();
      return;
    }
    navigate({ to: "/app/agenda" });
  }, [navigate]);

  const handleCreated = React.useCallback(
    (created: AgendaCreatedItem) => {
      if (created.type === "appointment") {
        navigate({
          to: "/app/agenda/$appointmentId",
          params: { appointmentId: String(created.item.id) },
        });
        return;
      }
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={handleBackRequest}
          aria-label="Voltar para a agenda"
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          Voltar para a agenda
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
            ref={contentRef}
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
