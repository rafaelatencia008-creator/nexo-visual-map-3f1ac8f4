/**
 * LV-18.5 — Resolução e validação seguras de variáveis de modelo.
 *
 * Puro. Sem regex-eval, sem `new Function`, sem `eval`, sem acesso a
 * propriedades por caminho e sem HTML. Texto puro em todas as saídas.
 */

import type {
  ReportTemplate,
  ReportTemplateVariable,
} from "@/features/report-templates/report-template-types";
import type {
  ReportTemplateVariableValues,
  VariableFieldError,
} from "./report-template-application-types";

/** Chaves proibidas — protegem contra prototype pollution. */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const PLACEHOLDER_RE = /\{\{([a-z][a-z0-9_]*)\}\}/g;
export const MAX_VARIABLE_VALUE_LENGTH = 4000;

function isPlainString(v: unknown): v is string {
  return typeof v === "string";
}

/**
 * Normaliza o mapa de valores de entrada:
 *  - somente chaves declaradas são aceitas;
 *  - somente `string` como valor;
 *  - chaves perigosas são rejeitadas com erro tipado;
 *  - variáveis não fornecidas usam `defaultValue` ou string vazia.
 *
 * Não substitui placeholders nesta etapa — apenas resolve valores.
 */
export function normalizeAndValidateVariableValues(
  template: ReportTemplate,
  input: ReportTemplateVariableValues,
): {
  readonly resolved: ReportTemplateVariableValues;
  readonly errors: readonly VariableFieldError[];
  readonly unknownKeys: readonly string[];
} {
  const errors: VariableFieldError[] = [];
  const declaredKeys = new Set(template.variables.map((v) => v.key));
  const resolved: Record<string, string> = Object.create(null);

  // 1) Verifica chaves desconhecidas / perigosas
  const unknownKeys: string[] = [];
  for (const rawKey of Object.keys(input ?? {})) {
    if (DANGEROUS_KEYS.has(rawKey) || !KEY_RE.test(rawKey)) {
      unknownKeys.push(rawKey);
      errors.push({
        key: rawKey,
        code: "unknown",
        message: `Chave inválida ou perigosa: ${rawKey}.`,
      });
      continue;
    }
    if (!declaredKeys.has(rawKey)) {
      unknownKeys.push(rawKey);
      errors.push({
        key: rawKey,
        code: "unknown",
        message: `Variável desconhecida: ${rawKey}.`,
      });
    }
  }

  // 2) Para cada variável declarada, resolve valor final e valida
  for (const v of template.variables) {
    const raw = Object.prototype.hasOwnProperty.call(input, v.key)
      ? (input as Record<string, unknown>)[v.key]
      : undefined;

    if (raw !== undefined && !isPlainString(raw)) {
      errors.push({
        key: v.key,
        code: "invalid_shape",
        message: `Formato inválido para ${v.key} — texto esperado.`,
      });
      resolved[v.key] = "";
      continue;
    }

    let value = ((raw as string | undefined) ?? "").trim();
    if (value.length === 0) {
      if (v.required) {
        errors.push({
          key: v.key,
          code: "required",
          message: `Variável obrigatória: ${v.label || v.key}.`,
        });
        resolved[v.key] = "";
        continue;
      }
      value = (v.defaultValue ?? "").trim();
    }

    if (value.length > MAX_VARIABLE_VALUE_LENGTH) {
      errors.push({
        key: v.key,
        code: "too_long",
        message: `Valor de ${v.key} excede ${MAX_VARIABLE_VALUE_LENGTH} caracteres.`,
      });
      resolved[v.key] = value.slice(0, MAX_VARIABLE_VALUE_LENGTH);
      continue;
    }

    if (value.length > 0) {
      const err = validateByKind(v, value);
      if (err) errors.push(err);
    }

    resolved[v.key] = value;
  }

  return {
    resolved: Object.freeze(resolved) as ReportTemplateVariableValues,
    errors: Object.freeze(errors.slice()),
    unknownKeys: Object.freeze(unknownKeys.slice()),
  };
}

function validateByKind(
  v: ReportTemplateVariable,
  value: string,
): VariableFieldError | null {
  switch (v.kind) {
    case "numero": {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return {
          key: v.key,
          code: "invalid_number",
          message: `Número inválido para ${v.key}.`,
        };
      }
      return null;
    }
    case "data": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return {
          key: v.key,
          code: "invalid_date",
          message: `Data inválida para ${v.key} (use AAAA-MM-DD).`,
        };
      }
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        return {
          key: v.key,
          code: "invalid_date",
          message: `Data inválida para ${v.key}.`,
        };
      }
      return null;
    }
    case "booleano": {
      const norm = value.toLowerCase();
      if (!["true", "false", "sim", "nao", "não"].includes(norm)) {
        return {
          key: v.key,
          code: "invalid_boolean",
          message: `Valor booleano inválido para ${v.key}.`,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Substitui placeholders `{{chave}}` — somente chaves declaradas no
 * template E presentes no mapa resolvido são substituídas. Chaves
 * desconhecidas, com caminho (`{{a.b}}`), chamadas (`{{alert(1)}}`) ou
 * perigosas permanecem como texto literal. Retorno é sempre texto puro.
 */
export function resolveTemplatePlaceholders(
  text: string,
  declaredKeys: ReadonlySet<string>,
  resolvedValues: ReportTemplateVariableValues,
): string {
  if (typeof text !== "string") return "";
  return text.replace(PLACEHOLDER_RE, (match, key: string) => {
    if (DANGEROUS_KEYS.has(key)) return match;
    if (!declaredKeys.has(key)) return match;
    if (!Object.prototype.hasOwnProperty.call(resolvedValues, key)) return match;
    const val = (resolvedValues as Record<string, string>)[key] ?? "";
    return val;
  });
}

/**
 * Verifica que cada `variableRefs` de bloco referencia uma variável
 * realmente declarada no modelo. Retorna a lista de chaves quebradas.
 */
export function findBrokenVariableReferences(
  template: ReportTemplate,
): readonly string[] {
  const declared = new Set(template.variables.map((v) => v.key));
  const broken = new Set<string>();
  for (const s of template.sections) {
    for (const b of s.blocks) {
      for (const ref of b.variableRefs) {
        if (DANGEROUS_KEYS.has(ref) || !KEY_RE.test(ref) || !declared.has(ref)) {
          broken.add(ref);
        }
      }
      // Placeholders inline no conteúdo — devem também estar declarados.
      const inline = b.content.match(PLACEHOLDER_RE) ?? [];
      for (const m of inline) {
        const key = m.slice(2, -2);
        if (!declared.has(key)) {
          // Placeholder inline não declarado permanece literal (seguro),
          // mas registramos como referência quebrada quando explícita.
          if (b.variableRefs.includes(key)) broken.add(key);
        }
      }
    }
  }
  return Object.freeze(Array.from(broken));
}
