import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, UserPlus, Sparkles, ShieldCheck, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/criar-conta")({
  head: () => ({
    meta: [
      { title: "Criar conta — Nexo Pericial 360" },
      {
        name: "description",
        content: "Crie sua conta na plataforma pericial Nexo Pericial 360.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Criar conta — Nexo Pericial 360" },
      { property: "og:description", content: "Cadastro na plataforma pericial." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nexo-visual-map.lovable.app/criar-conta" },
    ],
    links: [{ rel: "canonical", href: "https://nexo-visual-map.lovable.app/criar-conta" }],
  }),
  component: CriarContaPage,
});

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "Onboarding assistido",
    text: "Passo a passo guiado para começar sem fricção.",
  },
  {
    icon: ShieldCheck,
    title: "Dados seguros por padrão",
    text: "Proteção rigorosa alinhada à LGPD desde o primeiro clique.",
  },
  {
    icon: LifeBuoy,
    title: "Suporte especializado",
    text: "Equipe pericial pronta para orientar sua operação.",
  },
];

function CriarContaPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [perfil, setPerfil] = useState<string>("");
  const [aceite, setAceite] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.success("Cadastro simulado", {
      description: "Em breve conectado ao backend real.",
    });
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
            Comece com o rigor do Nexo Pericial 360.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Uma plataforma pensada para elevar o padrão da sua prática pericial —
            documentação impecável desde o primeiro processo.
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
              Criar sua conta
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre-se para acessar a plataforma pericial.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" placeholder="Seu nome completo" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail profissional</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@escritorio.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil">Perfil de uso</Label>
              <Select value={perfil} onValueChange={setPerfil}>
                <SelectTrigger id="perfil">
                  <SelectValue placeholder="Selecione seu perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perito-judicial">Perito Judicial</SelectItem>
                  <SelectItem value="perito-assistente">Perito Assistente</SelectItem>
                  <SelectItem value="escritorio">Escritório de Advocacia</SelectItem>
                  <SelectItem value="cliente">Cliente / Parte</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmar"
                  name="confirmar"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="aceite"
                checked={aceite}
                onCheckedChange={(v) => setAceite(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="aceite" className="text-sm font-normal leading-relaxed text-muted-foreground">
                Li e aceito os{" "}
                <a href="#" className="font-medium text-primary underline-offset-4 hover:underline">
                  Termos de Uso
                </a>{" "}
                e a{" "}
                <a href="#" className="font-medium text-primary underline-offset-4 hover:underline">
                  Política de Privacidade
                </a>
                .
              </Label>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={!aceite}>
              <UserPlus className="h-4 w-4" />
              Criar conta
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              to="/entrar"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
