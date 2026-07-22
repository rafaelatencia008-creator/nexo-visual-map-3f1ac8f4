import * as React from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  action: "entrar" | "criar";
};

export function GoogleSimuladoDialog({ open, onOpenChange, onConfirm, action }: Props) {
  const titulo =
    action === "entrar"
      ? "Continuar com Google — simulação"
      : "Criar conta com Google — simulação";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Este é um fluxo <strong>simulado</strong>. Nenhuma conta Google será
                acessada, nenhuma janela externa será aberta e nenhum dado será enviado.
              </p>
              <p>
                Ao continuar, criaremos uma sessão fictícia com identificação neutra
                e você abrirá o painel de demonstração.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continuar simulação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
