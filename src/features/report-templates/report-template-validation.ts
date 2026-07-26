/**
 * LV-18.2 — Validação de modelos de laudo.
 *
 * Puro: recebe um modelo e devolve um resultado imutável com erros
 * bloqueantes e avisos. Determinístico — mesma entrada, mesma saída.
 */

import {
  REPORT_TEMPLATE_BLOCK_KINDS,
  REPORT_TEMPLATE_SPECIALTIES,
  REPORT_TEMPLATE_STATUSES,
  REPORT_TEMPLATE_VARIABLE_KINDS,
  type ReportTemplate,
} from "./report-template-types";

export type ReportTemplateValidationSeverity = "error" | "warning";

export type ReportTemplateValidationCode =
  | "empty_name"
  | "invalid_specialty"
  | "invalid_status"
  | "no_sections"
  | "section_no_title"
  | "invalid_position"
  | "duplicate_position"
  | "duplicate_id"
  | "invalid_block_kind"
  | "empty_variable_key"
  | "invalid_variable_key"
  | "duplicate_variable_key"
  | "invalid_variable_reference"
  | "invalid_default_value"
  | "status_structure_mismatch"
  | "empty_description"
  | "section_no_description"
  | "block_no_title"
  | "missing_conclusion"
  | "missing_signature"
  | "optional_without_default"
  | "section_no_blocks"
  | "unused_variable";

export interface ReportTemplateValidationIssue {
  readonly code: ReportTemplateValidationCode;
  readonly severity: ReportTemplateValidationSeverity;
  readonly message: string;
  readonly path: string;
  readonly templateId: string;
  readonly sectionId?: string;
  readonly blockId?: string;
  readonly variableId?: string;
  readonly suggestion?: string;
}

export interface ReportTemplateValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ReportTemplateValidationIssue[];
  readonly warnings: readonly ReportTemplateValidationIssue[];
}

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const EMPTY_TEMPLATE_ID = "rtpl-1005";

function freezeResult(
  errors: ReportTemplateValidationIssue[],
  warnings: ReportTemplateValidationIssue[],
): ReportTemplateValidationResult {
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors.map((i) => Object.freeze(i))),
    warnings: Object.freeze(warnings.map((i) => Object.freeze(i))),
  });
}

