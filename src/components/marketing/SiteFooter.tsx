import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

type FooterLink =
  | { label: string; to: "/produto" | "/recursos" | "/profissoes" | "/planos" | "/seguranca" | "/sobre" | "/contato" | "/entrar" | "/criar-conta" | "/app" }
  | { label: string; to: "/seguranca"; hash: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Plataforma",
    links: [
      { label: "Produto", to: "/produto" },
      { label: "Recursos", to: "/recursos" },
      { label: "Profissões", to: "/profissoes" },
      { label: "Planos", to: "/planos" },
      { label: "Sobre", to: "/sobre" },
    ],
  },
  {
    title: "Confiança",
    links: [
      { label: "Segurança", to: "/seguranca" },
      { label: "Privacidade", to: "/seguranca", hash: "privacidade" },
      { label: "Termos de Uso", to: "/seguranca", hash: "termos" },
      { label: "Revisão humana", to: "/seguranca", hash: "revisao" },
    ],
  },
  {
    title: "Acesso",
    links: [
      { label: "Entrar", to: "/entrar" },
      { label: "Criar conta", to: "/criar-conta" },
      { label: "Painel de demonstração", to: "/app" },
      { label: "Contato", to: "/contato" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <Logo variant="full" className="h-9 w-auto" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plataforma de apoio ao trabalho pericial. Ajuda profissionais a
              organizar processos, pessoas, documentos, prazos e entregas —
              com revisão humana em cada etapa.
            </p>
            <p className="text-xs text-muted-foreground">
              Demonstração visual. Nenhum dado real é processado.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      hash={"hash" in link ? link.hash : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} Nexo Pericial 360. Plataforma em construção.</p>
          <p>Método. Rastreabilidade. Revisão humana.</p>
        </div>
      </div>
    </footer>
  );
}
