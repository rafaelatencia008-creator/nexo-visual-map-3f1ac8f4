import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Layers,
  Users,
  FileText,
  Sparkles,
  Workflow,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/produto")({
  head: () => ({
    meta: [
      { title: "Produto — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Entenda o propósito do Nexo Pericial 360: uma plataforma que apoia profissionais a organizar o trabalho pericial com método e revisão humana.",
      },
      { property: "og:title", content: "Produto — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Propósito, princípios e fluxo geral da plataforma Nexo Pericial 360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/produto" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Produto — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content:
          "Propósito, princípios e fluxo geral da plataforma Nexo Pericial 360.",
      },
    ],
    links: [{ rel: "canonical", href: "/produto" }],
  }),
  component: ProdutoPage,
});

const PRINCIPIOS = [
  {
    icon: Workflow,
    title: "Organização do trabalho",
    text: "Cada caso tem lugar próprio: processos, pessoas, documentos, prazos e entregas.",
  },
  {
    icon: Users,
    title: "Trabalho em equipe",
    text: "Papéis claros para profissional responsável, assistentes e apoio administrativo.",
  },
  {
    icon: FileText,
    title: "Trilha documental",
    text: "Registros vinculados ao caso, com histórico das versões de laudo.",
  },
  {
    icon: Sparkles,
    title: "IA como assistente",
    text: "Rascunhos e sugestões que aceleram tarefas — sempre sob revisão profissional.",
  },
  {
    icon: ShieldCheck,
    title: "Responsabilidade profissional",
    text: "O profissional habilitado continua responsável pelo conteúdo técnico.",
  },
  {
    icon: Layers,
    title: "Método pericial",
    text: "Roteiros, quesitos e checklists apoiando cada etapa do trabalho.",
  },
];

const ETAPAS = [
  {
    n: "1",
    title: "Cadastro do caso",
    text: "Processo, partes, pessoas envolvidas, cliente e status inicial.",
  },
  {
    n: "2",
    title: "Coleta e diligências",
    text: "Entrevistas, visitas, documentos e evidências organizadas com data e origem.",
  },
  {
    n: "3",
    title: "Análise técnica",
    text: "Quesitos, hipóteses, apontamentos e roteiros específicos por área.",
  },
  {
    n: "4",
    title: "Rascunho do laudo",
    text: "Estrutura assistida pela plataforma, com sugestões geradas pela IA.",
  },
  {
    n: "5",
    title: "Revisão humana",
    text: "Profissional habilitado revisa, ajusta e assume o conteúdo final.",
  },
  {
    n: "6",
    title: "Entrega e arquivamento",
    text: "Laudo entregue com trilha de versões preservada para consulta futura.",
  },
];

function ProdutoPage() {
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
                O que é o Nexo Pericial 360
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Uma plataforma que apoia o trabalho pericial
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                O Nexo não realiza perícias. Ele apoia quem realiza:
                profissionais e equipes que precisam organizar processos,
                pessoas, documentos, entrevistas, diligências, quesitos,
                evidências, prazos, análises, laudos, revisões e entregas.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Princípios
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              O que orienta cada decisão de produto no Nexo Pericial 360.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPIOS.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} className="border-border/60">
                  <CardContent className="p-6">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {p.title}
                    </h3>
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
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Fluxo geral do trabalho
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Cada caso percorre etapas claras, do primeiro cadastro à
                entrega revisada.
              </p>
            </div>

            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ETAPAS.map((e) => (
                <li
                  key={e.n}
                  className="rounded-lg border border-border/60 bg-background p-6"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {e.n}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {e.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{e.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-8 sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Quer ver o produto em uso?
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                  O painel de demonstração é uma versão visual, com dados
                  fictícios, para você explorar a proposta da plataforma.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Button asChild>
                  <Link to="/contato" className="gap-2">
                    Solicitar demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/app">Ver painel de demonstração</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
