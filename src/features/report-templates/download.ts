/**
 * LV-18.4 — Utilitário de download local (Blob + Object URL).
 * Nenhuma requisição de rede. Nome de arquivo sanitizado.
 */

export function sanitizeFileName(name: string, fallback = "modelo"): string {
  const trimmed = (name ?? "").trim();
  const base = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return base.length > 0 ? base.slice(0, 80) : fallback;
}

export function downloadJsonBlob(filename: string, json: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoga a URL um pouco depois para garantir o download em Safari/Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
