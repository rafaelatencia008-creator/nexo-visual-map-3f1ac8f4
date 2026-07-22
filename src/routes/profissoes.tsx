import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, HandHeart, UsersRound, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/profissoes")({
  head: () => ({
    meta: [
      { title: "Profissões atendidas — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "A primeira versão do Nexo Pericial 360 atende Psicologia, Serviço Social e atuação multiprofissional. Outras áreas serão incorporadas em etapas futuras.",
      },
      { property: "og:title", content: "Profissões atendidas — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Foco inicial em Psicologia, Serviço Social e atuação multiprofissional.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/profissoes" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Profissões atendidas — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content:
          "Foco inicial em Psicologia, Serviço Social e atuação multiprofissional.",
      },
    ],
    links: [{ rel: "canonical", href: "/profissoes" }],
  }),
  component: ProfissoesPage,
});

const PACOTES = [
  {
    icon: Brain,
    title: "Psicologia",
    text: "Avaliações psicológicas, laudos e pareceres técnicos, com apoio na organização de entrevistas, quesitos e estrutura do laudo.",
    itens: [
      "Roteiros de entrevista e observação",
      "Base de quesitos por tipo de avaliação",
      "Modelos de estrutura de laudo psicológico",
    ],
  },
  {
    icon: HandHeart,
    title: "Serviço Social",
    text: "Estudos sociais, pareceres e relatórios técnicos com registro claro das visitas, entrevistas e documentos consultados.",
    itens: [
      "Registro de visitas domiciliares e institucionais",
      "Organização de fontes documentais e depoimentos",
      "Modelos para relatórios e pareceres sociais",
    ],
  },
  {
    icon: UsersRound,
    title: "Atuação multiprofissional",
    text: "Casos em que profissionais de diferentes áreas atuam juntos no mesmo processo, com papéis, prazos e entregas coordenados.",
    itens: [
      "Casos compartilhados entre profissionais",
      "Divisão de tarefas por responsabilidade",
      "Consolidação de laudos e relatórios conjuntos",
    ],
  },
];

function ProfissoesPage() {
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
                Foco inicial da plataforma
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Profissões atendidas
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                A primeira versão do Nexo Pericial 360 é dedicada a
                Psicologia, Serviço Social e à atuação multiprofissional.
                Novas áreas serão incluídas conforme a plataforma evoluir.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {PACOTES.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} className="border-border/60">
                  <CardContent className="p-6">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      {p.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p.text}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                      {p.itens.map((i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            aria-hidden
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
            <Badge variant="outline" className="mb-4">
              Novas áreas em análise
            </Badge>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Outras profissões periciais
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Outras áreas de atuação pericial poderão ser incorporadas em
              etapas futuras, conforme a maturidade da plataforma e a
              validação com profissionais das respectivas áreas.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/contato" className="gap-2">
                  Sugerir uma profissão
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/recursos">Ver recursos da plataforma</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
