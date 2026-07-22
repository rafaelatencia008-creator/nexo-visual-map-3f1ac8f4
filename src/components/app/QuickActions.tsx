import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Plus, FilePlus2, Gavel, Calendar, UploadCloud, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const QUICK_ACTIONS = [
  { label: "Nova perícia", to: "/app/pericias/nova", icon: FilePlus2 },
  { label: "Novo processo", to: "/app/processos/novo", icon: Gavel },
  { label: "Abrir agenda", to: "/app/agenda", icon: Calendar },
  { label: "Enviar documento", to: "/app/documentos", icon: UploadCloud },
  { label: "Iniciar laudo", to: "/app/laudos", icon: FileSignature },
] as const;

export function QuickActionsMenu({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <DropdownMenuItem key={a.to} asChild>
              <Link to={a.to} className="cursor-pointer">
                <Icon className="mr-2 h-4 w-4" />
                {a.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
