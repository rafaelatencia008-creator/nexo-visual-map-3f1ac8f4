import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/onboarding/StepShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useOnboardingDraft } from "@/hooks/use-onboarding";
import { WORK_MODES, WORK_MODE_LABEL, WORK_MODE_DESC, type WorkMode } from "@/domain/onboarding";

export const Route = createFileRoute("/onboarding/forma-de-trabalho")({
  head: () => ({
    meta: [
      { title: "Forma de trabalho — Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FormaDeTrabalhoStep,
});

function FormaDeTrabalhoStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();

  const escolher = (w: WorkMode) => {
    // Ao mudar a forma de trabalho, o contexto atual pode não ser mais compatível.
    if (draft.workMode !== w) {
      update({ workMode: w, contextId: undefined });
    } else {
      update({ workMode: w });
    }
  };

  const avancar = () => {
    if (!draft.workMode) return;
    navigate({ to: "/onboarding/contexto" });
  };

  return (
    <StepShell
      currentStep="forma-de-trabalho"
      title="Como você pretende utilizar a plataforma?"
      description="Escolha a modalidade que combina com sua rotina. Nada será criado como organização real."
    >
      <div role="radiogroup" aria-label="Forma de trabalho" className="grid gap-3 sm:grid-cols-3">
        {WORK_MODES.map((w) => (
          <OptionCard
            key={w}
            selected={draft.workMode === w}
            onSelect={() => escolher(w)}
            title={WORK_MODE_LABEL[w]}
            description={WORK_MODE_DESC[w]}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: "/onboarding/perfil" })}>
          Voltar
        </Button>
        <Button onClick={avancar} disabled={!draft.workMode}>
          Avançar
        </Button>
      </div>
    </StepShell>
  );
}
