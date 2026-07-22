import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User, Building2, SlidersHorizontal, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useSession, PERFIL_LABEL } from "@/hooks/use-session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "UD";
}

export function UserMenu() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const navigate = useNavigate();
  const { session, signOut } = useSession();

  const isGuest = session?.mode === "guest";
  const name = session?.name ?? "Usuário de demonstração";
  const label = isGuest
    ? "Modo convidado · dados fictícios"
    : session?.perfil
      ? `${PERFIL_LABEL[session.perfil] ?? "Perfil profissional"} · sessão simulada`
      : "Sessão simulada · dados fictícios";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menu do usuário"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {initials(name)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs font-normal text-muted-foreground">{label}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/app/perfil" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/selecionar-contexto" className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              Organização / contexto
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/app/preferencias" className="cursor-pointer">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Preferências
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/" className="cursor-pointer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voltar ao site público
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da demonstração
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da demonstração?</AlertDialogTitle>
            <AlertDialogDescription>
              Não há sessão real ativa. Ao confirmar, a sessão simulada será
              encerrada e você retornará à página inicial pública.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                signOut();
                toast.success("Demonstração encerrada");
                navigate({ to: "/" });
              }}
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
