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

export function UserMenu() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menu do usuário"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            UD
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Usuário de demonstração</span>
            <span className="text-xs font-normal text-muted-foreground">
              Perfil profissional · dados fictícios
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/app/perfil" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/app/organizacao" className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              Organização
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
              Não há sessão real ativa. Ao confirmar, você retornará à página inicial pública.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
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
