import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/onboarding/StepShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useOnboardingDraft } from "@/hooks/use-onboarding";
import {
  PRIMARY_USES,
  PRIMARY_USE_LABEL,
  START_PAGES,
  START_PAGE_LABEL,
  type PrimaryUse,
  type StartPage,
  type ThemePref,
} from "@/domain/onboarding";

export const Route = createFileRoute("/onboarding/preferencias")({
  head: () => ({
    meta: [
      { title: "Preferências — Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreferenciasStep,
});

const TEMAS: { value: ThemePref; label: string; desc: string }[] = [
  { value: "keep", label: "Manter tema atual", desc: "Não alterar agora." },
  { value: "light", label: "Claro", desc: "Fundo claro, alto contraste." },
  { value: "dark", label: "Escuro", desc: "Fundo escuro, menor cansaço visual." },
  { value: "system", label: "Sistema", desc: "Segue a preferência do dispositivo." },
];

function PreferenciasStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const tema: ThemePref = draft.theme ?? "keep";

  const avancar = () => {
    if (!draft.primaryUse || !draft.startPage) return;
    navigate({ to: "/onboarding/revisao" });
  };

  return (
    <StepShell
      currentStep="preferencias"
      title="Preferências iniciais"
      description="Escolhas visuais para adaptar a demonstração. Nenhuma notificação real por e-mail é enviada."
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Uso principal</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRIMARY_USES.map((u: PrimaryUse) => (
            <OptionCard
              key={u}
              selected={draft.primaryUse === u}
              onSelect={() => update({ primaryUse: u })}
              title={PRIMARY_USE_LABEL[u]}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Página inicial preferida</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {START_PAGES.map((s: StartPage) => (
            <OptionCard
              key={s}
              selected={draft.startPage === s}
              onSelect={() => update({ startPage: s })}
              title={START_PAGE_LABEL[s]}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Aparência</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {TEMAS.map((t) => (
            <OptionCard
              key={t.value}
              selected={tema === t.value}
              onSelect={() => update({ theme: t.value })}
              title={t.label}
              description={t.desc}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Notificações internas aparecem no painel apenas de forma simulada.
        </p>
      </section>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: "/onboarding/contexto" })}>
          Voltar
        </Button>
        <Button onClick={avancar} disabled={!draft.primaryUse || !draft.startPage}>
          Avançar
        </Button>
      </div>
    </StepShell>
  );
}
