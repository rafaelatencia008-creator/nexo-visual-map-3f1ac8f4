import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Gavel,
  Users,
  ClipboardList,
  UserCog,
  Calendar,
  LayoutGrid,
} from "lucide-react";
import { processos, clientes, pericias, peritos } from "@/lib/mock/data";
import { ALL_NAV_ITEMS } from "@/lib/app-nav";
import { formatDate } from "@/lib/format";

type Result = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TIPO_LABEL: Record<string, string> = {
  engenharia_civil: "Eng. Civil",
  grafotecnica: "Grafotécnica",
  contabil: "Contábil",
  medica: "Médica",
  ambiental: "Ambiental",
  trabalhista: "Trabalhista",
};

function buildIndex(): Result[] {
  const items: Result[] = [];

  processos.forEach((p) => {
    const cliente = clientes.find((c) => c.id === p.clienteId);
    items.push({
      id: `pro-${p.id}`,
      type: "Processo",
      title: p.numero,
      subtitle: `${p.vara} · ${p.comarca}${cliente ? " · " + cliente.nome : ""}`,
      to: `/app/processos/${p.id}`,
      icon: Gavel,
    });
  });

  clientes.forEach((c) => {
    items.push({
      id: `cli-${c.id}`,
      type: "Cliente",
      title: c.nome,
      subtitle: `${c.tipoPessoa} · ${c.email}`,
      to: `/app/clientes/${c.id}`,
      icon: Users,
    });
  });

  pericias.forEach((p) => {
    const processo = processos.find((pr) => pr.id === p.processoId);
    items.push({
      id: `prc-${p.id}`,
      type: "Perícia",
      title: `${TIPO_LABEL[p.tipo] ?? p.tipo} · ${processo?.numero ?? "—"}`,
      subtitle: `Agendada para ${formatDate(p.dataAgendada)}`,
      to: `/app/pericias/${p.id}`,
      icon: ClipboardList,
    });
  });

  peritos.forEach((p) => {
    items.push({
      id: `per-${p.id}`,
      type: "Perito",
      title: p.nome,
      subtitle: `${p.registroProfissional} · ${TIPO_LABEL[p.especialidade] ?? p.especialidade}`,
      to: `/app/peritos/${p.id}`,
      icon: UserCog,
    });
  });

  // Compromissos da agenda: usa as próximas 5 perícias como "compromissos"
  [...pericias]
    .sort((a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime())
    .slice(0, 5)
    .forEach((p) => {
      items.push({
        id: `agd-${p.id}`,
        type: "Agenda",
        title: `Compromisso · ${TIPO_LABEL[p.tipo] ?? p.tipo}`,
        subtitle: formatDate(p.dataAgendada),
        to: `/app/agenda`,
        icon: Calendar,
      });
    });

  ALL_NAV_ITEMS.forEach((item) => {
    items.push({
      id: `mod-${item.to}`,
      type: "Módulo",
      title: item.label,
      subtitle: item.description ?? "Módulo do sistema",
      to: item.to,
      icon: LayoutGrid,
    });
  });

  return items;
}

const INDEX = buildIndex();

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [] as Result[];
    return INDEX.filter(
      (r) => normalize(r.title).includes(q) || normalize(r.subtitle).includes(q),
    ).slice(0, 40);
  }, [query]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, Result[]> = {};
    results.forEach((r) => {
      groups[r.type] = groups[r.type] ?? [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca global"
      description="Localize processos, clientes, perícias, peritos, compromissos e módulos."
    >
      <CommandInput
        placeholder="Buscar processos, clientes, perícias, peritos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() === "" ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Comece a digitar para buscar em dados fictícios da demonstração.
          </div>
        ) : results.length === 0 ? (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        ) : (
          Object.entries(grouped).map(([tipo, items]) => (
            <CommandGroup key={tipo} heading={tipo}>
              {items.map((r) => {
                const Icon = r.icon;
                return (
                  <CommandItem
                    key={r.id}
                    value={`${r.type} ${r.title} ${r.subtitle}`}
                    onSelect={() => go(r.to)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {r.subtitle}
                      </span>
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {r.type}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </CommandDialog>
  );
}
