import * as React from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSession, needsOnboarding } from "@/hooks/use-session";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Configuração visual inicial da demonstração." },
    ],
  }),
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const { status, session } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  React.useEffect(() => {
    if (status === "signed_out") {
      navigate({ to: "/entrar", replace: true });
      return;
    }
    if (status === "signed_in" && session && !needsOnboarding(session)) {
      // Convidado ou usuário já configurado não abre onboarding.
      navigate({ to: "/app", replace: true });
    }
  }, [status, session, navigate, pathname]);

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
  if (session && !needsOnboarding(session)) return null;

  return <Outlet />;
}
