import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/onboarding/StepShell";
import { useSession } from "@/hooks/use-session";
import { resetOnboardingDraft } from "@/hooks/use-onboarding";
import { clearAuthTransient } from "@/lib/auth-transient";
import { ONBOARDING_STEPS } from "@/domain/onboarding";

export const Route = createFileRoute("/onboarding/")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingHomePage,
});

function OnboardingHomePage() {
  const navigate = useNavigate();
  const { signOut } = useSession();

  const sairEDepois = () => {
    resetOnboardingDraft();
    clearAuthTransient();
    signOut();
    toast.info("Você poderá continuar a configuração mais tarde.");
    navigate({ to: "/" });
  };

  return (
    <StepShell
      currentStep="inicio"
      title="Vamos preparar seu espaço de trabalho"
      description="Faremos algumas escolhas visuais para adaptar a demonstração ao seu perfil. Nenhum dado real está sendo cadastrado."
    >
      <ol className="space-y-2 rounded-lg border border-border bg-muted/20 p-4 text-sm">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s.key} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-foreground">{s.label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Leva poucos minutos. Você pode voltar e alterar cada opção antes de concluir.
      </p>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={sairEDepois}>
          Sair e continuar depois
        </Button>
        <Button onClick={() => navigate({ to: "/onboarding/perfil" })}>
          Começar configuração
        </Button>
      </div>
    </StepShell>
  );
}
