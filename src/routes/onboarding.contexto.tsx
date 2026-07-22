import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/onboarding/StepShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useOnboardingDraft } from "@/hooks/use-onboarding";
import { listContextsFor } from "@/services/context-service";
import { WORK_MODE_LABEL, ROLE_LABEL } from "@/domain/onboarding";

export const Route = createFileRoute("/onboarding/contexto")({
  head: () => ({
    meta: [
      { title: "Contexto — Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContextoStep,
});

function ContextoStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();

  const contextos = draft.workMode ? listContextsFor(draft.workMode) : [];

  const avancar = () => {
    if (!draft.contextId) return;
    navigate({ to: "/onboarding/preferencias" });
  };

  return (
    <StepShell
      currentStep="contexto"
      title="Escolha um contexto de demonstração"
      description="Todos os contextos são fictícios. Nenhuma organização real será criada."
    >
      {!draft.workMode ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Escolha primeiro a forma de trabalho para vermos os contextos compatíveis.
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/onboarding/forma-de-trabalho" })}>
              Voltar para escolher
            </Button>
          </div>
        </div>
      ) : contextos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nenhum contexto fictício disponível para esta modalidade.
        </div>
      ) : (
        <div className="grid gap-3">
          {contextos.map((c) => (
            <OptionCard
              key={c.id}
              selected={draft.contextId === c.id}
              onSelect={() => update({ contextId: c.id })}
              title={c.nome}
              description={c.descricao}
              meta={
                <span>
                  {WORK_MODE_LABEL[c.tipo]} · Papel: {ROLE_LABEL[c.role]} · {c.integrantes} integrante
                  {c.integrantes === 1 ? "" : "s"} · Dados fictícios
                </span>
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() =>
            toast.info("Criar organização real", {
              description: "Essa função dependerá do banco de dados e ainda não está disponível na demonstração.",
            })
          }
        >
          Quero criar uma nova organização
        </button>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: "/onboarding/forma-de-trabalho" })}>
          Voltar
        </Button>
        <Button onClick={avancar} disabled={!draft.contextId}>
          Avançar
        </Button>
      </div>
    </StepShell>
  );
}
