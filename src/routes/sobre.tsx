import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Target,
  Eye,
  HeartHandshake,
  ShieldCheck,
  FileLock2,
  History,
  LayoutDashboard,
  Scale,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Conheça o Nexo Pericial 360: missão, visão, valores e diferenciais de uma plataforma pericial pautada por rigor, rastreabilidade e conformidade.",
      },
      { property: "og:title", content: "Sobre — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Missão, visão, valores e diferenciais da plataforma Nexo Pericial 360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nexo-visual-map.lovable.app/sobre" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sobre — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content: "Rigor pericial, rastreabilidade e conformidade em uma única plataforma.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nexo-visual-map.lovable.app/sobre" }],
  }),
  component: SobrePage,
});

const PILLARS = [
  {
    icon: Target,
    title: "Missão",
    description:
      "Elevar o padrão da prática pericial no Brasil por meio de uma plataforma que une método científico, tecnologia e rastreabilidade documental.",
  },
  {
    icon: Eye,
    title: "Visão",
    description:
      "Ser a referência nacional em gestão pericial 360°, reconhecida por peritos, escritórios e tribunais pela confiabilidade dos seus registros.",
  },
  {
    icon: HeartHandshake,
    title: "Valores",
    description:
      "Rigor técnico, imparcialidade, transparência processual, proteção de dados e responsabilidade com cada laudo produzido.",
  },
];

const DIFERENCIAIS = [
  {
    icon: History,
    title: "Timeline auditável",
    description:
      "Cada movimentação do processo pericial fica registrada em linha do tempo imutável, pronta para auditoria.",
  },
  {
    icon: FileLock2,
    title: "Conformidade LGPD",
    description:
      "Tratamento de dados sensíveis com controles de acesso, minimização e finalidade documentada.",
  },
  {
    icon: LayoutDashboard,
    title: "Gestão 360°",
    description:
      "Peritos, clientes, processos, prazos e financeiro concentrados em um único painel operacional.",
  },
  {
    icon: ShieldCheck,
    title: "Rastreabilidade documental",
    description:
      "Versionamento de documentos e histórico de alterações garantem defensabilidade em qualquer instância.",
  },
  {
    icon: Scale,
    title: "Método pericial rigoroso",
    description:
      "Modelos e checklists alinhados às boas práticas técnicas, com quesitos e conclusões auditáveis.",
  },
  {
    icon: BadgeCheck,
    title: "Autoridade profissional",
    description:
      "Ambiente pensado para reforçar a credibilidade do perito perante juízo, partes e assistentes técnicos.",
  },
];

function SobrePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
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
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Uma plataforma dedicada a peritos e escritórios que valorizam método,
                documentação impecável e autoridade técnica em cada laudo entregue.
              </p>
            </div>
          </div>
        </section>

        {/* Missão / Visão / Valores */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card key={pillar.title} className="border-border/60">
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="font-display text-xl">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {pillar.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Diferenciais */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Nossos diferenciais
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Pilares que sustentam a confiança de quem opera com o Nexo Pericial 360.
              </p>
            </div>

            <ul className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
              {DIFERENCIAIS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="flex gap-4 rounded-lg border border-border/60 bg-background p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Conheça o que entregamos
              </h2>
              <p className="mt-4 max-w-xl text-base text-muted-foreground">
                Explore as modalidades periciais disponíveis na plataforma.
              </p>
              <div className="mt-8">
                <Button size="lg" className="min-w-[220px] gap-2" asChild>
                  <Link to="/servicos">
                    Conheça os serviços
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
