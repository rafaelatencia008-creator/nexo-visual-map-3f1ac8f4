import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Target,
  Eye,
  HeartHandshake,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "O Nexo Pericial 360 é uma plataforma que apoia o trabalho pericial de profissionais e equipes. Conheça o propósito, os princípios e a proposta da plataforma.",
      },
      { property: "og:title", content: "Sobre — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Propósito, princípios e proposta da plataforma Nexo Pericial 360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/sobre" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sobre — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content:
          "Propósito, princípios e proposta da plataforma Nexo Pericial 360.",
      },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: SobrePage,
});

const PILLARS = [
  {
    icon: Target,
    title: "Propósito",
    text: "Apoiar o trabalho pericial com uma plataforma que organiza processos, pessoas, documentos, prazos e entregas.",
  },
  {
    icon: Eye,
    title: "Visão",
    text: "Ser uma ferramenta de referência para profissionais periciais que valorizam método, clareza e rastreabilidade.",
  },
  {
    icon: HeartHandshake,
    title: "Valores",
    text: "Rigor técnico, transparência, respeito à responsabilidade profissional e uso responsável de tecnologia.",
  },
];

const NAO_SOMOS = [
  "Não somos um escritório de perícias.",
  "Não realizamos perícias diretamente.",
  "Não substituímos o profissional habilitado.",
  "Não emitimos laudos de forma automática.",
];

function SobrePage() {
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
                Quem somos
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Sobre o Nexo Pericial 360
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Somos uma plataforma dedicada a apoiar profissionais e
                equipes que atuam com perícias — não somos um escritório e
                não realizamos perícias diretamente.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => {
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  Responsabilidade profissional
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  O profissional habilitado permanece o único responsável
                  pelo conteúdo técnico de laudos, pareceres e relatórios
                  produzidos com apoio da plataforma. O Nexo Pericial 360
                  organiza o trabalho e apoia a produção — nunca substitui
                  o profissional.
                </p>
              </div>
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  IA sob revisão humana
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Recursos de inteligência artificial funcionam como
                  assistência: geram rascunhos, resumos e sugestões que
                  precisam passar pela revisão do profissional antes de
                  qualquer entrega. Nada é publicado como conteúdo técnico
                  sem essa revisão.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            O que o Nexo Pericial 360 não é
          </h2>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {NAO_SOMOS.map((n) => (
              <li
                key={n}
                className="rounded-lg border border-border/60 bg-background p-4 text-sm text-foreground"
              >
                {n}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border/60">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Quer conhecer a plataforma?
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Explore o produto, os recursos previstos e a proposta geral
              de trabalho.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/produto" className="gap-2">
                  Conhecer a plataforma
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/recursos">Ver recursos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
