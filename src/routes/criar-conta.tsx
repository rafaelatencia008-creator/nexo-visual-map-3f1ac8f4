import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef, type FormEvent } from "react";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, Loader2, Check, X, Info } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoogleSimuladoDialog } from "@/components/auth/GoogleSimuladoDialog";
import { useSession, setOnboardingReturn } from "@/hooks/use-session";
import { setPendingPerfil, clearAuthTransient } from "@/lib/auth-transient";

export const Route = createFileRoute("/criar-conta")({
  head: () => ({
    meta: [
      { title: "Criar conta (demo) — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Cadastro simulado da demonstração visual do Nexo Pericial 360 — nenhuma conta real é criada.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Criar conta (demo) — Nexo Pericial 360" },
      {
        property: "og:description",
        content: "Demonstração visual — nenhum cadastro real é efetivado.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CriarContaPage,
});

const PERFIS = [
  { value: "psicologia", label: "Psicologia" },
  { value: "servico-social", label: "Serviço Social" },
  { value: "multi", label: "Equipe multiprofissional" },
  { value: "outro", label: "Outro" },
];

function senhaRequisitos(senha: string) {
  return {
    len: senha.length >= 8,
    letra: /[A-Za-zÀ-ÿ]/.test(senha),
    numero: /\d/.test(senha),
  };
}

const schema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo (mínimo 3 caracteres).")
      .max(120, "Nome muito longo."),
    email: z.string().trim().min(1, "Informe seu e-mail.").email("Formato inválido."),
    perfil: z.string().min(1, "Escolha o perfil profissional."),
    senha: z
      .string()
      .min(8, "A senha deve ter no mínimo 8 caracteres.")
      .refine((v) => /[A-Za-zÀ-ÿ]/.test(v), "A senha deve conter letras.")
      .refine((v) => /\d/.test(v), "A senha deve conter pelo menos um número."),
    confirmar: z.string().min(1, "Confirme sua senha."),
    aceiteTermos: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar os Termos de Uso." }),
    }),
    aceitePrivacidade: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar a Política de Privacidade." }),
    }),
  })
  .refine((d) => d.senha === d.confirmar, {
    path: ["confirmar"],
    message: "As senhas não coincidem.",
  });

type FieldErrors = Partial<
  Record<
    "nome" | "email" | "perfil" | "senha" | "confirmar" | "aceiteTermos" | "aceitePrivacidade",
    string
  >
>;

