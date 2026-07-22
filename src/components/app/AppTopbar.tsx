import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Search, Sun, Moon, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/hooks/use-session";
import { getContextById } from "@/services/context-service";
import { GlobalSearch } from "@/components/app/GlobalSearch";
import { NotificationsPopover } from "@/components/app/NotificationsPopover";
import { UserMenu } from "@/components/app/UserMenu";
import { QuickActionsMenu } from "@/components/app/QuickActions";

export function AppTopbar() {
  const { theme, toggle } = useTheme();
  const { session } = useSession();
  const [searchOpen, setSearchOpen] = React.useState(false);

  const currentContext = getContextById(session?.currentContextId);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/85 px-3 backdrop-blur sm:gap-4 sm:px-6">
      <SidebarTrigger aria-label="Alternar navegação" />

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="group flex h-9 min-w-0 flex-1 max-w-md items-center gap-2 rounded-md border border-input bg-background/60 px-3 text-sm text-muted-foreground shadow-sm transition hover:bg-muted/60"
        aria-label="Abrir busca global"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden truncate sm:inline">
          Buscar processos, perícias, clientes…
        </span>
        <span className="sm:hidden">Buscar</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline">
          Ctrl K
        </kbd>
      </button>

      {currentContext && (
        <Link
          to="/selecionar-contexto"
          className="hidden max-w-[16rem] items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground md:inline-flex"
          title="Trocar contexto"
          aria-label={`Contexto atual: ${currentContext.nome}. Trocar contexto.`}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{currentContext.nome}</span>
        </Link>
      )}

      <div className="ml-auto flex items-center gap-1">
        <div className="hidden sm:block">
          <QuickActionsMenu />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <NotificationsPopover />
        <UserMenu />
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