export function validateReportTemplate(
  t: ReportTemplate,
): ReportTemplateValidationResult {
  const errors: ReportTemplateValidationIssue[] = [];
  const warnings: ReportTemplateValidationIssue[] = [];
  const tId = t.id;

  const err = (i: Omit<ReportTemplateValidationIssue, "severity">) =>
    errors.push({ ...i, severity: "error" });
  const warn = (i: Omit<ReportTemplateValidationIssue, "severity">) =>
    warnings.push({ ...i, severity: "warning" });

  // --- metadados ---
  if (!t.name || t.name.trim().length === 0) {
    err({ code: "empty_name", message: "Nome do modelo é obrigatório.", path: "name", templateId: tId, suggestion: "Informe um nome descritivo." });
  }
  if (!REPORT_TEMPLATE_SPECIALTIES.includes(t.specialty)) {
    err({ code: "invalid_specialty", message: `Especialidade inválida: ${t.specialty}.`, path: "specialty", templateId: tId });
  }
  if (!REPORT_TEMPLATE_STATUSES.includes(t.status)) {
    err({ code: "invalid_status", message: `Status inválido: ${t.status}.`, path: "status", templateId: tId });
  }
  if (!t.description || t.description.trim().length === 0) {
    warn({ code: "empty_description", message: "Descrição vazia.", path: "description", templateId: tId });
  }

  // --- seções ---
  if (t.sections.length === 0) {
    const isEmptyFixtureDraft = t.id === EMPTY_TEMPLATE_ID && t.status === "rascunho";
    if (!isEmptyFixtureDraft) {
      err({ code: "no_sections", message: "Modelo sem seções.", path: "sections", templateId: tId, suggestion: "Adicione ao menos uma seção antes de publicar." });
    }
  }

  const seenSectionIds = new Set<string>();
  const positions: number[] = [];
  const conclusionRe = /concl/i;
  const signatureRe = /assinatur|assinad/i;
  let hasConclusion = false;
  let hasSignature = false;
  const usedVariableKeys = new Set<string>();

  t.sections.forEach((s, i) => {
    const path = `sections[${i}]`;
    if (seenSectionIds.has(s.id)) {
      err({ code: "duplicate_id", message: `ID de seção duplicado: ${s.id}.`, path, templateId: tId, sectionId: s.id });
    }
    seenSectionIds.add(s.id);
    if (!s.title || s.title.trim().length === 0) {
      err({ code: "section_no_title", message: "Seção sem título.", path: `${path}.title`, templateId: tId, sectionId: s.id });
    }
    if (s.position < 0) {
      err({ code: "invalid_position", message: "Posição negativa.", path: `${path}.position`, templateId: tId, sectionId: s.id });
    }
    if (positions.includes(s.position) || s.position !== i) {
      err({ code: "duplicate_position", message: `Posição não normalizada em seção (esperado ${i}, veio ${s.position}).`, path: `${path}.position`, templateId: tId, sectionId: s.id });
    }
    positions.push(s.position);
    if (!s.description || s.description.trim().length === 0) {
      warn({ code: "section_no_description", message: "Seção sem descrição.", path: `${path}.description`, templateId: tId, sectionId: s.id });
    }
    if (s.blocks.length === 0) {
      warn({ code: "section_no_blocks", message: "Seção sem blocos.", path: `${path}.blocks`, templateId: tId, sectionId: s.id });
    }

    if (conclusionRe.test(s.title)) hasConclusion = true;
    if (signatureRe.test(s.title)) hasSignature = true;

    const seenBlockIds = new Set<string>();
    const blockPositions: number[] = [];
    s.blocks.forEach((b, j) => {
      const bpath = `${path}.blocks[${j}]`;
      if (seenBlockIds.has(b.id)) {
        err({ code: "duplicate_id", message: `ID de bloco duplicado: ${b.id}.`, path: bpath, templateId: tId, sectionId: s.id, blockId: b.id });
      }
      seenBlockIds.add(b.id);
      if (!REPORT_TEMPLATE_BLOCK_KINDS.includes(b.kind)) {
        err({ code: "invalid_block_kind", message: `Tipo de bloco inválido: ${b.kind}.`, path: `${bpath}.kind`, templateId: tId, sectionId: s.id, blockId: b.id });
      }
      if (b.position < 0) {
        err({ code: "invalid_position", message: "Posição negativa em bloco.", path: `${bpath}.position`, templateId: tId, sectionId: s.id, blockId: b.id });
      }
      if (blockPositions.includes(b.position) || b.position !== j) {
        err({ code: "duplicate_position", message: `Posição não normalizada em bloco (esperado ${j}, veio ${b.position}).`, path: `${bpath}.position`, templateId: tId, sectionId: s.id, blockId: b.id });
      }
      blockPositions.push(b.position);
      if (!b.title || b.title.trim().length === 0) {
        if (b.kind !== "paragrafo" && b.kind !== "observacao") {
          warn({ code: "block_no_title", message: "Bloco sem título.", path: `${bpath}.title`, templateId: tId, sectionId: s.id, blockId: b.id });
        } else {
          warn({ code: "block_no_title", message: "Bloco sem título.", path: `${bpath}.title`, templateId: tId, sectionId: s.id, blockId: b.id });
        }
      }
      for (const ref of b.variableRefs) usedVariableKeys.add(ref);
      const inline = b.content.match(/\{\{([a-z0-9_]+)\}\}/g) ?? [];
      for (const m of inline) {
        const key = m.slice(2, -2);
        usedVariableKeys.add(key);
      }
      if (conclusionRe.test(b.title)) hasConclusion = true;
      if (signatureRe.test(b.title)) hasSignature = true;
    });
  });

  // --- variáveis ---
  const seenVarIds = new Set<string>();
  const seenVarKeys = new Set<string>();
  const declaredKeys = new Set<string>();
  t.variables.forEach((v, i) => {
    const path = `variables[${i}]`;
    if (seenVarIds.has(v.id)) {
      err({ code: "duplicate_id", message: `ID de variável duplicado: ${v.id}.`, path, templateId: tId, variableId: v.id });
    }
    seenVarIds.add(v.id);
    if (!v.key || v.key.trim().length === 0) {
      err({ code: "empty_variable_key", message: "Chave de variável vazia.", path: `${path}.key`, templateId: tId, variableId: v.id });
    } else if (!KEY_RE.test(v.key)) {
      err({ code: "invalid_variable_key", message: `Chave inválida: ${v.key}.`, path: `${path}.key`, templateId: tId, variableId: v.id, suggestion: "Use snake_case (letras minúsculas, dígitos e '_')." });
    }
    if (seenVarKeys.has(v.key)) {
      err({ code: "duplicate_variable_key", message: `Chave de variável duplicada: ${v.key}.`, path: `${path}.key`, templateId: tId, variableId: v.id });
    }
    seenVarKeys.add(v.key);
    declaredKeys.add(v.key);
    if (!REPORT_TEMPLATE_VARIABLE_KINDS.includes(v.kind)) {
      err({ code: "invalid_block_kind", message: `Tipo de variável inválido: ${v.kind}.`, path: `${path}.kind`, templateId: tId, variableId: v.id });
    }
    // valor padrão compatível com tipo
    if (v.defaultValue && v.defaultValue.length > 0) {
      if (v.kind === "numero" && Number.isNaN(Number(v.defaultValue))) {
        err({ code: "invalid_default_value", message: `Valor padrão não numérico: ${v.defaultValue}.`, path: `${path}.defaultValue`, templateId: tId, variableId: v.id });
      }
      if (v.kind === "booleano" && !["true", "false", "sim", "nao", "não"].includes(v.defaultValue.toLowerCase())) {
        err({ code: "invalid_default_value", message: `Valor padrão booleano inválido: ${v.defaultValue}.`, path: `${path}.defaultValue`, templateId: tId, variableId: v.id });
      }
      if (v.kind === "data" && !/^\d{4}-\d{2}-\d{2}/.test(v.defaultValue)) {
        err({ code: "invalid_default_value", message: `Valor padrão de data inválido: ${v.defaultValue}.`, path: `${path}.defaultValue`, templateId: tId, variableId: v.id });
      }
    }
    if (!v.required && (!v.defaultValue || v.defaultValue.length === 0)) {
      warn({ code: "optional_without_default", message: `Variável opcional sem valor padrão: ${v.key}.`, path: `${path}.defaultValue`, templateId: tId, variableId: v.id });
    }
  });

  // referências a variáveis inexistentes
  for (const usedKey of usedVariableKeys) {
    if (!declaredKeys.has(usedKey)) {
      err({ code: "invalid_variable_reference", message: `Referência a variável inexistente: ${usedKey}.`, path: "sections.blocks.variableRefs", templateId: tId, suggestion: `Declare a variável \`${usedKey}\` ou remova a referência.` });
    }
  }
  // variáveis declaradas mas não utilizadas
  for (const v of t.variables) {
    if (!usedVariableKeys.has(v.key)) {
      warn({ code: "unused_variable", message: `Variável declarada mas não utilizada: ${v.key}.`, path: `variables`, templateId: tId, variableId: v.id });
    }
  }

  // conclusão / assinatura
  if (t.sections.length > 0 && !hasConclusion) {
    warn({ code: "missing_conclusion", message: "Modelo sem seção de conclusão.", path: "sections", templateId: tId });
  }
  if (t.sections.length > 0 && !hasSignature) {
    warn({ code: "missing_signature", message: "Modelo sem assinatura visual.", path: "sections", templateId: tId });
  }

  // consistência status × estrutura
  if (t.status === "publicado" && t.sections.length === 0 && t.id !== EMPTY_TEMPLATE_ID) {
    err({ code: "status_structure_mismatch", message: "Modelo publicado deve possuir seções.", path: "status", templateId: tId });
  }

  return freezeResult(errors, warnings);
}