function CriarContaPage() {
  const navigate = useNavigate();
  const { signInAsUser } = useSession();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const focusRefs = {
    nome: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    senha: useRef<HTMLInputElement>(null),
    confirmar: useRef<HTMLInputElement>(null),
  };

  const req = useMemo(() => senhaRequisitos(senha), [senha]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse({
      nome,
      email,
      perfil,
      senha,
      confirmar,
      aceiteTermos,
      aceitePrivacidade,
    });
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fe[key]) fe[key] = issue.message;
      }
      setErrors(fe);
      const order: (keyof FieldErrors)[] = [
        "nome",
        "email",
        "perfil",
        "senha",
        "confirmar",
        "aceiteTermos",
        "aceitePrivacidade",
      ];
      const first = order.find((k) => fe[k]);
      if (first && first !== "perfil" && first !== "aceiteTermos" && first !== "aceitePrivacidade") {
        focusRefs[first as "nome" | "email" | "senha" | "confirmar"]?.current?.focus();
      } else if (first === "perfil") {
        document.getElementById("perfil")?.focus();
      }
      return;
    }

    setErrors({});
    setLoading(true);
    // Um novo cadastro descarta qualquer transient anterior.
    clearAuthTransient();
    setPendingPerfil(parsed.data.perfil);
    setSenha("");
    setConfirmar("");
    window.setTimeout(() => {
      setLoading(false);
      navigate({ to: "/verificar-email" });
    }, 500);
  };

  const confirmarGoogle = () => {
    setGoogleOpen(false);
    // Google simulado (a partir do cadastro): limpa transient antigo.
    clearAuthTransient();
    signInAsUser({
      name: "Usuário de demonstração",
      remember: false,
    });
    toast.success("Cadastro simulado com Google iniciado");
    setOnboardingReturn(undefined);
    navigate({ to: "/onboarding" });
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
            Experimente a plataforma no seu ritmo.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Este cadastro é apenas visual. Nenhuma conta real é criada, nenhum
            e-mail é enviado e nenhuma senha é armazenada.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/75">
            <li>· Explore fluxos de Psicologia e Serviço Social.</li>
            <li>· Descubra a organização em equipe multiprofissional.</li>
            <li>· Teste o painel sem compromisso.</li>
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
              Criar conta de demonstração
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Preencha os dados para simular o cadastro. Nenhum dado é enviado ou
              armazenado além do seu navegador.
            </p>
          </div>

          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Cadastro <strong>simulado</strong>: nenhuma senha é salva, nenhum
              e-mail real é enviado.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                ref={focusRefs.nome}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
                aria-invalid={!!errors.nome}
                aria-describedby={errors.nome ? "nome-error" : undefined}
              />
              {errors.nome && (
                <p id="nome-error" className="text-xs font-medium text-destructive">
                  {errors.nome}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail profissional</Label>
              <Input
                id="email"
                ref={focusRefs.email}
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@escritorio.com"
                autoComplete="email"
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
              <Label htmlFor="perfil">Perfil profissional</Label>
              <Select value={perfil} onValueChange={setPerfil}>
                <SelectTrigger id="perfil" aria-invalid={!!errors.perfil}>
                  <SelectValue placeholder="Selecione seu perfil" />
                </SelectTrigger>
                <SelectContent>
                  {PERFIS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.perfil && (
                <p className="text-xs font-medium text-destructive">{errors.perfil}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  ref={focusRefs.senha}
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres, com letras e número"
                  autoComplete="new-password"
                  aria-invalid={!!errors.senha}
                  aria-describedby="senha-req senha-error"
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
              <ul id="senha-req" className="mt-1 space-y-1 text-xs">
                <ReqItem ok={req.len} label="Mínimo de 8 caracteres" />
                <ReqItem ok={req.letra} label="Pelo menos uma letra" />
                <ReqItem ok={req.numero} label="Pelo menos um número" />
              </ul>
              {errors.senha && (
                <p id="senha-error" className="text-xs font-medium text-destructive">
                  {errors.senha}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmar"
                  ref={focusRefs.confirmar}
                  type={showConfirm ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmar}
                  aria-describedby={errors.confirmar ? "confirmar-error" : undefined}
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
              {errors.confirmar && (
                <p id="confirmar-error" className="text-xs font-medium text-destructive">
                  {errors.confirmar}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="termos"
                  checked={aceiteTermos}
                  onCheckedChange={(v) => setAceiteTermos(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="termos" className="text-sm font-normal leading-relaxed text-muted-foreground">
                  Li e aceito os{" "}
                  <Link to="/seguranca" className="font-medium text-primary underline-offset-4 hover:underline">
                    Termos de Uso
                  </Link>
                  .
                </Label>
              </div>
              {errors.aceiteTermos && (
                <p className="text-xs font-medium text-destructive">{errors.aceiteTermos}</p>
              )}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacidade"
                  checked={aceitePrivacidade}
                  onCheckedChange={(v) => setAceitePrivacidade(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="privacidade" className="text-sm font-normal leading-relaxed text-muted-foreground">
                  Li e aceito a{" "}
                  <Link to="/seguranca" className="font-medium text-primary underline-offset-4 hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </Label>
              </div>
              {errors.aceitePrivacidade && (
                <p className="text-xs font-medium text-destructive">{errors.aceitePrivacidade}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar conta
                </>
              )}
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
            onClick={() => setGoogleOpen(true)}
          >
            Continuar com Google — simulação
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </main>

      <GoogleSimuladoDialog
        open={googleOpen}
        onOpenChange={setGoogleOpen}
        onConfirm={confirmarGoogle}
        action="criar"
      />
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
