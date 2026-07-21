import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Institucional",
    links: ["Sobre nós", "Nossa metodologia", "Equipe técnica", "Trabalhe conosco"],
  },
  {
    title: "Serviços",
    links: ["Perícia Judicial", "Perícia Extrajudicial", "Assistência Técnica", "Pareceres"],
  },
  {
    title: "Contato",
    links: ["Fale conosco", "Solicitar orçamento", "Suporte ao cliente", "Ouvidoria"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <Logo variant="full" className="h-9 w-auto" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Excelência técnica em perícias judiciais e extrajudiciais,
              com rigor documental e compromisso institucional.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© 2026 Nexo Pericial 360. Todos os direitos reservados.</p>
          <p>Rigor. Método. Autoridade documental.</p>
        </div>
      </div>
    </footer>
  );
}
