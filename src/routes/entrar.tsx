import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Loader2, Info, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleSimuladoDialog } from "@/components/auth/GoogleSimuladoDialog";
import { useSession, DEMO_CREDENTIALS } from "@/hooks/use-session";

type EntrarSearch = { from?: string };

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>): EntrarSearch => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar (demo) — Nexo Pericial 360" },
      {
        name: "description",
        content: "Tela de acesso simulada da demonstração visual do Nexo Pericial 360.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Entrar (demo) — Nexo Pericial 360" },
      {
        property: "og:description",
        content: "Demonstração visual — nenhuma autenticação real.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EntrarPage,
});

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Formato de e-mail inválido."),
  senha: z.string().min(1, "Informe sua senha."),
});

function EntrarPage() {
  const navigate = useNavigate();
  const { status, session, signInAsUser, signInAsGuest } = useSession();
  const { from } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; senha?: string; form?: string }>({});

  const jaLogado = status === "signed_in";

  const redirectTarget = from && from.startsWith("/app") ? from : "/app";

  const preencherDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setSenha(DEMO_CREDENTIALS.password);
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse({ email, senha });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "senha";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      // foco no primeiro campo com erro
      const first = fieldErrors.email ? "email" : "senha";
      document.getElementById(first)?.focus();
      return;
    }

    const cleanEmail = parsed.data.email.toLowerCase();
    const okEmail = cleanEmail === DEMO_CREDENTIALS.email;
    const okSenha = parsed.data.senha === DEMO_CREDENTIALS.password;

    if (!okEmail || !okSenha) {
      setErrors({
        form: "Credenciais incorretas. Use as credenciais de demonstração exibidas acima.",
      });
      return;
    }

    setErrors({});
    setLoading(true);
    window.setTimeout(() => {
      signInAsUser({
        email: cleanEmail,
        name: "Usuário de demonstração",
        remember,
      });
      toast.success("Bem-vindo à demonstração");
      setLoading(false);
      navigate({ to: redirectTarget });
    }, 500);
  };

  const seguirComoConvidado = () => {
    signInAsGuest();
    toast.info("Modo convidado ativo", {
      description: "Todos os dados exibidos são fictícios.",
    });
    navigate({ to: redirectTarget });
  };

  const confirmarGoogle = () => {
    setGoogleOpen(false);
    signInAsUser({
      email: "demo.google@nexo.local",
      name: "Usuário Google (simulado)",
      remember: false,
    });
    toast.success("Sessão Google simulada iniciada");
    navigate({ to: redirectTarget });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside
        className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12"
        aria-hidden="false"
      >
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
            Demonstração visual da plataforma.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Explore como o Nexo Pericial 360 organiza processos, pessoas, prazos e
            entregas. Nesta versão não há autenticação real, envio de e-mails ou
            armazenamento de dados pessoais.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/75">
            <li>· Sessão totalmente simulada no seu navegador.</li>
            <li>· Nenhum dado enviado a servidores externos.</li>
            <li>· Recursos de IA aparecem como preview sob revisão humana.</li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Nexo Pericial 360 — Demonstração visual.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="inline-flex lg:hidden" aria-label="Início">
            <Logo variant="mark" className="h-10 w-10" />
          </Link>
          <div className="mt-8 lg:mt-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Entrar na demonstração
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma conta real é criada. Use as credenciais de demonstração para
              explorar o painel.
            </p>
          </div>

          {jaLogado && (
            <Alert className="mt-6">
              <Info className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Sessão simulada já ativa
                  {session?.mode === "guest" ? " (modo convidado)" : ""}.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate({ to: redirectTarget })}
                >
                  Ir para o painel
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="mt-6 border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <div className="text-xs">
                  <p className="font-medium text-foreground">
                    Credenciais de demonstração
                  </p>
                  <p className="mt-1 font-mono text-[13px] text-foreground">
                    {DEMO_CREDENTIALS.email}
                    <br />
                    {DEMO_CREDENTIALS.password}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-2"
                  onClick={preencherDemo}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Preencher automaticamente
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                placeholder="voce@exemplo.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-xs font-medium text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  aria-invalid={!!errors.senha}
                  aria-describedby={errors.senha ? "senha-error" : undefined}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.senha && (
                <p id="senha-error" className="text-xs font-medium text-destructive">
                  {errors.senha}
                </p>
              )}
            </div>

            {errors.form && (
              <Alert variant="destructive">
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="lembrar"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label htmlFor="lembrar" className="text-sm font-normal text-muted-foreground">
                Manter conectado neste navegador
              </Label>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setGoogleOpen(true)}
            >
              Continuar com Google — simulação
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={seguirComoConvidado}
            >
              Continuar como convidado (demo)
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link
              to="/criar-conta"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </main>

      <GoogleSimuladoDialog
        open={googleOpen}
        onOpenChange={setGoogleOpen}
        onConfirm={confirmarGoogle}
        action="entrar"
      />
    </div>
  );
}
