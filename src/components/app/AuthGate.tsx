import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";

/**
 * Guarda visual (NÃO é segurança) do painel /app/**.
 *
 * - Enquanto restaura, mostra spinner discreto (nunca expõe conteúdo
 *   protegido antes da verificação).
 * - Sem sessão: redireciona para /entrar preservando o caminho de origem.
 * - Com sessão (convidado ou autenticado simulado): renderiza os filhos.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search });

  React.useEffect(() => {
    if (status === "signed_out") {
      const from = `${pathname}${
        search && typeof search === "object" && Object.keys(search).length
          ? "?" + new URLSearchParams(search as Record<string, string>).toString()
          : ""
      }`;
      navigate({ to: "/entrar", search: { from }, replace: true });
    }
  }, [status, navigate, pathname, search]);

  if (status !== "signed_in") {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Restaurando sessão…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
