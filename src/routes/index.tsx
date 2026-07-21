import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexo Pericial 360 — Perícia técnica com autoridade documental" },
      {
        name: "description",
        content:
          "Nexo Pericial 360 entrega perícias judiciais e extrajudiciais com rigor metodológico, rastreabilidade documental e postura institucional.",
      },
      { property: "og:title", content: "Nexo Pericial 360 — Perícia técnica com autoridade documental" },
      {
        property: "og:description",
        content:
          "Nexo Pericial 360 entrega perícias judiciais e extrajudiciais com rigor metodológico, rastreabilidade documental e postura institucional.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nexo Pericial 360 — Perícia técnica com autoridade documental" },
      {
        name: "twitter:description",
        content: "Nexo Pericial 360 entrega perícias judiciais e extrajudiciais com rigor metodológico, rastreabilidade documental e postura institucional.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* subtle background accents */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 40% at 20% 0%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(ellipse 40% 30% at 90% 10%, hsl(var(--brand-accent) / 0.08), transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          />

          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--brand-accent)/0.35)] bg-[hsl(var(--brand-accent)/0.08)] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-accent))]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Rigor. Método. Autoridade.
              </div>

              <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Perícia técnica com{" "}
                <span className="italic text-primary">autoridade documental</span>.
              </h1>

              <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                O Nexo Pericial 360 conduz perícias judiciais e extrajudiciais com
                metodologia auditável, rastreabilidade completa dos autos e postura
                institucional em cada laudo entregue.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" className="min-w-[200px] gap-2">
                  Solicitar Perícia
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  Conheça a metodologia
                </Button>
              </div>

              <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest text-muted-foreground/70">
                <span>Perícia Judicial</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>Assistência Técnica</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>Pareceres Especializados</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
