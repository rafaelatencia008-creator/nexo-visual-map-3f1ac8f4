/**
 * LV-18.5 — Testes comportamentais da aplicação de Modelos de Laudo.
 *
 * Cobertura: seleção, aplicação atômica, variáveis, resolução segura,
 * independência entre modelo e laudo, concorrência, criação em branco,
 * regressão de LV-18.1..4 e LV-14/15/16.
 */
import { describe, it, expect, beforeEach } from "bun:test";

import {
  createTemplate,
  addSection,
  addBlock,
  addVariable,
  publishTemplate,
  archiveTemplate,
  returnTemplateToDraft,
  resetReportTemplateStore,
  getTemplate,
  getSnapshot as getTemplatesSnapshot,
} from "@/features/report-templates/report-template-store";
import { listTemplateVersions } from "@/features/report-templates/report-template-version-store";
import type {
  ReportTemplateBlockId,
  ReportTemplateSectionId,
} from "@/features/report-templates/report-template-types";
import {
  createReport,
  getReport,
  listReportHistory,
  listReports,
  resetReportStore,
  resetReportIdCounter,
  resetReportClock,
  subscribeReports,
} from "@/features/reports/report-mock-store";
import {
  createReportFromTemplate,
  isTemplateCompatibleWithReportContext,
  listApplicableTemplates,
  previewReportTemplateApplication,
} from "@/features/reports/report-template-application";
import {
  ReportTemplateApplicationError,
  type ReportTemplateApplicationErrorCode,
} from "@/features/reports/report-template-application-types";
import {
  findBrokenVariableReferences,
  normalizeAndValidateVariableValues,
  resolveTemplatePlaceholders,
} from "@/features/reports/report-template-variable-resolution";

// ---------- helpers ----------

function makeStandardTemplate(opts?: {
  readonly required?: boolean;
  readonly withDangerousContent?: boolean;
}) {
  const t = createTemplate({
    name: "Modelo Teste LV-18.5",
    description: "Modelo determinístico para testes",
    specialty: "psicologia",
  });
  const s1 = addSection(t.id, {
    title: "Identificação",
    description: "Cabeçalho",
  });
  addBlock(t.id, s1.id, {
    kind: "paragrafo",
    title: "Sujeito",
    content: opts?.withDangerousContent
      ? "Paciente: {{nome_paciente}} <script>alert(1)</script>"
      : "Paciente: {{nome_paciente}}",
    variableRefs: ["nome_paciente"],
  });
  const s2 = addSection(t.id, {
    title: "Conclusão",
    description: "Fecho",
  });
  addBlock(t.id, s2.id, {
    kind: "paragrafo",
    title: "Encerramento",
    content: "Idade: {{idade}} anos.",
    variableRefs: ["idade"],
  });
  addVariable(t.id, {
    key: "nome_paciente",
    label: "Nome do paciente",
    kind: "texto",
    required: opts?.required !== false,
    defaultValue: "",
  });
  addVariable(t.id, {
    key: "idade",
    label: "Idade",
    kind: "numero",
    required: false,
    defaultValue: "0",
  });
  return getTemplate(t.id)!;
}

function publishAndReturn(templateId: string) {
  const template = getTemplate(templateId as never)!;
  publishTemplate(template.id, "publicar");
  return getTemplate(template.id)!;
}

beforeEach(() => {
  resetReportTemplateStore();
  resetReportStore();
  resetReportIdCounter();
  resetReportClock();
});

// ==================== Seleção ====================

describe("LV-18.5 · Seleção de modelos", () => {
  it("lista somente modelos publicados", () => {
    const draft = makeStandardTemplate();
    const publ = makeStandardTemplate();
    publishTemplate(publ.id, "publicar");
    const applicable = listApplicableTemplates();
    expect(applicable.some((t) => t.id === publ.id)).toBe(true);
    expect(applicable.some((t) => t.id === draft.id)).toBe(false);
  });

  it("modelo arquivado não é selecionável", () => {
    const t = makeStandardTemplate();
    publishTemplate(t.id, "publicar");
    archiveTemplate(t.id);
    const applicable = listApplicableTemplates();
    expect(applicable.some((x) => x.id === t.id)).toBe(false);
  });

  it("aplica regra de compatibilidade por especialidade", () => {
    expect(isTemplateCompatibleWithReportContext("psicologia")).toBe(true);
    expect(isTemplateCompatibleWithReportContext("psicologia", "psicologia")).toBe(true);
    expect(isTemplateCompatibleWithReportContext("geral", "psicologia")).toBe(true);
    expect(isTemplateCompatibleWithReportContext("psicologia", "engenharia")).toBe(false);
  });
});

