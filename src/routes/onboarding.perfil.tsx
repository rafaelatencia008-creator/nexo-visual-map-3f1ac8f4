import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/onboarding/StepShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useOnboardingDraft } from "@/hooks/use-onboarding";
import { PERFIS, PERFIL_LABEL, PERFIL_DESC, type Perfil } from "@/domain/onboarding";

export const Route = createFileRoute("/onboarding/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil profissional — Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PerfilStep,
});

function PerfilStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();

  const escolher = (p: Perfil) => update({ perfil: p });

  const avancar = () => {
    if (!draft.perfil) return;
    navigate({ to: "/onboarding/forma-de-trabalho" });
  };

  return (
    <StepShell
      currentStep="perfil"
      title="Qual é o seu perfil profissional?"
      description="Escolha a área que mais se aproxima da sua atuação. Não pediremos nome, CPF ou registro de conselho."
    >
      <div role="radiogroup" aria-label="Perfil profissional" className="grid gap-3 sm:grid-cols-2">
        {PERFIS.map((p) => (
          <OptionCard
            key={p}
            selected={draft.perfil === p}
            onSelect={() => escolher(p)}
            title={PERFIL_LABEL[p]}
            description={PERFIL_DESC[p]}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: "/onboarding" })}>
          Voltar
        </Button>
        <Button onClick={avancar} disabled={!draft.perfil}>
          Avançar
        </Button>
      </div>
    </StepShell>
  );
}
