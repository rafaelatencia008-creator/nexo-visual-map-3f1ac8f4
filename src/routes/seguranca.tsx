import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  UserCheck,
  History,
  Eye,
  FileText,
  Scale,
  ScrollText,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/seguranca")({
  head: () => ({
    meta: [
      { title: "Segurança e privacidade — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Como o Nexo Pericial 360 pretende tratar segurança, privacidade, dados, rastreabilidade, revisão humana, responsabilidade profissional, termos de uso e política de privacidade.",
      },
      {
        property: "og:title",
        content: "Segurança e privacidade — Nexo Pericial 360",
      },
      {
        property: "og:description",
        content:
          "Princípios de segurança, privacidade e responsabilidade profissional na plataforma.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/seguranca" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Segurança e privacidade — Nexo Pericial 360",
      },
      {
        name: "twitter:description",
        content:
          "Princípios de segurança, privacidade e responsabilidade profissional na plataforma.",
      },
    ],
    links: [{ rel: "canonical", href: "/seguranca" }],
  }),
  component: SegurancaPage,
});

type Section = {
  id: string;
  icon: typeof ShieldCheck;
  title: string;
  paragraphs: string[];
};

const SECTIONS: Section[] = [
  {
    id: "informacao",
    icon: Lock,
    title: "Segurança da informação",
    paragraphs: [
      "A plataforma é projetada com controles de acesso, autenticação de contas e separação de dados por profissional e equipe.",
      "Detalhes de configuração, criptografia em trânsito e em repouso serão publicados aqui à medida que os módulos correspondentes forem implementados. Esta versão é uma demonstração visual e não deve receber dados reais.",
    ],
  },
  {
    id: "privacidade",
    icon: Eye,
    title: "Privacidade",
    paragraphs: [
      "O Nexo Pericial 360 lida com informações sensíveis do trabalho pericial e será construído em torno dos princípios de finalidade, necessidade, transparência e responsabilização previstos na legislação brasileira de proteção de dados.",
      "A política de privacidade completa será disponibilizada nesta seção antes de qualquer coleta real de dados. Não envie dados pessoais reais para a versão de demonstração.",
    ],
  },
  {
    id: "dados",
    icon: FileText,
    title: "Tratamento de dados",
    paragraphs: [
      "Dados de casos, entrevistas, documentos e laudos ficarão vinculados ao profissional responsável e à equipe correspondente.",
      "Serão previstos controles para exportação, correção, exclusão e restrição de tratamento, conforme a base legal aplicável a cada tipo de informação.",
    ],
  },
  {
    id: "rastreabilidade",
    icon: History,
    title: "Rastreabilidade",
    paragraphs: [
      "Cada movimentação relevante do caso (documento vinculado, entrevista registrada, laudo revisado) gera um registro no histórico, para que a linha do tempo do trabalho pericial possa ser reconstituída.",
      "Esses registros existem para reforçar a defensabilidade técnica e não substituem a análise humana do profissional.",
    ],
  },
  {
    id: "revisao",
    icon: UserCheck,
    title: "Revisão humana",
    paragraphs: [
      "Qualquer conteúdo gerado por inteligência artificial no Nexo Pericial 360 tem o papel de rascunho ou apoio.",
      "A revisão é feita pelo profissional habilitado, que ajusta, valida e assume o conteúdo final antes de qualquer entrega. O sistema não emite laudos automáticos.",
    ],
  },
  {
    id: "responsabilidade",
    icon: Scale,
    title: "Responsabilidade profissional",
    paragraphs: [
      "O profissional habilitado permanece o único responsável pelo conteúdo técnico dos laudos, pareceres e relatórios produzidos com apoio da plataforma.",
      "O Nexo Pericial 360 não substitui a atuação profissional, o conselho de classe ou os deveres éticos e legais aplicáveis a cada área.",
    ],
  },
  {
    id: "termos",
    icon: ScrollText,
    title: "Termos de Uso",
    paragraphs: [
      "Os Termos de Uso definirão o escopo do serviço, direitos e deveres das partes, limites de responsabilidade da plataforma e regras para o uso adequado das ferramentas.",
      "A versão completa dos termos será publicada nesta seção antes da abertura real da plataforma.",
    ],
  },
];

function SegurancaPage() {
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
                Confiança e responsabilidade
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Segurança e privacidade
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Nossos princípios de proteção de informação, tratamento de
                dados, rastreabilidade, revisão humana e responsabilidade
                profissional. Esta versão da plataforma é uma demonstração
                visual e não possui certificações formais.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg border border-border/60 bg-background p-4 text-sm text-foreground transition-colors hover:bg-muted/40"
              >
                {s.title}
              </a>
            ))}
          </div>

          <div className="mt-14 space-y-10">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Card
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24 border-border/60"
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
                        {s.title}
                      </h2>
                    </div>
                    <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {s.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Dúvidas sobre segurança ou privacidade?
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Envie sua pergunta pela página de contato — responderemos
              conforme evoluímos com a plataforma.
            </p>
            <div className="mt-8">
              <Button asChild>
                <Link to="/contato" className="gap-2">
                  Fale com a equipe
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
