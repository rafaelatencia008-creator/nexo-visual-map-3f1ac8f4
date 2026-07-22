import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Route as RouteIcon,
  HelpCircle,
  Fingerprint,
  Microscope,
  ScrollText,
  RefreshCcw,
  UsersRound,
  BarChart3,
  Settings,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Módulos da plataforma Nexo Pericial 360: processos, pessoas, agenda, documentos, entrevistas, diligências, quesitos, evidências, análises, laudos, revisão, equipe, relatórios e administração.",
      },
      { property: "og:title", content: "Recursos — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Visão geral dos módulos da plataforma, indicando o que já é demonstração visual e o que virá em etapas futuras.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/recursos" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Recursos — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content:
          "Visão geral dos módulos da plataforma Nexo Pericial 360.",
      },
    ],
    links: [{ rel: "canonical", href: "/recursos" }],
  }),
  component: RecursosPage,
});

type Status = "demo" | "roadmap";

const RECURSOS: {
  icon: typeof ClipboardList;
  title: string;
  text: string;
  status: Status;
}[] = [
  {
    icon: ClipboardList,
    title: "Processos",
    text: "Cadastro estruturado com número CNJ, comarca, vara, partes e status.",
    status: "demo",
  },
  {
    icon: Users,
    title: "Pessoas e clientes",
    text: "Pessoas físicas e jurídicas envolvidas em cada caso.",
    status: "demo",
  },
  {
    icon: UsersRound,
    title: "Equipe e profissionais",
    text: "Profissionais responsáveis, assistentes e apoio administrativo.",
    status: "demo",
  },
  {
    icon: Calendar,
    title: "Agenda e prazos",
    text: "Compromissos, diligências e prazos processuais em linha do tempo.",
    status: "demo",
  },
  {
    icon: FileText,
    title: "Documentos",
    text: "Repositório dos autos, anexos e peças vinculadas ao caso.",
    status: "roadmap",
  },
  {
    icon: MessageSquare,
    title: "Entrevistas",
    text: "Roteiros, registros de entrevistas e observações do profissional.",
    status: "roadmap",
  },
  {
    icon: RouteIcon,
    title: "Diligências",
    text: "Planejamento, execução e registro das diligências de campo.",
    status: "roadmap",
  },
  {
    icon: HelpCircle,
    title: "Quesitos",
    text: "Biblioteca de quesitos por área e organização por caso.",
    status: "roadmap",
  },
  {
    icon: Fingerprint,
    title: "Evidências",
    text: "Registro das evidências com origem, data e vínculo com o caso.",
    status: "roadmap",
  },
  {
    icon: Microscope,
    title: "Análises",
    text: "Apontamentos técnicos, hipóteses e correlações por profissional.",
    status: "roadmap",
  },
  {
    icon: ScrollText,
    title: "Laudos",
    text: "Estruturação e rascunho do laudo com apoio da IA.",
    status: "roadmap",
  },
  {
    icon: RefreshCcw,
    title: "Revisão",
    text: "Trilha de versões e revisão pelo profissional habilitado.",
    status: "roadmap",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    text: "Indicadores operacionais da equipe e dos casos.",
    status: "roadmap",
  },
  {
    icon: Settings,
    title: "Administração",
    text: "Configurações, papéis, permissões e preferências da equipe.",
    status: "roadmap",
  },
];

function RecursosPage() {
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
                Módulos da plataforma
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Recursos planejados
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Uma visão geral dos módulos previstos para o Nexo Pericial
                360. Cada cartão indica se o recurso já está disponível na
                demonstração visual ou se será implementado em etapas
                futuras.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Badge variant="secondary">Demonstração visual</Badge>
                <Badge variant="outline">Etapas futuras</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((r) => {
              const Icon = r.icon;
              return (
                <Card key={r.title} className="border-border/60">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      {r.status === "demo" ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Demo visual
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Em etapa futura
                        </Badge>
                      )}
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
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Quer ver os módulos disponíveis?
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              O painel de demonstração apresenta os módulos já esboçados
              com dados fictícios.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <GuestDemoButton className="gap-2">
                  Ver painel de demonstração
                  <ArrowRight className="h-4 w-4" />
                </GuestDemoButton>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contato">Solicitar demonstração</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