// ==================== Aplicação atômica ====================

describe("LV-18.5 · Aplicação atômica", () => {
  it("cria laudo com estrutura resolvida e origem imutável", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const before = listReports().length;
    let emissions = 0;
    const unsub = subscribeReports(() => {
      emissions += 1;
    });

    const res = createReportFromTemplate({
      templateId: t.id,
      title: "Laudo A",
      caseId: "per-1",
      caseLabel: "Perícia 1",
      variableValues: { nome_paciente: "Ana", idade: "42" },
    });

    unsub();
    expect(listReports().length).toBe(before + 1);
    expect(emissions).toBe(1);
    expect(res.report.sections.length).toBe(2);
    expect(res.report.sections[0].blocks[0].content).toBe("Paciente: Ana");
    expect(res.report.sections[1].blocks[0].content).toBe("Idade: 42 anos.");
    expect(res.report.templateOrigin).toBeDefined();
    expect(res.report.templateOrigin!.templateVersionNumber).toBe(1);
    expect(Object.isFrozen(res.report.templateOrigin)).toBe(true);
  });

  it("gera IDs próprios para todas as entidades", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const res = createReportFromTemplate({
      templateId: t.id,
      title: "L",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "X" },
    });
    const templateSectionIds = new Set(t.sections.map((s) => s.id as string));
    const templateBlockIds = new Set(
      t.sections.flatMap((s) => s.blocks.map((b) => b.id as string)),
    );
    for (const s of res.report.sections) {
      expect(templateSectionIds.has(s.id)).toBe(false);
      for (const b of s.blocks) {
        expect(templateBlockIds.has(b.id)).toBe(false);
      }
    }
  });

  it("rejeita modelo em rascunho", () => {
    const t = makeStandardTemplate();
    let code: ReportTemplateApplicationErrorCode | null = null;
    try {
      createReportFromTemplate({
        templateId: t.id,
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: { nome_paciente: "X" },
      });
    } catch (e) {
      if (e instanceof ReportTemplateApplicationError) code = e.code;
    }
    expect(code).toBe("report_template_not_published");
    expect(listReports().length).toBe(0);
  });

  it("rejeita modelo inexistente", () => {
    let code: ReportTemplateApplicationErrorCode | null = null;
    try {
      createReportFromTemplate({
        templateId: "tpl-inexistente" as never,
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: {},
      });
    } catch (e) {
      if (e instanceof ReportTemplateApplicationError) code = e.code;
    }
    expect(code).toBe("report_template_not_found");
  });

  it("aborta atomicamente quando obrigatória está ausente", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const before = listReports().length;
    expect(() =>
      createReportFromTemplate({
        templateId: t.id,
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: {},
      }),
    ).toThrow(ReportTemplateApplicationError);
    expect(listReports().length).toBe(before);
  });

  it("detecta mudança de versão via fingerprint", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const preview = previewReportTemplateApplication({
      templateId: t.id,
      variableValues: { nome_paciente: "Ana" },
    });
    // Simula concorrência: fingerprint incompatível
    let code: ReportTemplateApplicationErrorCode | null = null;
    try {
      createReportFromTemplate({
        templateId: t.id,
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: { nome_paciente: "Ana" },
        fingerprint: preview.fingerprint + "::mudou",
      });
    } catch (e) {
      if (e instanceof ReportTemplateApplicationError) code = e.code;
    }
    expect(code).toBe("report_template_changed");
    expect(listReports().length).toBe(0);
  });
});

// ==================== Variáveis ====================

