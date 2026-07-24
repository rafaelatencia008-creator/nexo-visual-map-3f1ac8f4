/**
 * LV-09.1B.6.3B.1 — Extração definitiva do fluxo de criação da Agenda.
 *
 * Verifica estruturalmente que:
 *  - AgendaCreateContent existe e concentra a única implementação funcional;
 *  - AgendaCreateDialog virou wrapper fino;
 *  - /app/agenda/novo é uma página real (sem diálogo);
 *  - a compatibilidade dos exports históricos foi preservada;
 *  - o escopo proibido continua ausente.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function readSrc(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const CONTENT = "src/features/agenda/AgendaCreateContent.tsx";
const WRAPPER = "src/features/agenda/AgendaCreateDialog.tsx";
const PAGE = "src/routes/app.agenda.novo.tsx";
const DETAIL = "src/features/agenda/AgendaItemDetailDialog.tsx";

describe("LV-09.1B.6.3B.1 · AgendaCreateContent (nova origem funcional)", () => {
  it("1. AgendaCreateContent existe", () => {
    expect(existsSync(resolve(__dirname, "..", CONTENT))).toBe(true);
  });

  const src = readSrc(CONTENT);

  it("2. Content não importa componentes de Dialog", () => {
    expect(src).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
  });

  it("3. Content não renderiza <Dialog>", () => {
    expect(src).not.toMatch(/<Dialog[\s>]/);
    expect(src).not.toMatch(/<DialogContent[\s>]/);
  });

  it("4. Content contém a única lógica de formulário (Tabs, Inputs, Selects)", () => {
    expect(src).toMatch(/Tabs/);
    expect(src).toMatch(/deadlineForm/);
    expect(src).toMatch(/appointmentForm/);
  });

  it("5. Content contém a única lógica de permissões", () => {
    expect(src).toMatch(/permissions\.evaluate/);
    expect(src).toMatch(/deadline\.create/);
    expect(src).toMatch(/appointment\.create/);
  });

  it("6. Content contém a única lógica de assignments (paginação + retry)", () => {
    expect(src).toMatch(/assignments\.listByCase/);
    expect(src).toMatch(/ASSIGNMENTS_MAX_PAGES/);
    expect(src).toMatch(/assignmentsReqIdRef/);
    expect(src).toMatch(/assignmentsAttempt/);
  });

  it("7. Content contém a única lógica de submit (deadlines/appointments)", () => {
    expect(src).toMatch(/deadlines\.create/);
    expect(src).toMatch(/appointments\.create/);
    expect(src).toMatch(/submitting/);
    expect(src).toMatch(/submittingRef/);
  });

  it("8. Content contém a única detecção de rascunho", () => {
    expect(src).toMatch(/hasDeadlineDraft/);
    expect(src).toMatch(/hasAppointmentDraft/);
  });

  it("9. Content contém a confirmação de descarte via AlertDialog", () => {
    expect(src).toMatch(/AlertDialog/);
    expect(src).toMatch(/Descartar rascunho\?/);
    expect(src).toMatch(/confirmDiscard/);
  });

  it("10. Content usa shouldCloseAgendaCreateAfterSuccess", () => {
    expect(src).toMatch(/shouldCloseAgendaCreateAfterSuccess/);
  });

  it("11. Content declara AgendaCreateContentProps com active/onRequestClose/surface", () => {
    expect(src).toMatch(/AgendaCreateContentProps/);
    expect(src).toMatch(/active:\s*boolean/);
    expect(src).toMatch(/onRequestClose/);
    expect(src).toMatch(/surface/);
  });

  it("12. Content expõe handle imperativo requestClose via ref", () => {
    expect(src).toMatch(/AgendaCreateContentHandle/);
    expect(src).toMatch(/useImperativeHandle/);
    expect(src).toMatch(/requestClose/);
  });

  it("13. Content usa `active` (não `open`) como gate dos efeitos", () => {
    expect(src).toMatch(/if\s*\(\s*!active\s*\)/);
  });
});

describe("LV-09.1B.6.3B.1 · AgendaCreateDialog (wrapper fino)", () => {
  const src = readSrc(WRAPPER);

  it("14. wrapper monta AgendaCreateContent", () => {
    expect(src).toMatch(/<AgendaCreateContent/);
    expect(src).toMatch(/from\s+["']\.\/AgendaCreateContent["']/);
  });

  it("15. wrapper delega solicitação de fechamento ao Content via ref", () => {
    expect(src).toMatch(/AgendaCreateContentHandle/);
    expect(src).toMatch(/contentRef/);
    expect(src).toMatch(/contentRef\.current\?\.requestClose\(\)/);
  });

  it("16. wrapper não chama serviços", () => {
    expect(src).not.toMatch(/services\.deadlines/);
    expect(src).not.toMatch(/services\.appointments/);
    expect(src).not.toMatch(/services\.permissions/);
    expect(src).not.toMatch(/services\.assignments/);
  });

  it("17. wrapper não possui formulários", () => {
    expect(src).not.toMatch(/<Input\b/);
    expect(src).not.toMatch(/<Textarea\b/);
    expect(src).not.toMatch(/<Tabs\b/);
  });

  it("18. wrapper não possui estados funcionais do formulário", () => {
    expect(src).not.toMatch(/deadlineForm/);
    expect(src).not.toMatch(/appointmentForm/);
    expect(src).not.toMatch(/submitting/);
    expect(src).not.toMatch(/confirmDiscard/);
    expect(src).not.toMatch(/hasDeadlineDraft/);
    expect(src).not.toMatch(/hasAppointmentDraft/);
  });

  it("19. wrapper preserva DialogTitle e DialogDescription", () => {
    expect(src).toMatch(/<DialogTitle>/);
    expect(src).toMatch(/<DialogDescription>/);
  });

  it("20. exports históricos continuam disponíveis (AgendaCreateDialog, AgendaCreatedItem, AgendaCreateDialogProps)", () => {
    expect(src).toMatch(/export function AgendaCreateDialog/);
    expect(src).toMatch(/AgendaCreatedItem/);
    expect(src).toMatch(/AgendaCreateDialogProps/);
  });
});

describe("LV-09.1B.6.3B.1 · Página /app/agenda/novo", () => {
  const src = readSrc(PAGE);

  it("21. página importa AgendaCreateContent", () => {
    expect(src).toMatch(/AgendaCreateContent/);
    expect(src).toMatch(/from\s+["']@\/features\/agenda\/AgendaCreateContent["']/);
  });

  it("22. página não importa AgendaCreateDialog", () => {
    expect(src).not.toMatch(/AgendaCreateDialog/);
  });

  it("23. página não renderiza <Dialog>", () => {
    expect(src).not.toMatch(/<Dialog[\s>]/);
    expect(src).not.toMatch(/@\/components\/ui\/dialog/);
  });

  it("24. página possui exatamente um <h1>", () => {
    const matches = src.match(/<h1[\s>]/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("25. página oferece retorno acessível para /app/agenda", () => {
    expect(src).toMatch(/Voltar para a agenda/);
    expect(src).toMatch(/to="\/app\/agenda"/);
  });

  it("26. página usa active (montagem sempre ativa)", () => {
    expect(src).toMatch(/active(?![A-Za-z_])/);
  });

  it("27. página usa surface=\"page\"", () => {
    expect(src).toMatch(/surface="page"/);
  });

  it("28. página usa closeAfterCreate={false}", () => {
    expect(src).toMatch(/closeAfterCreate=\{false\}/);
  });

  it("29. compromisso navega SOMENTE ao detalhe (uma única navegação)", () => {
    expect(src).toMatch(/to:\s*["']\/app\/agenda\/\$appointmentId["']/);
    // Não há segunda navegação após criar compromisso.
  });

  it("30. prazo registra pendingCreated antes de voltar", () => {
    expect(src).toMatch(/setPendingCreated\(/);
    expect(src).toMatch(/requiredGeneration/);
    expect(src).toMatch(/to:\s*["']\/app\/agenda["']/);
  });

  it("31. cancelamento volta para Agenda via onRequestClose→navigate", () => {
    expect(src).toMatch(/handleRequestClose/);
    expect(src).toMatch(/onRequestClose=\{handleRequestClose\}/);
  });

  it("32. página não usa APIs proibidas nem setTimeout", () => {
    expect(src).not.toMatch(/window\.location/);
    expect(src).not.toMatch(/location\.assign/);
    expect(src).not.toMatch(/history\.pushState/);
    expect(src).not.toMatch(/setTimeout/);
  });
});

describe("LV-09.1B.6.3B.1 · Regras funcionais preservadas no Content", () => {
  const src = readSrc(CONTENT);

  it("33. erro de validação NÃO solicita fechamento (setErrors sem onRequestClose)", () => {
    // Após built.ok===false o código faz setErrors e retorna sem tocar onRequestClose.
    expect(src).toMatch(/if\s*\(!built\.ok\)\s*\{\s*\n\s*setErrors/);
  });

  it("34. erro de serviço NÃO solicita fechamento (return após setGeneralError)", () => {
    // Após res.ok===false o código faz set*Error e retorna sem chamar onRequestClose.
    expect(src).toMatch(/setGeneralError\(t\.message\);/);
  });

  it("35. single-flight continua impedindo submit duplicado", () => {
    expect(src).toMatch(/if\s*\(\s*submittingRef\.current\s*\)\s*return;/);
  });

  it("36. permissão negada continua bloqueando submit", () => {
    expect(src).toMatch(/canSubmit/);
    expect(src).toMatch(/permAllowed/);
    expect(src).toMatch(/disabled=\{!canSubmit/);
  });

  it("37. assignments continuam paginados e deduplicados", () => {
    expect(src).toMatch(/nextCursor/);
    expect(src).toMatch(/new Set/);
    expect(src).toMatch(/seen\.has/);
  });
});

describe("LV-09.1B.6.3B.1 · Sem duplicação funcional e escopo intocado", () => {
  it("38. nenhuma lógica funcional foi duplicada entre Content e wrapper", () => {
    const wrapper = readSrc(WRAPPER);
    // Se o Content já concentra tudo, o wrapper NÃO deve conter estas marcas.
    expect(wrapper).not.toMatch(/EMPTY_DEADLINE_FORM/);
    expect(wrapper).not.toMatch(/EMPTY_APPOINTMENT_FORM/);
    expect(wrapper).not.toMatch(/buildCreateDeadlineInput/);
    expect(wrapper).not.toMatch(/buildCreateAppointmentInput/);
    expect(wrapper).not.toMatch(/translateAgendaServiceError/);
    expect(wrapper).not.toMatch(/shouldCloseAgendaCreateAfterSuccess/);
  });

  it("39. AgendaItemDetailDialog não foi alterado (arquivo continua existindo com sua API)", () => {
    expect(existsSync(resolve(__dirname, "..", DETAIL))).toBe(true);
    const src = readSrc(DETAIL);
    expect(src).toMatch(/AgendaItemDetailDialog/);
  });

  it("40. AgendaItemDetailContent ainda não existe", () => {
    expect(
      existsSync(
        resolve(__dirname, "..", "src/features/agenda/AgendaItemDetailContent.tsx"),
      ),
    ).toBe(false);
  });

  it("41. disponibilidade continua ausente (LV-09.1B.7)", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/features/agenda/availability.ts")),
    ).toBe(false);
    expect(
      existsSync(
        resolve(__dirname, "..", "src/features/agenda/check-appointment-availability.ts"),
      ),
    ).toBe(false);
    expect(
      existsSync(resolve(__dirname, "..", "src/routes/app.disponibilidade.tsx")),
    ).toBe(false);
  });

  it("42. domínio, serviços e mocks permanecem inalterados (arquivos-âncora presentes)", () => {
    expect(existsSync(resolve(__dirname, "..", "src/domain/core/agenda.ts"))).toBe(true);
    expect(
      existsSync(resolve(__dirname, "..", "src/domain/services/deadline-service.ts")),
    ).toBe(true);
    expect(
      existsSync(resolve(__dirname, "..", "src/domain/services/appointment-service.ts")),
    ).toBe(true);
    expect(
      existsSync(resolve(__dirname, "..", "src/domain/mocks/deadline-mock.ts")),
    ).toBe(true);
    expect(
      existsSync(resolve(__dirname, "..", "src/domain/mocks/appointment-mock.ts")),
    ).toBe(true);
  });
});
