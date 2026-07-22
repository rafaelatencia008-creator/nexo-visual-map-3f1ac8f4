/**
 * Estado transitório em memória para o fluxo de acesso simulado.
 *
 * Regras:
 * - Vive apenas em memória (variável de módulo).
 * - NUNCA persiste em localStorage/sessionStorage.
 * - NUNCA transita por URL/hash.
 * - Some ao recarregar a página — nesse caso a verificação continua
 *   funcionando com um perfil neutro.
 *
 * Só carrega dados NÃO sensíveis (perfil profissional). Nome, e-mail,
 * senha, código e aceites jamais passam por aqui.
 */

let pendingPerfil: string | undefined;

const PERFIS_VALIDOS = new Set(["psicologia", "servico-social", "multi", "outro"]);

export function setPendingPerfil(perfil?: string) {
  if (perfil && PERFIS_VALIDOS.has(perfil)) {
    pendingPerfil = perfil;
  } else {
    pendingPerfil = undefined;
  }
}

export function takePendingPerfil(): string | undefined {
  const p = pendingPerfil;
  pendingPerfil = undefined;
  return p;
}

export function clearAuthTransient() {
  pendingPerfil = undefined;
}
