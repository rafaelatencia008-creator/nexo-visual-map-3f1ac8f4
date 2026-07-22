import { createFileRoute, Link } from "@tanstack/react-router";
import { GitMerge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/conflito")({
  head: () => ({
    meta: [
      { title: "Conflito de versão — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConflitoPage,
});

function ConflitoPage() {
  const simulate = (msg: string) =>
    toast.info(msg, {
      description: "Simulação visual — nenhuma alteração real foi feita.",
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
          <GitMerge className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Conflito de versão
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Este registro foi alterado por outra pessoa
          </h1>
          <p className="text-sm text-muted-foreground">
            Outra sessão salvou uma versão mais recente enquanto você trabalhava.
            Escolha como continuar.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={() => simulate("Abrir comparação de alterações")}>
            Revisar alterações
          </Button>
          <Button variant="outline" onClick={() => simulate("Sua versão foi mantida")}>
            Manter versão atual
          </Button>
          <Button variant="outline" onClick={() => simulate("Versão mais recente carregada")}>
            Recarregar versão nova
          </Button>
        </div>
        <div>
          <Button variant="ghost" asChild>
            <Link to="/app">Voltar ao painel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
