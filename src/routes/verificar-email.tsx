import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type FormEvent } from "react";
import { z } from "zod";
import { Loader2, ShieldCheck, Info, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession, DEMO_VERIFICATION_CODE } from "@/hooks/use-session";

type Search = { email?: string; nome?: string; perfil?: string };

export const Route = createFileRoute("/verificar-email")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s.email === "string" ? s.email : undefined,
    nome: typeof s.nome === "string" ? s.nome : undefined,
    perfil: typeof s.perfil === "string" ? s.perfil : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verificar e-mail (demo) — Nexo Pericial 360" },
      {
        name: "description",
        content: "Verificação de e-mail simulada — nenhum e-mail real é enviado.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Verificar e-mail (demo) — Nexo Pericial 360" },
      {
        property: "og:description",
        content: "Etapa de verificação simulada da demonstração visual.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: VerificarEmailPage,
});

const codeSchema = z
  .string()
  .length(6, "Digite os 6 dígitos.")
  .regex(/^\d{6}$/, "O código deve conter apenas números.");

function VerificarEmailPage() {
  const navigate = useNavigate();
  const { email, nome, perfil } = Route.useSearch();
  const { signInAsUser } = useSession();

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const r0 = useRef<HTMLInputElement>(null);
  const r1 = useRef<HTMLInputElement>(null);
  const r2 = useRef<HTMLInputElement>(null);
  const r3 = useRef<HTMLInputElement>(null);
  const r4 = useRef<HTMLInputElement>(null);
  const r5 = useRef<HTMLInputElement>(null);
  const inputs = [r0, r1, r2, r3, r4, r5];

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const code = useMemo(() => digits.join(""), [digits]);

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < 5) inputs[i + 1].current?.focus();
    setError(null);
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs[i - 1].current?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputs[i - 1].current?.focus();
    if (e.key === "ArrowRight" && i < 5) inputs[i + 1].current?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = Array(6).fill("");
    for (let k = 0; k < text.length; k++) arr[k] = text[k];
    setDigits(arr);
    const nextIdx = Math.min(text.length, 5);
    inputs[nextIdx].current?.focus();
    setError(null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Código inválido.");
      return;
    }
    if (parsed.data !== DEMO_VERIFICATION_CODE) {
      setError("Código incorreto. Use o código de demonstração exibido acima.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      signInAsUser({
        email: email ?? "demo@nexo.local",
        name: nome || "Usuário de demonstração",
        perfil,
        remember: false,
      });
      toast.success("E-mail verificado (demo)");
      setLoading(false);
      navigate({ to: "/app" });
    }, 500);
  };

  const reenviar = () => {
    setResendCount((n) => n + 1);
    setResendCooldown(30);
    toast.info("Reenvio simulado", {
      description: "Nenhum e-mail real foi enviado.",
    });
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
            Só falta confirmar (na simulação).
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Esta etapa mostra como funcionaria a verificação de e-mail. Nenhum
            e-mail real foi enviado e nenhum endereço foi armazenado.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-[hsl(var(--brand-accent))]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Etapa apenas visual</h3>
              <p className="mt-1 text-sm text-primary-foreground/75">
                O código serve somente para testar a interface.
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
              Verificar e-mail
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {email
                ? <>Enviamos um código simulado para <strong className="text-foreground">{email}</strong>.</>
                : "Enviamos um código simulado para o e-mail informado."}
            </p>
          </div>

          <Alert className="mt-6 border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="text-xs">
                <p className="font-medium text-foreground">Código de demonstração</p>
                <p className="mt-1 font-mono text-[15px] tracking-widest text-foreground">
                  {DEMO_VERIFICATION_CODE}
                </p>
                <p className="mt-2 text-muted-foreground">
                  Nenhum e-mail real foi enviado. Nenhum endereço foi armazenado.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <fieldset>
              <legend className="sr-only">Código de 6 dígitos</legend>
              <div className="flex justify-between gap-2" role="group" aria-label="Código de verificação">
                {digits.map((d, i) => (
                  <Input
                    key={i}
                    ref={inputs[i]}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    onPaste={onPaste}
                    aria-label={`Dígito ${i + 1} de 6`}
                    className="h-12 w-full text-center font-mono text-lg tracking-widest"
                  />
                ))}
              </div>
              {error && (
                <p className="mt-3 text-xs font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}
            </fieldset>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar código
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={reenviar}
              disabled={resendCooldown > 0}
              className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0
                ? `Reenviar código em ${resendCooldown}s`
                : "Reenviar código (simulação)"}
            </button>
            {resendCount > 0 && resendCooldown === 0 && (
              <span className="text-xs">Reenvios simulados: {resendCount}</span>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Link to="/criar-conta" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Corrigir e-mail
            </Link>
            <Link to="/entrar" className="font-medium text-muted-foreground underline-offset-4 hover:underline">
              Já verifiquei — voltar ao login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Reusa o componente X para futura auditoria (mantém o ícone importado).
export const _keepImport = X;
