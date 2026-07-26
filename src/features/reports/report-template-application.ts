/**
 * LV-18.5 — Caso de uso central: aplicar Modelo de Laudo a um novo Laudo.
 *
 * Este módulo é a única porta legítima para criar laudos a partir de
 * modelos. A UI é fina — não monta estrutura, não gera IDs, não valida
 * variáveis. Toda a lógica está aqui.
 *
 * Restrições:
 *  - Sem persistência, sem rede, sem IA, sem eval.
 *  - Só usa stores mock existentes (LV-18 e LV-14).
 *  - Emite UMA única atualização por criação bem-sucedida.
 *  - Não muta o modelo original. Cópia profunda de tudo que entra.
 */

import {
  getSnapshot as getTemplatesSnapshot,
  getTemplate as getTemplateFromStore,
} from "@/features/report-templates/report-template-store";
import { listTemplateVersions } from "@/features/report-templates/report-template-version-store";
import { validateReportTemplate } from "@/features/report-templates/report-template-validation";
import type {
  ReportTemplate,
  ReportTemplateId as TemplateId,
  ReportTemplateSpecialty,
} from "@/features/report-templates/report-template-types";

import {
  createReportFromTemplateApplication,
  type PreparedSectionForApplication,
} from "./report-mock-store";
import {
  REPORT_SECTION_KINDS,
  type ReportSectionKind,
} from "./report-types";
import {
  ReportTemplateApplicationError,
  type ReportTemplateApplicationInput,
  type ReportTemplateApplicationPreview,
  type ReportTemplateApplicationResult,
  type ReportTemplateOrigin,
  type ReportTemplateVariableValues,
} from "./report-template-application-types";
import {
  findBrokenVariableReferences,
  normalizeAndValidateVariableValues,
  resolveTemplatePlaceholders,
} from "./report-template-variable-resolution";

// ---------- Compatibilidade ----------

/**
 * Regra explícita: um modelo é compatível com o contexto se:
 *  - não houver especialidade de contexto (compatível com tudo);
 *  - o modelo for `geral`;
 *  - ou as especialidades coincidirem.
 */
export function isTemplateCompatibleWithReportContext(
  templateSpecialty: ReportTemplateSpecialty,
  contextSpecialty?: ReportTemplateSpecialty,
): boolean {
  if (!contextSpecialty) return true;
  if (templateSpecialty === "geral") return true;
  return templateSpecialty === contextSpecialty;
}

// ---------- Localização de modelo e versão ----------

function requireTemplateOrThrow(id: TemplateId): ReportTemplate {
  const t = getTemplateFromStore(id);
  if (!t) {
    throw new ReportTemplateApplicationError(
      "report_template_not_found",
      `Modelo ${id} não encontrado.`,
      { templateId: id },
    );
  }
  return t;
}

/** Localiza a versão publicada aplicável (a versão de publicação mais recente). */
function locatePublishedVersion(templateId: TemplateId, versionId?: string) {
  const versions = listTemplateVersions(templateId);
  if (versionId) {
    const v = versions.find((x) => x.id === versionId);
    if (!v) {
      throw new ReportTemplateApplicationError(
        "report_template_version_not_found",
        `Versão ${versionId} não encontrada.`,
        { templateId, versionId },
      );
    }
    if (v.templateId !== templateId) {
      throw new ReportTemplateApplicationError(
        "report_template_version_mismatch",
        "A versão informada não pertence ao modelo selecionado.",
        { templateId, versionId, versionTemplateId: v.templateId },
      );
    }
    if (v.statusAtCreation !== "publicado") {
      throw new ReportTemplateApplicationError(
        "report_template_version_not_published",
        "A versão selecionada não é uma versão publicada do modelo.",
        { templateId, versionId, statusAtCreation: v.statusAtCreation },
      );
    }
    return v;
  }
  // Última versão gerada quando o modelo estava publicado.
  const published = versions.filter((v) => v.statusAtCreation === "publicado");
  const last = published[published.length - 1];
  if (!last) {
    throw new ReportTemplateApplicationError(
      "report_template_version_not_found",
      "Nenhuma versão publicada disponível para este modelo.",
      { templateId },
    );
  }
  return last;
}

function computeFingerprint(
  templateId: TemplateId,
  versionId: string,
  versionNumber: number,
  updatedAt: string,
): string {
  return `${templateId}::${versionId}::v${versionNumber}::${updatedAt}`;
}

// ---------- Mapeamento estrutural ----------

const KIND_HEURISTICS: readonly { readonly re: RegExp; readonly kind: ReportSectionKind }[] = [
  { re: /identific.*pericia|identifica[cç][aã]o$/i, kind: "identificacao_pericia" },
  { re: /partes|clientes|avaliad/i, kind: "identificacao_partes" },
  { re: /objeto|escopo/i, kind: "objeto" },
  { re: /hist[oó]ric/i, kind: "historico" },
  { re: /metodolog|instrument/i, kind: "metodologia" },
  { re: /entrevist/i, kind: "entrevistas" },
  { re: /dilig[eê]nc/i, kind: "diligencias" },
  { re: /documento/i, kind: "documentos_analisados" },
  { re: /evid[eê]nc/i, kind: "evidencias" },
  { re: /quesit/i, kind: "quesitos" },
  { re: /fundament/i, kind: "fundamentacao" },
  { re: /an[aá]lise/i, kind: "analise" },
  { re: /conclus/i, kind: "conclusao" },
  { re: /anex/i, kind: "anexos" },
];

