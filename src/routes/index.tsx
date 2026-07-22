import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  FileText,
  Calendar,
  ClipboardList,
  Sparkles,
  Layers,
  BookOpen,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Nexo Pericial 360 — Plataforma de apoio ao trabalho pericial",
      },
      {
        name: "description",
        content:
          "Nexo Pericial 360 é uma plataforma que ajuda profissionais e equipes a organizar processos, pessoas, documentos, entrevistas, prazos, análises e laudos, com IA sob revisão humana.",
      },
      {
        property: "og:title",
        content:
          "Nexo Pericial 360 — Plataforma de apoio ao trabalho pericial",
      },
      {
        property: "og:description",
        content:
          "Organize processos, pessoas, documentos e entregas com uma plataforma pensada para apoiar o trabalho pericial multiprofissional.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content:
          "Nexo Pericial 360 — Plataforma de apoio ao trabalho pericial",
      },
      {
        name: "twitter:description",
        content:
          "Organize processos, pessoas, documentos e entregas com uma plataforma pensada para apoiar o trabalho pericial multiprofissional.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const PROBLEMAS = [
  "Documentos, entrevistas e evidências espalhados em pastas soltas.",
  "Prazos processuais controlados manualmente em planilhas.",
  "Revisões e versões de laudos difíceis de reconstituir.",
  "Trabalho em equipe sem trilha clara de responsabilidades.",
];

const RECURSOS = [
  {
    icon: ClipboardList,
    title: "Processos e casos",
    text: "Cadastro estruturado dos processos, com número, comarca, partes e status.",
  },
  {
    icon: Users,
    title: "Pessoas e equipe",
    text: "Clientes, periciandos, profissionais e assistentes organizados em um só lugar.",
  },
  {
    icon: FileText,
    title: "Documentos e evidências",
    text: "Repositório dos autos, anexos e registros vinculados a cada caso.",
  },
  {
    icon: Calendar,
    title: "Agenda e prazos",
    text: "Diligências, entrevistas e prazos processuais em uma linha do tempo clara.",
  },
  {
    icon: BookOpen,
    title: "Quesitos e análises",
    text: "Base de quesitos, roteiros e apontamentos técnicos por área de atuação.",
  },
  {
    icon: Sparkles,
    title: "IA como assistente",
    text: "Rascunhos e sugestões geradas por IA, sempre sob revisão profissional.",
  },
];

const FLUXO = [
  {
    n: "1",
    title: "Cadastro do caso",
    text: "Registre o processo, as pessoas envolvidas e a documentação inicial.",
  },
  {
    n: "2",
    title: "Trabalho de campo",
    text: "Organize entrevistas, diligências e evidências com trilha auditável.",
  },
  {
    n: "3",
    title: "Análise técnica",
    text: "Estruture quesitos, hipóteses e apontamentos com apoio da IA.",
  },
  {
    n: "4",
    title: "Laudo e revisão",
    text: "Rascunhe, revise e entregue o laudo com o profissional responsável.",
  },
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 40% at 20% 0%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(ellipse 40% 30% at 90% 10%, hsl(var(--brand-accent) / 0.08), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--brand-accent)/0.35)] bg-[hsl(var(--brand-accent)/0.08)] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-accent))]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Plataforma de apoio pericial
              </div>

              <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Organize o trabalho pericial{" "}
                <span className="italic text-primary">com método</span>.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                O Nexo Pericial 360 é uma plataforma que apoia profissionais e
                equipes na organização de processos, pessoas, documentos,
                entrevistas, prazos, análises e laudos. A inteligência
                artificial é apenas assistência — o profissional continua
                responsável por todo o conteúdo técnico.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" className="min-w-[220px] gap-2" asChild>
                  <Link to="/contato">
                    Solicitar demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-w-[220px]"
                  asChild
                >
                  <Link to="/produto">Conhecer a plataforma</Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Também disponível:</span>
                <Link
                  to="/recursos"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Ver recursos
                </Link>
                <span aria-hidden>·</span>
                <Link
                  to="/profissoes"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Profissões atendidas
                </Link>
                <span aria-hidden>·</span>
                <Link
                  to="/planos"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Planos
                </Link>
                <span aria-hidden>·</span>
                <Link
                  to="/seguranca"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Segurança
                </Link>
                <span aria-hidden>·</span>
                <Link
                  to="/app"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Ver painel de demonstração
                </Link>
              </div>

              <p className="mt-8 text-xs text-muted-foreground">
                O sistema apresentado é uma demonstração visual. Nenhum dado
                real é enviado, armazenado ou processado nesta versão.
              </p>
            </div>
          </div>
        </section>

        {/* Para quem */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Para quem foi criado
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                A primeira versão do Nexo Pericial 360 é focada em
                Psicologia, Serviço Social e em equipes que atuam de forma
                multiprofissional. Novas áreas serão incorporadas conforme a
                plataforma evoluir.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
              {[
                { title: "Psicologia", text: "Avaliações e laudos psicológicos." },
                {
                  title: "Serviço Social",
                  text: "Estudos sociais e pareceres técnicos.",
                },
                {
                  title: "Multiprofissional",
                  text: "Equipes que atuam em conjunto no mesmo caso.",
                },
              ].map((p) => (
                <Card key={p.title} className="border-border/60">
                  <CardContent className="p-6">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button variant="outline" asChild>
                <Link to="/profissoes">Ver profissões atendidas</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Problemas */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Problemas que ajudamos a resolver
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                O trabalho pericial produz uma quantidade enorme de
                documentos, prazos e decisões. Sem uma trilha clara, cada
                caso vira um esforço isolado de reconstituir o que foi
                feito.
              </p>
            </div>
            <ul className="space-y-3">
              {PROBLEMAS.map((p) => (
                <li
                  key={p}
                  className="flex gap-3 rounded-lg border border-border/60 bg-background p-4"
                >
                  <div
                    aria-hidden
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                  />
                  <p className="text-sm text-foreground">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Recursos */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Principais recursos
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Uma visão geral do que a plataforma organiza. A lista
                completa está na página de recursos.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map((r) => {
                const Icon = r.icon;
                return (
                  <Card key={r.title} className="border-border/60">
                    <CardContent className="p-6">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {r.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {r.text}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-10 flex justify-center">
              <Button asChild>
                <Link to="/recursos" className="gap-2">
                  Ver todos os recursos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Fluxo */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Como funciona o fluxo de trabalho
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Um mesmo caso percorre etapas claras, do primeiro cadastro à
              entrega revisada.
            </p>
          </div>

          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FLUXO.map((f) => (
              <li
                key={f.n}
                className="rounded-lg border border-border/60 bg-background p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {f.n}
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* IA + Responsabilidade */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="rounded-2xl border border-border/60 bg-background p-8 sm:p-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  IA como assistência — nunca como decisão final
                </h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                A inteligência artificial no Nexo Pericial 360 produz
                rascunhos, resumos e sugestões para acelerar tarefas
                repetitivas. Toda saída passa por revisão do profissional
                habilitado, que continua sendo o único responsável pelo
                conteúdo técnico do laudo.
              </p>
              <div className="mt-6">
                <Button variant="outline" asChild>
                  <Link to="/seguranca" className="gap-2">
                    <Layers className="h-4 w-4" />
                    Como funciona a revisão humana
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-primary p-10 text-primary-foreground sm:p-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Quer conhecer a plataforma?
              </h2>
              <p className="mt-4 text-base text-primary-foreground/80">
                Solicite uma demonstração ou explore o painel visual com
                dados fictícios.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/contato" className="gap-2">
                    Solicitar demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
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
