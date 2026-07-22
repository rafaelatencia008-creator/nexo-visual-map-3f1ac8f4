/**
 * Estado transitório em memória para os fluxos de acesso e onboarding.
 * NUNCA persiste. NUNCA vai à URL. Some ao recarregar a página.
 */

import { isPerfil, type Perfil } from "@/domain/onboarding";

let pendingPerfil: Perfil | undefined;

export function setPendingPerfil(perfil?: string) {
  if (perfil && isPerfil(perfil)) {
    pendingPerfil = perfil;
  } else {
    pendingPerfil = undefined;
  }
}

export function takePendingPerfil(): Perfil | undefined {
  const p = pendingPerfil;
  pendingPerfil = undefined;
  return p;
}

/** Limpa todo estado transitório de acesso. Chamar em signOut, login normal, Google e guest. */
export function clearAuthTransient() {
  pendingPerfil = undefined;
}
