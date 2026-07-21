import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound, MailCheck, ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Nexo Pericial 360" },
      {
        name: "description",
        content: "Recupere o acesso à sua conta Nexo Pericial 360.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Recuperar senha — Nexo Pericial 360" },
      { property: "og:description", content: "Recuperação de acesso à plataforma pericial." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nexo-visual-map.lovable.app/recuperar-senha" },
    ],
    links: [{ rel: "canonical", href: "https://nexo-visual-map.lovable.app/recuperar-senha" }],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left — institutional panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 20% 0%, hsl(var(--brand-accent) / 0.35), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, hsl(var(--primary-foreground) / 0.12), transparent 60%)",
          }}
        />

        <Link to="/" className="relative z-10 inline-flex" aria-label="Nexo Pericial 360 — Início">
          <Logo variant="full" className="h-10 w-auto text-primary-foreground" />
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            Recupere o acesso com segurança.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Enviaremos instruções ao seu e-mail cadastrado para restabelecer o
            acesso à sua conta sem comprometer a integridade dos dados periciais.
          </p>

          <div className="mt-10 flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-[hsl(var(--brand-accent))]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">
                Processo seguro e auditável
              </h3>
              <p className="mt-1 text-sm text-primary-foreground/75">
                Todo pedido de recuperação é registrado no histórico da conta.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Nexo Pericial 360 — Todos os direitos reservados.
        </p>
      </aside>

      {/* Right — form */}
      <main className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="inline-flex lg:hidden" aria-label="Início">
            <Logo variant="mark" className="h-10 w-10" />
          </Link>

          <div className="mt-8 lg:mt-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Recuperar senha
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe seu e-mail cadastrado e enviaremos as instruções de recuperação.
            </p>
          </div>

          {submitted ? (
            <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                Verifique seu e-mail
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Se o endereço informado estiver cadastrado, enviaremos em instantes
                um link para redefinição de senha. O link expira em 30 minutos.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-6 w-full gap-2">
                <Link to="/entrar">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail cadastrado</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full gap-2">
                <KeyRound className="h-4 w-4" />
                Enviar link de recuperação
              </Button>

              <p className="text-xs text-muted-foreground">
                Por segurança, não confirmamos se um e-mail está ou não cadastrado
                em nossa base.
              </p>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Lembrou sua senha?{" "}
            <Link
              to="/entrar"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
