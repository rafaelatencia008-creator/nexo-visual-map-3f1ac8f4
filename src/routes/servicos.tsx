import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gavel,
  Handshake,
  UserCheck,
  FileSearch,
  PenLine,
  ScrollText,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Perícias judiciais, extrajudiciais, assistência técnica, pareceres, perícia grafotécnica e documentoscópica conduzidas com rigor metodológico.",
      },
      { property: "og:title", content: "Serviços — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Modalidades periciais oferecidas pelo Nexo Pericial 360 com rigor documental e autoridade técnica.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nexo-visual-map.lovable.app/servicos" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Serviços — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content: "Modalidades periciais com rigor documental e autoridade técnica.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nexo-visual-map.lovable.app/servicos" }],
  }),
  component: ServicosPage,
});

const SERVICES = [
  {
    icon: Gavel,
    title: "Perícia Judicial",
    description:
      "Atuação como perito nomeado em juízo, com laudo técnico rastreável e postura processual rigorosa.",
  },
  {
    icon: Handshake,
    title: "Perícia Extrajudicial",
    description:
      "Perícias particulares para partes, seguradoras e empresas, com relatórios independentes e defensáveis.",
  },
  {
    icon: UserCheck,
    title: "Assistência Técnica",
    description:
      "Assessoria técnica a advogados, elaboração de quesitos e crítica fundamentada a laudos oficiais.",
  },
  {
    icon: FileSearch,
    title: "Pareceres Especializados",
    description:
      "Pareceres técnicos autorais em temas complexos, com metodologia documentada e conclusões auditáveis.",
  },
  {
    icon: PenLine,
    title: "Perícia Grafotécnica",
    description:
      "Exame de autenticidade de assinaturas, escritos manuscritos e comparação grafoscópica.",
  },
  {
    icon: ScrollText,
    title: "Perícia Documentoscópica",
    description:
      "Análise de documentos, verificação de adulterações, alterações e integridade de suportes.",
  },
];

function ServicosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Page header */}
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
                Modalidades periciais
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Nossos serviços
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Atuamos em todo o ciclo pericial — da nomeação à entrega do laudo —
                com metodologia auditável e rastreabilidade completa dos autos.
              </p>
            </div>
          </div>
        </section>

        {/* Services grid */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.title}
                  className="group border-border/60 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="font-display text-xl">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Precisa de uma perícia?
              </h2>
              <p className="mt-4 max-w-xl text-base text-muted-foreground">
                Nossa equipe está pronta para avaliar seu caso e propor a modalidade
                pericial mais adequada.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="min-w-[200px] gap-2" asChild>
                  <Link to="/">
                    Fale conosco
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="min-w-[200px]" asChild>
                  <Link to="/">Voltar ao início</Link>
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
