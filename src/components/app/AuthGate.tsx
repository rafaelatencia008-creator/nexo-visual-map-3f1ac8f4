import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";

/**
 * Guarda visual (NÃO é segurança) do painel /app/**.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  React.useEffect(() => {
    if (status === "signed_out") {
      const qs = typeof window !== "undefined" ? window.location.search : "";
      const candidate = `${pathname}${qs}`;
      // Só propaga como "from" caminhos internos que comecem com /app.
      const from =
        pathname.startsWith("/app") && !pathname.startsWith("//") && !pathname.includes(":")
          ? candidate
          : undefined;
      navigate({ to: "/entrar", search: from ? { from } : {}, replace: true });
    }
  }, [status, navigate, pathname]);

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
