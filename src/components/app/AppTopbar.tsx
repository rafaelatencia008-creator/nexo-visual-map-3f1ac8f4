import * as React from "react";
import { Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { GlobalSearch } from "@/components/app/GlobalSearch";
import { NotificationsPopover } from "@/components/app/NotificationsPopover";
import { UserMenu } from "@/components/app/UserMenu";
import { QuickActionsMenu } from "@/components/app/QuickActions";

export function AppTopbar() {
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = React.useState(false);

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
        className="group flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-background/60 px-3 text-sm text-muted-foreground shadow-sm transition hover:bg-muted/60"
        aria-label="Abrir busca global"
      >
        <Search className="h-4 w-4" />
        <span className="hidden truncate sm:inline">
          Buscar processos, perícias, clientes…
        </span>
        <span className="sm:hidden">Buscar</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline">
          Ctrl K
        </kbd>
      </button>

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
