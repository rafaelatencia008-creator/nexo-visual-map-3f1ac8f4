import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WifiOff, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Sem conexão — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const [loading, setLoading] = React.useState(false);

  const retry = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.info("Ainda sem conexão", {
        description: "Simulação visual — nenhuma tentativa real foi feita.",
      });
    }, 900);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Sem conexão
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Você está fora do ar
          </h1>
          <p className="text-sm text-muted-foreground">
            Não conseguimos falar com o servidor. Verifique sua conexão e tente
            novamente.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={retry} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Tentando..." : "Tentar novamente"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
