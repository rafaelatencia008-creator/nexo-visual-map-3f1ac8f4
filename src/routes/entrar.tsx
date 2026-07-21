import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ShieldCheck, History, FileLock2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Nexo Pericial 360" },
      {
        name: "description",
        content: "Acesse a plataforma pericial Nexo Pericial 360.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Entrar — Nexo Pericial 360" },
      { property: "og:description", content: "Acesso à plataforma pericial." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nexo-visual-map.lovable.app/entrar" },
    ],
    links: [{ rel: "canonical", href: "https://nexo-visual-map.lovable.app/entrar" }],
  }),
  component: EntrarPage,
});

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Rastreabilidade completa",
    text: "Cada movimentação registrada de ponta a ponta.",
  },
  {
    icon: FileLock2,
    title: "Conformidade LGPD",
    text: "Proteção rigorosa dos dados sensíveis do processo.",
  },
  {
    icon: History,
    title: "Timeline auditável",
    text: "Linha do tempo imutável para defesa em qualquer instância.",
  },
];

function EntrarPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info("Autenticação simulada", {
      description: "Em breve conectada ao backend real.",
    });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left — institutional panel */}
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
            Autoridade pericial em cada acesso.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            A plataforma que sustenta o rigor documental do seu trabalho pericial —
            do primeiro despacho ao laudo entregue.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-[hsl(var(--brand-accent))]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-primary-foreground/75">{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
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
              Entrar na plataforma
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse sua conta para gerenciar processos e laudos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@exemplo.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="lembrar" />
              <Label htmlFor="lembrar" className="text-sm font-normal text-muted-foreground">
                Manter conectado
              </Label>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate({ to: "/app" })}
          >
            Continuar como convidado (demo)
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <a
              href="#"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Criar conta
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
