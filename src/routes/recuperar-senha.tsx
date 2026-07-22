import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  KeyRound,
  ArrowLeft,
  ShieldCheck,
  Info,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEMO_VERIFICATION_CODE } from "@/hooks/use-session";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha (demo) — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Fluxo de recuperação de senha simulado — nenhum e-mail real é enviado.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Recuperar senha (demo) — Nexo Pericial 360" },
      {
        property: "og:description",
        content: "Etapa de recuperação simulada da demonstração visual.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RecuperarSenhaPage,
});

type Step = "email" | "code" | "password" | "done";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .email("Formato de e-mail inválido.");

function senhaRequisitos(senha: string) {
  return {
    len: senha.length >= 8,
    letra: /[A-Za-zÀ-ÿ]/.test(senha),
    numero: /\d/.test(senha),
  };
}

function RecuperarSenhaPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const req = useMemo(() => senhaRequisitos(senha), [senha]);

  const submitEmail = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "E-mail inválido.");
      return;
    }
    setError(null);
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep("code");
    }, 400);
  };

  const submitCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Digite os 6 dígitos.");
      return;
    }
    if (code !== DEMO_VERIFICATION_CODE) {
      setError("Código incorreto. Use o código de demonstração.");
      return;
    }
    setError(null);
    setStep("password");
  };

  const submitPassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!(req.len && req.letra && req.numero)) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    setError(null);
    setLoading(true);
    window.setTimeout(() => {
      // Nada é salvo — apenas simulação.
      setLoading(false);
      setSenha("");
      setConfirmar("");
      setStep("done");
      toast.success("Senha redefinida (demo)");
    }, 400);
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
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
            Redefina o acesso na demonstração.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Este fluxo é apenas visual. Nenhum e-mail é enviado, nenhuma senha é
            armazenada e nenhuma conta real é alterada.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-[hsl(var(--brand-accent))]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Fluxo totalmente simulado</h3>
              <p className="mt-1 text-sm text-primary-foreground/75">
                Serve para conhecer a experiência antes da versão real.
              </p>
            </div>
          </div>
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
              Recuperar senha
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Etapa {step === "email" ? 1 : step === "code" ? 2 : step === "password" ? 3 : 4} de 4 —
              fluxo simulado.
            </p>
          </div>

          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Recuperação <strong>simulada</strong>: nenhum e-mail real é enviado, nenhuma
              senha é armazenada.
            </AlertDescription>
          </Alert>

          {step === "email" && (
            <form onSubmit={submitEmail} className="mt-6 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  aria-invalid={!!error}
                />
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>
                ) : (
                  <><KeyRound className="h-4 w-4" /> Continuar</>
                )}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={submitCode} className="mt-6 space-y-5" noValidate>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Código de demonstração:</p>
                <p className="mt-1 font-mono text-lg tracking-widest text-foreground">
                  {DEMO_VERIFICATION_CODE}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código de verificação</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  aria-invalid={!!error}
                  className="text-center font-mono text-lg tracking-widest"
                />
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              </div>
              <Button type="submit" size="lg" className="w-full gap-2">
                <Check className="h-4 w-4" /> Validar código
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => { setStep("email"); setError(null); setCode(""); }}
              >
                Voltar e corrigir o e-mail
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={submitPassword} className="mt-6 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <ul className="mt-1 space-y-1 text-xs">
                  <ReqItem ok={req.len} label="Mínimo 8 caracteres" />
                  <ReqItem ok={req.letra} label="Pelo menos uma letra" />
                  <ReqItem ok={req.numero} label="Pelo menos um número" />
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar">Confirmar nova senha</Label>
                <Input
                  id="confirmar"
                  type={showSenha ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                />
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                ) : (
                  <>Redefinir senha (demo)</>
                )}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                Senha redefinida
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fluxo simulado concluído. Nenhuma senha foi salva. Você pode
                voltar ao login e entrar com as credenciais de demonstração.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-6 w-full gap-2">
                <Link to="/entrar">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Lembrou sua senha?{" "}
            <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
              Voltar para o login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function ReqItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={"flex items-center gap-2 " + (ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </li>
  );
}