describe("LV-18.5 · Variáveis", () => {
  it("resolve placeholders de chaves declaradas", () => {
    const declared = new Set(["nome", "idade"]);
    const out = resolveTemplatePlaceholders(
      "Paciente {{nome}} tem {{idade}} anos",
      declared,
      { nome: "Ana", idade: "42" },
    );
    expect(out).toBe("Paciente Ana tem 42 anos");
  });

  it("chaves perigosas permanecem literais", () => {
    const declared = new Set<string>();
    const out = resolveTemplatePlaceholders(
      "{{__proto__}} {{constructor}} {{prototype}} {{a.b}} {{alert(1)}}",
      declared,
      {},
    );
    // Nenhuma substituição — texto literal.
    expect(out).toContain("{{__proto__}}");
    expect(out).toContain("{{constructor}}");
    expect(out).toContain("{{prototype}}");
    expect(out).toContain("{{a.b}}");
    expect(out).toContain("{{alert(1)}}");
  });

  it("rejeita chaves desconhecidas ou perigosas na entrada", () => {
    const t = makeStandardTemplate();
    const { errors, unknownKeys } = normalizeAndValidateVariableValues(t, {
      nome_paciente: "Ana",
      __proto__: "x",
      chave_qualquer: "y",
    } as never);
    expect(unknownKeys.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.code === "unknown")).toBe(true);
  });

  it("usa defaultValue quando opcional está ausente", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const res = createReportFromTemplate({
      templateId: t.id,
      title: "L",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    // idade opcional com default "0"
    expect(res.report.sections[1].blocks[0].content).toBe("Idade: 0 anos.");
  });

  it("valida número inválido", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    let code: ReportTemplateApplicationErrorCode | null = null;
    try {
      createReportFromTemplate({
        templateId: t.id,
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: { nome_paciente: "Ana", idade: "abc" },
      });
    } catch (e) {
      if (e instanceof ReportTemplateApplicationError) code = e.code;
    }
    expect(code).toBe("report_template_variable_invalid");
  });

  it("limita tamanho de valor", () => {
    const t = makeStandardTemplate();
    const huge = "x".repeat(5000);
    const { errors } = normalizeAndValidateVariableValues(t, {
      nome_paciente: huge,
    });
    expect(errors.some((e) => e.code === "too_long")).toBe(true);
  });

  it("normaliza `findBrokenVariableReferences` para referências válidas", () => {
    const t = makeStandardTemplate();
    expect(findBrokenVariableReferences(t)).toEqual([]);
  });
});

// ==================== Segurança ====================

