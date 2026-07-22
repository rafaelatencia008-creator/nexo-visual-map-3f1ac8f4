import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/acesso-negado")({
  head: () => ({
    meta: [
      { title: "Acesso não permitido — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AcessoNegado,
});

function AcessoNegado() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldOff className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Erro 403
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Acesso não permitido
          </h1>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para visualizar esta área. Se acredita que é
            um engano, retorne ao painel ou à página inicial.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/app">Voltar ao painel</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Ir para o site público</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