function mapTemplateSectionTitleToKind(title: string, index: number): ReportSectionKind {
  for (const { re, kind } of KIND_HEURISTICS) {
    if (re.test(title)) return kind;
  }
  // Fallback determinístico: cicla entre kinds — sem duplicar-se sempre com "objeto".
  return REPORT_SECTION_KINDS[index % REPORT_SECTION_KINDS.length]!;
}

/**
 * Constrói a estrutura pronta para inserção. Não gera IDs finais — a
 * inserção atômica na store cuidará disso. Trabalha somente sobre uma
 * cópia profunda do snapshot da versão.
 */
function buildPreparedStructure(
  template: ReportTemplate,
  resolvedValues: ReportTemplateVariableValues,
): {
  readonly sections: readonly PreparedSectionForApplication[];
  readonly blocksCount: number;
} {
  const declaredKeys = new Set(template.variables.map((v) => v.key));
  const prepared: PreparedSectionForApplication[] = [];
  let blocksCount = 0;
  template.sections.forEach((section, index) => {
    const kind = mapTemplateSectionTitleToKind(section.title, index);
    const blocks = section.blocks.map((b) => {
      blocksCount += 1;
      const title = resolveTemplatePlaceholders(b.title, declaredKeys, resolvedValues);
      const content = resolveTemplatePlaceholders(
        b.content,
        declaredKeys,
        resolvedValues,
      );
      return {
        title: title.trim().length > 0 ? title : "Bloco sem título",
        content,
      };
    });
    prepared.push({
      kind,
      title: section.title,
      blocks,
    });
  });
  return { sections: prepared, blocksCount };
}

// ---------- Preview ----------

/**
 * Gera preview determinístico da aplicação. Não muta store, não gera
 * IDs finais, não emite listeners. Retorno profundamente congelado.
 */
export function previewReportTemplateApplication(
  input: Omit<ReportTemplateApplicationInput, "title" | "caseId" | "caseLabel"> & {
    readonly title?: string;
    readonly caseId?: string;
    readonly caseLabel?: string;
  },
): ReportTemplateApplicationPreview {
  if (!input.templateId) {
    throw new ReportTemplateApplicationError(
      "report_template_required",
      "Selecione um modelo para pré-visualizar.",
    );
  }

  const template = requireTemplateOrThrow(input.templateId);
  if (template.status !== "publicado") {
    throw new ReportTemplateApplicationError(
      "report_template_not_published",
      "Modelo não está publicado.",
      { templateId: input.templateId, status: template.status },
    );
  }

  // Validação estrutural (defesa em profundidade).
  const validation = validateReportTemplate(template);
  if (!validation.valid) {
    throw new ReportTemplateApplicationError(
      "report_template_invalid",
      "Modelo com erros estruturais.",
      { errors: validation.errors.length },
    );
  }

  if (
    input.contextSpecialty &&
    !isTemplateCompatibleWithReportContext(template.specialty, input.contextSpecialty)
  ) {
    throw new ReportTemplateApplicationError(
      "report_template_incompatible",
      "Modelo não é compatível com a especialidade do laudo.",
      { templateSpecialty: template.specialty, contextSpecialty: input.contextSpecialty },
    );
  }

  const version = locatePublishedVersion(input.templateId, input.templateVersionId);

  // Referências quebradas
  const broken = findBrokenVariableReferences(version.snapshot);
  if (broken.length > 0) {
    throw new ReportTemplateApplicationError(
      "report_template_reference_invalid",
      "Modelo possui referências de variáveis inválidas.",
      { brokenKeys: broken.slice() },
    );
  }

  // Valores das variáveis
  const { resolved, errors, unknownKeys } = normalizeAndValidateVariableValues(
    version.snapshot,
    input.variableValues,
  );
  if (unknownKeys.length > 0) {
    throw new ReportTemplateApplicationError(
      "report_template_variable_unknown",
      "Variáveis desconhecidas foram enviadas.",
      { unknownKeys: unknownKeys.slice() },
      errors,
    );
  }
  const requiredErrors = errors.filter((e) => e.code === "required");
  if (requiredErrors.length > 0) {
    throw new ReportTemplateApplicationError(
      "report_template_variable_required",
      "Preencha as variáveis obrigatórias.",
      { keys: requiredErrors.map((e) => e.key) },
      errors,
    );
  }
  if (errors.length > 0) {
    throw new ReportTemplateApplicationError(
      "report_template_variable_invalid",
      "Valores de variáveis inválidos.",
      undefined,
      errors,
    );
  }

  const { sections: preparedSections, blocksCount } = buildPreparedStructure(
    version.snapshot,
    resolved,
  );

  const warnings = validation.warnings.map((w) => w.message);
  const fingerprint = computeFingerprint(
    template.id,
    version.id,
    version.versionNumber,
    version.snapshot.updatedAt,
  );

  const sectionsPreview = preparedSections.map((s) => ({
    title: s.title,
    description: version.snapshot.sections.find((x) => x.title === s.title)?.description ?? "",
    blocks: s.blocks.map((b) => ({ title: b.title, content: b.content, variableRefs: [] as string[] })),
  }));

  return deepFreeze({
    templateId: template.id,
    templateVersionId: version.id,
    templateVersionNumber: version.versionNumber,
    templateName: version.snapshot.name,
    templateSpecialty: version.snapshot.specialty,
    sections: sectionsPreview,
    sectionsCount: preparedSections.length,
    blocksCount,
    variableKeys: version.snapshot.variables.map((v) => v.key),
    resolvedValues: resolved,
    warnings,
    fingerprint,
  }) as ReportTemplateApplicationPreview;
}

