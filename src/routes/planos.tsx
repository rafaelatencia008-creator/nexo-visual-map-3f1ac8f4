import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Apresentação visual dos planos previstos para o Nexo Pericial 360. Valores, contratação e pagamento ainda não estão ativos nesta versão.",
      },
      { property: "og:title", content: "Planos — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Comparativo visual dos planos Essencial, Profissional, Escritório e Institucional.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/planos" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Planos — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content:
          "Comparativo visual dos planos previstos para o Nexo Pericial 360.",
      },
    ],
    links: [{ rel: "canonical", href: "/planos" }],
  }),
  component: PlanosPage,
});

const PLANOS = [
  {
    nome: "Essencial",
    resumo: "Para profissionais que estão iniciando a organização dos casos.",
    destaque: false,
    itens: [
      "1 profissional",
      "Até 20 processos ativos",
      "Documentos por caso: limitado",
      "Armazenamento: introdutório",
      "Minutos de áudio (IA): reduzidos",
      "Suporte por e-mail",
    ],
  },
  {
    nome: "Profissional",
    resumo: "Para profissionais estabelecidos que atuam com volume regular.",
    destaque: true,
    itens: [
      "1 profissional + apoio administrativo",
      "Processos ativos: ampliados",
      "Documentos por caso: expandido",
      "Armazenamento: expandido",
      "Minutos de áudio (IA): pacote intermediário",
      "Modelos e quesitos por área",
    ],
  },
  {
    nome: "Escritório",
    resumo: "Para equipes multiprofissionais com casos compartilhados.",
    destaque: false,
    itens: [
      "Múltiplos profissionais",
      "Papéis e permissões por equipe",
      "Casos compartilhados",
      "Armazenamento ampliado",
      "Minutos de áudio (IA): pacote avançado",
      "Relatórios operacionais da equipe",
    ],
  },
  {
    nome: "Institucional",
    resumo:
      "Para instituições que precisam de múltiplas equipes e governança.",
    destaque: false,
    itens: [
      "Várias equipes e áreas",
      "Governança de acessos",
      "Casos e projetos por unidade",
      "Armazenamento sob dimensionamento",
      "IA sob dimensionamento e política interna",
      "Atendimento dedicado",
    ],
  },
];

function PlanosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 50% 40% at 50% 0%, hsl(var(--primary) / 0.06), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--brand-accent)/0.35)] bg-[hsl(var(--brand-accent)/0.08)] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-accent))]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Apresentação visual
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Planos previstos
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Uma comparação visual das ideias de plano para o Nexo
                Pericial 360. Valores, contratação e pagamento ainda não
                estão ativos nesta versão.
              </p>
              <p className="mt-6 inline-block rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                Nenhum plano abaixo pode ser contratado no momento.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANOS.map((p) => (
              <Card
                key={p.nome}
                className={
                  p.destaque
                    ? "relative border-primary/60 shadow-md"
                    : "border-border/60"
                }
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                    Mais escolhido
                  </span>
                )}
                <CardContent className="flex h-full flex-col p-6">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {p.nome}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.resumo}
                  </p>

                  <div className="mt-4 rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Valor a definir — apresentação visual.
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {p.itens.map((i) => (
                      <li key={i} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground">{i}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={p.destaque ? "default" : "outline"}
                    className="mt-6 w-full"
                    asChild
                  >
                    <Link to="/contato">Falar sobre este plano</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="rounded-2xl border border-border/60 bg-background p-8 sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge variant="outline">Aviso</Badge>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
                    Contratação ainda indisponível
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                    Esta página é apenas uma prévia visual dos planos. Não
                    há cobrança, checkout, contratação ou pagamento ativos
                    nesta versão. Fale conosco caso queira acompanhar as
                    próximas etapas.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                  <Button asChild>
                    <Link to="/contato" className="gap-2">
                      Falar com a equipe
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/produto">Conhecer a plataforma</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