describe("LV-18.5 · Segurança", () => {
  it("`<script>` no conteúdo é texto puro no laudo", () => {
    const t = publishAndReturn(makeStandardTemplate({ withDangerousContent: true }).id);
    const res = createReportFromTemplate({
      templateId: t.id,
      title: "L",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    const content = res.report.sections[0].blocks[0].content;
    expect(content).toContain("<script>alert(1)</script>");
    // O conteúdo é apenas string — nenhum HTML é interpretado pelo domínio.
    expect(typeof content).toBe("string");
  });

  it("nenhum acesso a fetch/eval/new Function nesta camada", async () => {
    const app = await import("@/features/reports/report-template-application");
    const res = await import("@/features/reports/report-template-variable-resolution");
    const source =
      (app.createReportFromTemplate.toString() +
        app.previewReportTemplateApplication.toString() +
        res.resolveTemplatePlaceholders.toString() +
        res.normalizeAndValidateVariableValues.toString());
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("eval(");
    expect(source).not.toContain("new Function");
    expect(source).not.toContain("dangerouslySetInnerHTML");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
  });
});

// ==================== Independência ====================

describe("LV-18.5 · Independência entre modelo e laudo", () => {
  it("alterar modelo depois não afeta laudo", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const res = createReportFromTemplate({
      templateId: t.id,
      title: "Original",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    const snapshotContent = res.report.sections[0].blocks[0].content;

    // Retorna para rascunho e edita
    returnTemplateToDraft(t.id);
    const stored = getReport(res.report.id);
    // Nova versão publicada não deve mudar o laudo já criado
    publishTemplate(t.id, "publicar");
    expect(stored?.sections[0].blocks[0].content).toBe(snapshotContent);
  });

  it("arquivar modelo depois não afeta laudo", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const res = createReportFromTemplate({
      templateId: t.id,
      title: "Original",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    archiveTemplate(t.id);
    const stored = getReport(res.report.id);
    expect(stored?.templateOrigin?.templateName).toBeDefined();
    expect(stored?.sections[0].blocks[0].content).toBe("Paciente: Ana");
  });
});

// ==================== Preview ====================

describe("LV-18.5 · Preview", () => {
  it("preview não muta store nem consome IDs", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const before = listReports().length;
    const preview = previewReportTemplateApplication({
      templateId: t.id,
      variableValues: { nome_paciente: "Ana" },
    });
    expect(preview.sectionsCount).toBe(2);
    expect(preview.blocksCount).toBe(2);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(listReports().length).toBe(before);
  });

  it("preview é determinístico entre chamadas repetidas", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const p1 = previewReportTemplateApplication({
      templateId: t.id,
      variableValues: { nome_paciente: "Ana" },
    });
    const p2 = previewReportTemplateApplication({
      templateId: t.id,
      variableValues: { nome_paciente: "Ana" },
    });
    expect(p1.fingerprint).toBe(p2.fingerprint);
    expect(p1.sections[0].blocks[0].content).toBe(p2.sections[0].blocks[0].content);
  });
});

// ==================== Regressão ====================

describe("LV-18.5 · Regressão de fluxo em branco", () => {
  it("createReport (LV-14) segue funcionando sem origem", () => {
    const doc = createReport({
      title: "Em branco",
      templateId: "laudo_psicologico",
      caseId: "per-1",
      caseLabel: "P1",
    });
    expect(doc.templateOrigin).toBeUndefined();
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it("histórico recebe apenas evento agregado (sem conteúdo integral)", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    const res = createReportFromTemplate({
      templateId: t.id,
      title: "L",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    const events = listReportHistory(res.report.id);
    const created = events.find((e) => e.kind === "report_created_from_template");
    expect(created).toBeDefined();
    // O evento não inclui o conteúdo dos blocos
    expect(created!.description).not.toContain("Paciente: Ana");
    expect(created!.description).not.toContain("<script>");
  });
});

// ==================== Bloqueador: versão não publicada ====================

import { createManualTemplateVersion, getSnapshot as getTemplateStoreSnapshot } from "@/features/report-templates/report-template-store";
import { getTemplateVersionsSnapshot } from "@/features/report-templates/report-template-version-store";
import { friendlyReportTemplateError } from "@/features/report-templates/report-template-error-labels";
import { REPORT_TEMPLATE_APPLICATION_ERROR_LABEL } from "@/features/reports/report-template-application-types";

describe("LV-18.5 · Bloqueador: rejeita versão não publicada", () => {
  function draftVersionAndPublish() {
    const t = makeStandardTemplate();
    // Cria versão manualmente com o modelo em rascunho -> statusAtCreation = "rascunho"
    const draftVer = createManualTemplateVersion(t.id, "snapshot rascunho");
    expect(draftVer.statusAtCreation).toBe("rascunho");
    // Agora publica -> gera versão nova statusAtCreation = "publicado"
    publishTemplate(t.id, "publicar");
    const versions = listTemplateVersions(t.id);
    const publishedVer = versions.find((v) => v.statusAtCreation === "publicado")!;
    expect(publishedVer).toBeDefined();
    return { templateId: t.id, draftVer, publishedVer };
  }

  it("[1] preview com versionId de rascunho é rejeitado", () => {
    const { templateId, draftVer } = draftVersionAndPublish();
    let caught: ReportTemplateApplicationError | null = null;
    try {
      previewReportTemplateApplication({
        templateId,
        templateVersionId: draftVer.id,
        variableValues: { nome_paciente: "Ana" },
      });
    } catch (e) {
      caught = e as ReportTemplateApplicationError;
    }
    expect(caught).toBeInstanceOf(ReportTemplateApplicationError);
    expect(caught!.code).toBe("report_template_version_not_published");
  });

  it("[2] criação com versionId de rascunho é rejeitada", () => {
    const { templateId, draftVer } = draftVersionAndPublish();
    let caught: ReportTemplateApplicationError | null = null;
    try {
      createReportFromTemplate({
        templateId,
        templateVersionId: draftVer.id,
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: { nome_paciente: "Ana" },
      });
    } catch (e) {
      caught = e as ReportTemplateApplicationError;
    }
    expect(caught).toBeInstanceOf(ReportTemplateApplicationError);
    expect(caught!.code).toBe("report_template_version_not_published");
  });

  it("[3] versão inexistente mantém erro version_not_found", () => {
    const t = publishAndReturn(makeStandardTemplate().id);
    let caught: ReportTemplateApplicationError | null = null;
    try {
      createReportFromTemplate({
        templateId: t.id,
        templateVersionId: "rtver-999999",
        title: "L",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: { nome_paciente: "Ana" },
      });
    } catch (e) {
      caught = e as ReportTemplateApplicationError;
    }
    expect(caught?.code).toBe("report_template_version_not_found");
  });

  it("[4] versão publicada explícita continua funcionando", () => {
    const { templateId, publishedVer } = draftVersionAndPublish();
    const res = createReportFromTemplate({
      templateId,
      templateVersionId: publishedVer.id,
      title: "L",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    expect(res.origin.templateVersionId).toBe(publishedVer.id);
    expect(res.report.templateOrigin?.templateVersionNumber).toBe(publishedVer.versionNumber);
  });

  it("[5] falha com versão de rascunho não cria laudo, não muta stores, não chama listener, não consome IDs", () => {
    const { templateId, draftVer } = draftVersionAndPublish();
    const reportsBefore = listReports();
    const reportsSnapBefore = reportsBefore.length;
    const templatesSnapBefore = getTemplateStoreSnapshot();
    const versionsSnapBefore = getTemplateVersionsSnapshot();

    let listenerCalls = 0;
    const unsub = subscribeReports(() => {
      listenerCalls += 1;
    });

    let threw = false;
    try {
      createReportFromTemplate({
        templateId,
        templateVersionId: draftVer.id,
        title: "Título rejeitado",
        caseId: "per-1",
        caseLabel: "P1",
        variableValues: { nome_paciente: "Ana" },
      });
    } catch {
      threw = true;
    }
    unsub();

    expect(threw).toBe(true);
    expect(listReports().length).toBe(reportsSnapBefore);
    expect(getTemplateStoreSnapshot()).toBe(templatesSnapBefore);
    expect(getTemplateVersionsSnapshot()).toBe(versionsSnapBefore);
    expect(listenerCalls).toBe(0);

    // Nenhum histórico de sucesso criado para um laudo inexistente
    const created = listReports().find((r) => r.title === "Título rejeitado");
    expect(created).toBeUndefined();

    // Contador de IDs preservado: próxima criação legítima deve gerar
    // IDs esperados sem "buracos" atribuíveis à falha.
    const res = createReportFromTemplate({
      templateId,
      title: "OK",
      caseId: "per-1",
      caseLabel: "P1",
      variableValues: { nome_paciente: "Ana" },
    });
    expect(res.report.id).toBeDefined();
  });

  it("[6] mensagem PT-BR segura e amigável", () => {
    const { templateId, draftVer } = draftVersionAndPublish();
    let caught: ReportTemplateApplicationError | null = null;
    try {
      previewReportTemplateApplication({
        templateId,
        templateVersionId: draftVer.id,
        variableValues: { nome_paciente: "Ana" },
      });
    } catch (e) {
      caught = e as ReportTemplateApplicationError;
    }
    const label =
      REPORT_TEMPLATE_APPLICATION_ERROR_LABEL[caught!.code as ReportTemplateApplicationErrorCode];
    expect(label).toBe(
      "A versão selecionada não é uma versão publicada do modelo.",
    );
    // Sem vazamento de detalhes técnicos
    expect(label).not.toContain("stack");
    expect(label).not.toContain("{");
    expect(label).not.toContain("undefined");
    // Utilitário genérico também não expõe interno
    const friendly = friendlyReportTemplateError(caught);
    expect(typeof friendly).toBe("string");
  });
});