// ---------- Aplicação atômica ----------

/**
 * Cria um laudo a partir de um modelo publicado.
 *
 * Sequência:
 *  1. valida entrada;
 *  2. localiza modelo publicado;
 *  3. localiza versão publicada;
 *  4. verifica fingerprint (concorrência);
 *  5. valida estrutura do modelo;
 *  6. valida referências;
 *  7. valida valores das variáveis;
 *  8. prepara estrutura resolvida (texto puro);
 *  9. insere na store de laudos em uma única chamada atômica;
 * 10. registra origem imutável e evento único de histórico;
 * 11. retorna o laudo criado.
 *
 * Em qualquer falha, nada é gravado — nenhum listener é chamado.
 */
export function createReportFromTemplate(
  input: ReportTemplateApplicationInput,
): ReportTemplateApplicationResult {
  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    throw new ReportTemplateApplicationError(
      "report_creation_failed",
      "Informe um título para o laudo.",
    );
  }
  if (!input.caseId || !input.caseLabel) {
    throw new ReportTemplateApplicationError(
      "report_creation_failed",
      "Perícia vinculada é obrigatória.",
    );
  }

  // 2..7 — reaproveita validações do preview.
  const preview = previewReportTemplateApplication({
    templateId: input.templateId,
    templateVersionId: input.templateVersionId,
    variableValues: input.variableValues,
    contextSpecialty: input.contextSpecialty,
  });

  // 4 — fingerprint (concorrência)
  if (input.fingerprint && input.fingerprint !== preview.fingerprint) {
    throw new ReportTemplateApplicationError(
      "report_template_changed",
      "O modelo foi alterado desde a pré-visualização.",
      { expected: input.fingerprint, current: preview.fingerprint },
    );
  }

  // Releitura defensiva do snapshot para garantir que o modelo continua
  // existindo e publicado no exato momento da confirmação.
  const nowTemplate = getTemplateFromStore(input.templateId);
  if (!nowTemplate) {
    throw new ReportTemplateApplicationError(
      "report_template_not_found",
      "Modelo não existe mais.",
    );
  }
  if (nowTemplate.status !== "publicado") {
    throw new ReportTemplateApplicationError(
      "report_template_not_published",
      "Modelo deixou de estar publicado.",
      { status: nowTemplate.status },
    );
  }

  const preparedSections: PreparedSectionForApplication[] = preview.sections.map(
    (s, i) => ({
      kind: mapTemplateSectionTitleToKind(s.title, i),
      title: s.title,
      blocks: s.blocks.map((b: { title: string; content: string }) => ({
        title: b.title,
        content: b.content,
      })),
    }),
  );

  const appliedAt = new Date().toISOString();
  const origin: ReportTemplateOrigin = Object.freeze({
    templateId: preview.templateId,
    templateVersionId: preview.templateVersionId,
    templateVersionNumber: preview.templateVersionNumber,
    templateName: preview.templateName,
    templateSpecialty: preview.templateSpecialty,
    appliedAt,
    appliedBy: input.appliedBy?.trim() || "usr-demo",
    fingerprint: preview.fingerprint,
  });

  try {
    const report = createReportFromTemplateApplication({
      title,
      caseId: input.caseId,
      caseLabel: input.caseLabel,
      sections: preparedSections,
      origin,
    });
    return {
      report,
      origin,
      sectionsCount: preview.sectionsCount,
      blocksCount: preview.blocksCount,
    };
  } catch (err) {
    if (err instanceof ReportTemplateApplicationError) throw err;
    throw new ReportTemplateApplicationError(
      "report_creation_failed",
      err instanceof Error ? err.message : "Falha desconhecida ao criar laudo.",
    );
  }
}

// ---------- Utilidades ----------

/** Lista modelos elegíveis para aplicação (publicados, opcionalmente por especialidade). */
export function listApplicableTemplates(
  contextSpecialty?: ReportTemplateSpecialty,
): readonly ReportTemplate[] {
  const snap = getTemplatesSnapshot();
  return snap.templates.filter(
    (t) =>
      t.status === "publicado" &&
      isTemplateCompatibleWithReportContext(t.specialty, contextSpecialty),
  );
}

// ---------- Congelamento profundo ----------

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

export { mapTemplateSectionTitleToKind };
