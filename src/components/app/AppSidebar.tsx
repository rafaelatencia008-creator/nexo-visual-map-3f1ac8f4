import {
  LayoutDashboard,
  ClipboardList,
  Gavel,
  Users,
  Calendar,
  UserCog,
  FileBarChart,
  Wallet,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

type NavItem = { label: string; icon: React.ComponentType<{ className?: string }>; href: string; active?: boolean };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "#", active: true },
      { label: "Perícias", icon: ClipboardList, href: "#" },
      { label: "Processos", icon: Gavel, href: "#" },
      { label: "Clientes", icon: Users, href: "#" },
      { label: "Agenda", icon: Calendar, href: "#" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Peritos", icon: UserCog, href: "#" },
      { label: "Relatórios", icon: FileBarChart, href: "#" },
      { label: "Financeiro", icon: Wallet, href: "#" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Configurações", icon: Settings, href: "#" },
      { label: "Ajuda", icon: HelpCircle, href: "#" },
    ],
  },
];

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Logo variant="mark" className="h-8 w-8" />
        <span className="font-display text-lg font-semibold tracking-tight">Nexo 360</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-6 last:mb-0">
            <h4 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              {group.title}
            </h4>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className={
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors " +
                        (item.active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            RS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Dr. Ricardo Silva</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Perito Judicial</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
