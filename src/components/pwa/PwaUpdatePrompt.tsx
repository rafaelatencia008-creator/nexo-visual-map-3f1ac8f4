/**
 * PWA-01 — prompt acessível de atualização do service worker.
 *
 * Regras:
 *  - registra o service worker somente no cliente (efeito colateral do
 *    hook `useRegisterSW`);
 *  - nunca acessa `window` durante SSR (o hook é seguro em Node porque
 *    verifica `navigator` internamente, mas a UI só renderiza no cliente);
 *  - detecta nova versão via `onNeedRefresh`;
 *  - NÃO recarrega automaticamente — a atualização só acontece por ação
 *    explícita do usuário (evita perda de formulário em edição);
 *  - não usa `window.location.reload()`, timers ou polling manual;
 *  - reutiliza apenas os componentes visuais já existentes.
 */

import * as React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
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

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Silenciamos onRegisteredSW/onRegisterError — o registro é opaco
    // ao usuário. Falhas de registro (ex.: sem HTTPS em preview local)
    // não devem quebrar a aplicação.
    onRegisteredSW() {},
    onRegisterError() {},
  });

  const dismiss = React.useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  const applyUpdate = React.useCallback(() => {
    // O próprio hook coordena o skipWaiting + reload controlado.
    // NÃO chamamos window.location.reload() aqui.
    void updateServiceWorker(true);
  }, [updateServiceWorker]);

  return (
    <AlertDialog
      open={needRefresh}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualização disponível</AlertDialogTitle>
          <AlertDialogDescription>
            Uma nova versão do Nexo Pericial 360 está pronta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>Agora não</AlertDialogCancel>
          <AlertDialogAction onClick={applyUpdate}>
            Atualizar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default PwaUpdatePrompt;
