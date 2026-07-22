import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Gavel, Calendar, Plus, MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { APP_NAV } from "@/lib/app-nav";
import { Logo } from "@/components/brand/Logo";
import { QUICK_ACTIONS } from "@/components/app/QuickActions";

type Item = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
} & (
  | { to: string; kind: "link" }
  | { kind: "novo" }
  | { kind: "mais" }
);

const ITEMS: Item[] = [
  { kind: "link", label: "Início", to: "/app", icon: Home },
  { kind: "link", label: "Processos", to: "/app/processos", icon: Gavel },
  { kind: "novo", label: "Novo", icon: Plus },
  { kind: "link", label: "Agenda", to: "/app/agenda", icon: Calendar },
  { kind: "mais", label: "Mais", icon: MoreHorizontal },
];

function isActive(pathname: string, to: string) {
  if (to === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [novoOpen, setNovoOpen] = React.useState(false);
  const [maisOpen, setMaisOpen] = React.useState(false);

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="grid grid-cols-5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            if (item.kind === "link") {
              const active = isActive(pathname, item.to);
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            }
            if (item.kind === "novo") {
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => setNovoOpen(true)}
                    className="flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-primary"
                    aria-label="Abrir ações rápidas"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => setMaisOpen(true)}
                  className="flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  aria-label="Abrir mais opções"
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sheet "Novo" — ações rápidas */}
      <Sheet open={novoOpen} onOpenChange={setNovoOpen}>
        <SheetContent side="bottom" className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>Ações rápidas</SheetTitle>
            <SheetDescription>Escolha o que deseja iniciar.</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 grid gap-1">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.to}>
                  <Link
                    to={a.to}
                    onClick={() => setNovoOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {a.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>

      {/* Sheet "Mais" — restante da navegação */}
      <Sheet open={maisOpen} onOpenChange={setMaisOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <Logo variant="full" className="mb-2 h-10 w-auto max-w-[200px]" />
            <SheetTitle>Todos os módulos</SheetTitle>
            <SheetDescription>Navegue por todas as áreas do sistema.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            {APP_NAV.map((group) => (
              <div key={group.title}>
                <h4 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.title}
                </h4>
                <ul className="grid gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setMaisOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{item.label}</span>
                          {item.construction && (
                            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                              Em breve
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
