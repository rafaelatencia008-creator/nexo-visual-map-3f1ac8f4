import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Bem-vindo ao painel
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aqui você acompanhará suas perícias, processos e agenda em um só lugar.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/60 px-6 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <h2 className="font-display text-xl font-medium text-foreground">
          Área do dashboard
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Os widgets, indicadores e listas do painel serão adicionados no
          <span className="font-medium text-foreground"> Bloco LV-05</span>.
        </p>
      </div>
    </div>
  );
}
