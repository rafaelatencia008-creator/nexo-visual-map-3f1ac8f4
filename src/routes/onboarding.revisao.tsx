import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/onboarding/StepShell";
import { useOnboardingDraft } from "@/hooks/use-onboarding";
import { useSession, takeOnboardingReturn } from "@/hooks/use-session";
import { clearAuthTransient } from "@/lib/auth-transient";
import { useTheme } from "@/hooks/use-theme";
import {
  PERFIL_LABEL,
  WORK_MODE_LABEL,
  PRIMARY_USE_LABEL,
  START_PAGE_LABEL,
  START_PAGE_PATH,
  ROLE_LABEL,
  type OnboardingResult,
} from "@/domain/onboarding";
import { getContextById } from "@/services/context-service";

export const Route = createFileRoute("/onboarding/revisao")({
  head: () => ({
    meta: [
      { title: "Revisão — Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RevisaoStep,
});

function RevisaoStep() {
  const navigate = useNavigate();
  const { draft } = useOnboardingDraft();
  const { completeOnboarding, signOut } = useSession();
  const { setTheme } = useTheme();

  const context = getContextById(draft.contextId);
  const completo = !!(
    draft.perfil &&
    draft.workMode &&
    context &&
    draft.primaryUse &&
    draft.startPage
  );

  const concluir = () => {
    if (!completo || !context) {
      toast.error("Complete todas as etapas antes de concluir.");
      return;
    }
    const theme = draft.theme ?? "keep";
    const result: OnboardingResult = {
      perfil: draft.perfil!,
      workMode: draft.workMode!,
      contextId: context.id,
      role: context.role,
      primaryUse: draft.primaryUse!,
      startPage: draft.startPage!,
      theme,
    };
    completeOnboarding(result);
    if (theme === "light" || theme === "dark") {
      setTheme(theme);
    } else if (theme === "system" && typeof window !== "undefined") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
    clearAuthTransient();
    toast.success("Configuração concluída (demo)");

    const returnTo = takeOnboardingReturn();
    const destino = returnTo ?? START_PAGE_PATH[result.startPage];
    navigate({ to: destino });
  };

  const cancelar = () => {
    signOut();
    toast.info("Configuração cancelada. Sessão encerrada.");
    navigate({ to: "/" });
  };

  return (
    <StepShell
      currentStep="revisao"
      title="Confira suas escolhas"
      description="Revise antes de concluir. Você pode voltar em qualquer etapa para ajustar."
    >
      <dl className="grid gap-4 rounded-lg border border-border bg-muted/10 p-5 text-sm sm:grid-cols-2">
        <Item
          label="Perfil profissional"
          value={draft.perfil ? PERFIL_LABEL[draft.perfil] : "—"}
          editar={() => navigate({ to: "/onboarding/perfil" })}
        />
        <Item
          label="Forma de trabalho"
          value={draft.workMode ? WORK_MODE_LABEL[draft.workMode] : "—"}
          editar={() => navigate({ to: "/onboarding/forma-de-trabalho" })}
        />
        <Item
          label="Contexto"
          value={context ? context.nome : "—"}
          editar={() => navigate({ to: "/onboarding/contexto" })}
        />
        <Item
          label="Papel neste contexto"
          value={context ? ROLE_LABEL[context.role] : "—"}
          editar={() => navigate({ to: "/onboarding/contexto" })}
        />
        <Item
          label="Uso principal"
          value={draft.primaryUse ? PRIMARY_USE_LABEL[draft.primaryUse] : "—"}
          editar={() => navigate({ to: "/onboarding/preferencias" })}
        />
        <Item
          label="Página inicial"
          value={draft.startPage ? START_PAGE_LABEL[draft.startPage] : "—"}
          editar={() => navigate({ to: "/onboarding/preferencias" })}
        />
        <Item
          label="Aparência"
          value={
            !draft.theme || draft.theme === "keep"
              ? "Manter atual"
              : draft.theme === "light"
                ? "Claro"
                : draft.theme === "dark"
                  ? "Escuro"
                  : "Sistema"
          }
          editar={() => navigate({ to: "/onboarding/preferencias" })}
        />
      </dl>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => navigate({ to: "/onboarding/preferencias" })}>
            Voltar
          </Button>
          <Button variant="ghost" onClick={cancelar}>
            Cancelar e sair
          </Button>
        </div>
        <Button onClick={concluir} disabled={!completo}>
          Concluir configuração
        </Button>
      </div>
    </StepShell>
  );
}

function Item({ label, value, editar }: { label: string; value: string; editar: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
      </div>
      <button
        type="button"
        onClick={editar}
        className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        Editar
      </button>
    </div>
  );
}
