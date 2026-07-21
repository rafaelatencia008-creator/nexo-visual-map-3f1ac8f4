/**
 * Utilitários de formatação — Nexo Pericial 360
 *
 * Funções puras (sem side-effects) para formatação visual consistente
 * em todas as telas do sistema. Usam APIs nativas do JavaScript.
 */

/** Formata um valor numérico como moeda brasileira: 1234.56 → "R$ 1.234,56" */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Formata uma data no padrão brasileiro: "21/07/2026" */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Formata data e hora no padrão brasileiro: "21/07/2026 14:30" */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Remove todos os caracteres não numéricos de uma string. */
function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Formata CPF: "12345678900" → "123.456.789-00" */
export function formatCPF(cpf: string): string {
  const d = onlyDigits(cpf).padStart(11, "0").slice(-11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/** Formata CNPJ: "12345678000190" → "12.345.678/0001-90" */
export function formatCNPJ(cnpj: string): string {
  const d = onlyDigits(cnpj).padStart(14, "0").slice(-14);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

/** Formata telefone brasileiro (celular ou fixo): "11987654321" → "(11) 98765-4321" */
export function formatPhone(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  return phone;
}
