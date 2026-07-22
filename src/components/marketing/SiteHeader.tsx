import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, LogIn, UserPlus, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { GuestDemoButton } from "@/components/marketing/GuestDemoButton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavTo =
  | "/"
  | "/produto"
  | "/recursos"
  | "/profissoes"
  | "/planos"
  | "/seguranca"
  | "/contato";

const NAV_ITEMS: { label: string; to: NavTo }[] = [
  { label: "Início", to: "/" },
  { label: "Produto", to: "/produto" },
  { label: "Recursos", to: "/recursos" },
  { label: "Profissões", to: "/profissoes" },
  { label: "Planos", to: "/planos" },
  { label: "Segurança", to: "/seguranca" },
  { label: "Contato", to: "/contato" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:flex lg:gap-6 lg:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center"
          aria-label="Nexo Pericial 360 — Início"
        >
          <Logo variant="full" className="h-9 w-auto shrink-0" />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Navegação principal"
          className="hidden flex-1 lg:block"
        >
          <ul className="flex items-center justify-center gap-6 xl:gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{
                    className: "text-sm font-medium text-foreground",
                  }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop actions */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/entrar">Entrar</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/criar-conta">Criar conta</Link>
          </Button>
          <Button size="sm" asChild>
            <GuestDemoButton>Painel de demonstração</GuestDemoButton>
          </Button>
        </div>

        {/* Mobile trigger */}
        <div className="flex shrink-0 items-center lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir menu"
                aria-expanded={open}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-sm overflow-y-auto"
            >
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <nav aria-label="Navegação principal (móvel)" className="mt-6">
                <ul className="space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        activeProps={{
                          className:
                            "block rounded-md px-3 py-2 text-sm font-semibold text-primary bg-primary/10",
                        }}
                        activeOptions={{ exact: item.to === "/" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-8 space-y-2 border-t border-border/60 pt-6">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  asChild
                >
                  <Link to="/entrar" onClick={() => setOpen(false)}>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  asChild
                >
                  <Link to="/criar-conta" onClick={() => setOpen(false)}>
                    <UserPlus className="h-4 w-4" />
                    Criar conta
                  </Link>
                </Button>
                <Button className="w-full justify-start gap-2" asChild>
                  <GuestDemoButton onClick={() => setOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" />
                    Painel de demonstração
                  </GuestDemoButton>
                </Button>
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                O painel é uma demonstração visual com dados fictícios.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
