import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  redirectTo?: string;
};

/**
 * Substitui os antigos <Link to="/app"> das páginas públicas.
 * Inicia o modo convidado (sessão simulada) antes de abrir o painel.
 */
export const GuestDemoButton = React.forwardRef<HTMLButtonElement, Props>(
  function GuestDemoButton({ redirectTo = "/app", onClick, children, ...rest }, ref) {
    const navigate = useNavigate();
    const { signInAsGuest } = useSession();

    const handle = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      signInAsGuest();
      toast.info("Modo convidado ativo", {
        description: "Todos os dados exibidos são fictícios.",
      });
      navigate({ to: redirectTo });
    };

    return (
      <button ref={ref} type="button" {...rest} onClick={handle}>
        {children}
      </button>
    );
  },
);
