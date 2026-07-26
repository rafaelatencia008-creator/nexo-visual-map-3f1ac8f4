/**
 * LV-17 — Helpers de segurança frontend para conteúdo mock.
 *
 * Puro TypeScript. Não usa rede, não usa storage, não executa HTML arbitrário.
 */

/**
 * Escapa caracteres perigosos para inserção segura em HTML (impressão local).
 */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitiza um nome de arquivo removendo caracteres proibidos por
 * sistemas de arquivos comuns e limitando o tamanho. Nunca devolve
 * string vazia — quando o input é inválido retorna `documento`.
 */
export function sanitizeFileName(input: string, fallback = "documento"): string {
  const cleaned = String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Aceita apenas URLs http(s) para uso em `window.open`. URLs com esquemas
 * perigosos (`javascript:`, `data:`, `vbscript:`) retornam `null`.
 */
export function safeExternalUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return null;
  } catch {
    return null;
  }
}
