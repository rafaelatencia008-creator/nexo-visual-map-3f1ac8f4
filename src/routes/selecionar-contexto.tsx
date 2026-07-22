import * as React from "react";
import { createFileRoute, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Check, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession, safeRedirectTarget, needsOnboarding } from "@/hooks/use-session";
import { listContexts, isValidContextId } from "@/services/context-service";
import { WORK_MODE_LABEL, ROLE_LABEL } from "@/domain/onboarding";

type Search = { from?: string };

export const Route = createFileRoute("/selecionar-contexto")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Selecionar contexto — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SelecionarContextoPage,
});

function SelecionarContextoPage() {
  const { status, session, setCurrentContext } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { from } = Route.useSearch();

  React.useEffect(() => {
    if (status === "signed_out") {
      navigate({
        to: "/entrar",
        search: pathname.startsWith("/app") ? { from: pathname } : {},
        replace: true,
      });
      return;
    }
    if (status === "signed_in" && session && needsOnboarding(session)) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [status, session, navigate, pathname]);

  if (status !== "signed_in" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </div>
    );
  }
  if (needsOnboarding(session)) return null;

  const contextos = listContexts();
  const atual = session.currentContextId;
  const destino = safeRedirectTarget(from);

  const escolher = (id: string) => {
    if (!isValidContextId(id)) {
      toast.error("Contexto inválido.");
      return;
    }
    const ok = setCurrentContext(id);
    if (!ok) {
      toast.error("Não foi possível atualizar o contexto.");
      return;
    }
    toast.success("Contexto atualizado (demo)");
    navigate({ to: destino });
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao painel
          </Link>
          <Badge variant="outline" className="gap-1.5 py-1 text-[11px] uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-accent))]" />
            Contextos fictícios
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Selecionar contexto
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Todos os contextos abaixo são fictícios. Escolha um para continuar a demonstração.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {contextos.map((c) => {
            const isAtual = c.id === atual;
            return (
              <Card key={c.id} className={isAtual ? "border-primary" : "border-border/70"}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="font-display text-base">{c.nome}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.descricao}</p>
                    </div>
                  </div>
                  {isAtual && (
                    <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-widest">
                      <Check className="h-3 w-3" /> Atual
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Tipo</dt>
                      <dd className="font-medium text-foreground">{WORK_MODE_LABEL[c.tipo]}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Seu papel</dt>
                      <dd className="font-medium text-foreground">{ROLE_LABEL[c.role]}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Integrantes</dt>
                      <dd className="font-medium text-foreground">{c.integrantes}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Dados</dt>
                      <dd className="font-medium text-foreground">Fictícios</dd>
                    </div>
                  </dl>
                  <Button
                    className="w-full"
                    variant={isAtual ? "outline" : "default"}
                    onClick={() => escolher(c.id)}
                  >
                    {isAtual ? "Continuar neste contexto" : "Usar este contexto"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
