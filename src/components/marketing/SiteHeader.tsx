import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const NAV_ITEMS: { label: string; to?: "/" | "/servicos" | "/sobre" | "/contato" | "/app"; href?: string }[] = [
  { label: "Início", to: "/" },
  { label: "Serviços", to: "/servicos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Contato", to: "/contato" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center" aria-label="Nexo Pericial 360 — Início">
          <Logo variant="full" className="h-9 w-auto" />
        </Link>

        <nav aria-label="Navegação principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeProps={{ className: "text-sm font-medium text-foreground" }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="hidden text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline lg:inline"
          >
            Ver painel (demo)
          </Link>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            Área do Cliente
          </Button>
          <Button size="sm">Solicitar Perícia</Button>
        </div>
      </div>
    </header>
  );
}
