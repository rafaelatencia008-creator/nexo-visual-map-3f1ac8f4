/**
 * LV-09.1B.6.3B.2.2 — Página canônica definitiva do detalhe do compromisso.
 *
 * Provas estruturais: a rota `/app/agenda/$appointmentId` deixou de montar
 * o wrapper `AgendaItemDetailDialog` e passa a montar diretamente o
 * `AgendaItemDetailContent` com `surface="page"`. O calendário
 * `/app/agenda` continua usando o wrapper. Nenhum arquivo funcional do
 * detalhe/criação/domínio foi alterado.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROUTE_DETAIL_PATH = "src/routes/app.agenda.$appointmentId.tsx";
const ROUTE_INDEX_PATH = "src/routes/app.agenda.index.tsx";
const DIALOG_PATH = "src/features/agenda/AgendaItemDetailDialog.tsx";
const CONTENT_PATH = "src/features/agenda/AgendaItemDetailContent.tsx";
const ACTIVITY_PATH = "src/features/agenda/detail-activity.ts";
const CREATE_CONTENT_PATH = "src/features/agenda/AgendaCreateContent.tsx";
const CREATE_DIALOG_PATH = "src/features/agenda/AgendaCreateDialog.tsx";
const RESOLVE_PATH = "src/features/agenda/resolve-appointment-route.ts";
const DEC_PATH = "docs/decisions/DEC-AGE-001-rotas-canonicas.md";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const ROUTE_SRC = read(ROUTE_DETAIL_PATH);
const ROUTE_INDEX_SRC = read(ROUTE_INDEX_PATH);
const DIALOG_SRC = read(DIALOG_PATH);
const CONTENT_SRC = read(CONTENT_PATH);
const DEC_SRC = read(DEC_PATH);

describe("LV-09.1B.6.3B.2.2 · Rota importa Content e não o wrapper", () => {
  it("1. rota importa AgendaItemDetailContent", () => {
    expect(ROUTE_SRC).toMatch(
      /import\s*\{[^}]*AgendaItemDetailContent[^}]*\}\s*from\s*"@\/features\/agenda\/AgendaItemDetailContent"/s,
    );
  });
  it("2. rota importa AgendaItemDetailContentHandle", () => {
    expect(ROUTE_SRC).toMatch(/AgendaItemDetailContentHandle/);
  });
  it("3. rota NÃO importa AgendaItemDetailDialog", () => {
    expect(ROUTE_SRC).not.toMatch(
      /from\s+"@\/features\/agenda\/AgendaItemDetailDialog"/,
    );
  });
  it("4. rota NÃO renderiza <AgendaItemDetailDialog>", () => {
    expect(ROUTE_SRC).not.toMatch(/<AgendaItemDetailDialog\b/);
  });
  it("5. rota NÃO importa componentes de Dialog (Radix / shadcn)", () => {
    expect(ROUTE_SRC).not.toMatch(/@\/components\/ui\/dialog/);
    expect(ROUTE_SRC).not.toMatch(/<DialogContent\b/);
    expect(ROUTE_SRC).not.toMatch(/<DialogHeader\b/);
  });
});

describe("LV-09.1B.6.3B.2.2 · Montagem do Content", () => {
  it("6. rota monta <AgendaItemDetailContent", () => {
    expect(ROUTE_SRC).toMatch(/<AgendaItemDetailContent\b/);
  });
  it('7. rota passa surface="page"', () => {
    expect(ROUTE_SRC).toMatch(/surface="page"/);
  });
  it("8. rota passa active como prop", () => {
    expect(ROUTE_SRC).toMatch(/\bactive\b/);
  });
  it("9. rota passa ref={contentRef}", () => {
    expect(ROUTE_SRC).toMatch(/ref=\{contentRef\}/);
  });
  it("10. rota cria contentRef via useRef", () => {
    expect(ROUTE_SRC).toMatch(
      /const\s+contentRef\s*=\s*React\.useRef<AgendaItemDetailContentHandle\s*\|\s*null>\(null\)/,
    );
  });
});

describe("LV-09.1B.6.3B.2.2 · Botão superior delega ao handle", () => {
  it("11. botão superior chama handleBackRequest", () => {
    expect(ROUTE_SRC).toMatch(/onClick=\{handleBackRequest\}/);
  });
  it("12. handleBackRequest usa variável local para contentRef.current", () => {
    expect(ROUTE_SRC).toMatch(
      /const\s+handle\s*=\s*contentRef\.current;/,
    );
  });
  it("13. handle existente chama requestClose()", () => {
    expect(ROUTE_SRC).toMatch(/handle\.requestClose\(\);/);
  });
  it("14. fallback navega somente quando o handle não existe", () => {
    // A ordem é: if (handle) { requestClose; return; }  navigate(...)
    expect(ROUTE_SRC).toMatch(
      /if\s*\(handle\)\s*\{[^}]*handle\.requestClose\(\);[^}]*return;[^}]*\}\s*navigate\(\{\s*to:\s*"\/app\/agenda"\s*\}\);/s,
    );
  });
  it('15. não existe <Link to="/app/agenda"> na página pronta', () => {
    expect(ROUTE_SRC).not.toMatch(/<Link\s+to="\/app\/agenda"/);
  });
});

describe("LV-09.1B.6.3B.2.2 · Rota não duplica gates/locks do Content", () => {
  it("16. rota não contém detecção de alterações locais", () => {
    expect(ROUTE_SRC).not.toMatch(/hasLocalChanges/);
  });
  it("17. rota não contém confirmDiscard", () => {
    expect(ROUTE_SRC).not.toMatch(/confirmDiscard/);
  });
  it("18. rota não contém submittingRef", () => {
    expect(ROUTE_SRC).not.toMatch(/submittingRef/);
  });
  it("19. rota não contém mutationLock", () => {
    expect(ROUTE_SRC).not.toMatch(/mutationLock/);
  });
  it("20. rota não contém resolveDiscardIntent", () => {
    expect(ROUTE_SRC).not.toMatch(/resolveDiscardIntent/);
  });
});

describe("LV-09.1B.6.3B.2.2 · Fechamento e mutações", () => {
  it('21. onRequestClose navega para /app/agenda', () => {
    expect(ROUTE_SRC).toMatch(
      /handleRequestClose[\s\S]*navigate\(\{\s*to:\s*"\/app\/agenda"\s*\}\)/,
    );
    expect(ROUTE_SRC).toMatch(/onRequestClose=\{handleRequestClose\}/);
  });
  it("22. update mantém buildPendingUpdateMarker", () => {
    expect(ROUTE_SRC).toMatch(/buildPendingUpdateMarker\(/);
  });
  it("23. update mantém loadGenerationRef.current", () => {
    expect(ROUTE_SRC).toMatch(/loadGenerationRef\.current/);
  });
  it("24. update permanece na rota (não navega em handleUpdated)", () => {
    const m = ROUTE_SRC.match(
      /const\s+handleUpdated\s*=\s*React\.useCallback\(([\s\S]*?)\},\s*\[/,
    );
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/navigate\(/);
  });
  it("25. delete mantém buildPendingRemovalMarker", () => {
    expect(ROUTE_SRC).toMatch(/buildPendingRemovalMarker\(/);
  });
  it("26. delete navega para /app/agenda", () => {
    const m = ROUTE_SRC.match(
      /const\s+handleDeleted\s*=\s*React\.useCallback\(([\s\S]*?)\},\s*\[/,
    );
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/navigate\(\{\s*to:\s*"\/app\/agenda"\s*\}\)/);
  });
});

describe("LV-09.1B.6.3B.2.2 · Estados prévios preservados", () => {
  it("27. loading permanece", () => {
    expect(ROUTE_SRC).toMatch(/Carregando compromisso/);
  });
  it("28. not_found permanece", () => {
    expect(ROUTE_SRC).toMatch(/Compromisso não encontrado/);
  });
  it("29. forbidden/error permanece", () => {
    expect(ROUTE_SRC).toMatch(/Não foi possível carregar/);
    expect(ROUTE_SRC).toMatch(
      /resolution\.code\s*===\s*"forbidden"/,
    );
  });
});

describe("LV-09.1B.6.3B.2.2 · Heading único e Content dono do h1 funcional", () => {
  it("30. rota usa somente um h1 quando Content está montado", () => {
    // Estados not_found e error contêm h1 próprios; o caminho 'found' NÃO
    // deve conter <h1> no JSX da página — o h1 pertence ao Content.
    // Localizamos o bloco após "resolution.kind === \"error\"" até o final.
    const idx = ROUTE_SRC.lastIndexOf("resolution.kind");
    expect(idx).toBeGreaterThan(0);
    const tail = ROUTE_SRC.slice(idx);
    // Após passar pelo bloco de erro, o final da função monta o Content.
    const afterFound = tail.split("appointment: Appointment")[1] ?? "";
    expect(afterFound).not.toMatch(/<h1\b/);
  });
  it("31. Content continua contendo o h1 de página", () => {
    expect(CONTENT_SRC).toMatch(/surface\s*===\s*"(page|dialog)"/);
    expect(CONTENT_SRC).toMatch(/<h1\b/);
  });
  it("32. atualização de referenceEpoch não faz parte da identidade semântica", () => {
    // A identidade semântica do detalhe deriva de type/caseId/id (ver
    // detail-activity.ts). A rota apenas propaga referenceEpoch para o
    // Content; não a inclui em selected.
    const m = ROUTE_SRC.match(/selected=\{\{([\s\S]*?)\}\}/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/referenceEpoch/);
    expect(m![1]).toMatch(/type:\s*"appointment"/);
    expect(m![1]).toMatch(/caseId:/);
    expect(m![1]).toMatch(/id:/);
  });
});

describe("LV-09.1B.6.3B.2.2 · Wrapper e escopo intocado", () => {
  it("33. calendário /app/agenda continua usando o wrapper", () => {
    expect(ROUTE_INDEX_SRC).toMatch(/<AgendaItemDetailDialog\b/);
  });
  it("34. AgendaItemDetailDialog continua existindo", () => {
    expect(existsSync(resolve(__dirname, "..", DIALOG_PATH))).toBe(true);
  });
  it("35. wrapper continua fino (sem lógica de submit/lock)", () => {
    expect(DIALOG_SRC).toMatch(/AgendaItemDetailContent/);
    expect(DIALOG_SRC).toMatch(/handle\.requestClose\(\)/);
    expect(DIALOG_SRC).not.toMatch(
      /mutationInFlightRef|writeOperationRef|SingleFlightLock/,
    );
  });
  it("36. AgendaItemDetailContent permanece existente", () => {
    expect(existsSync(resolve(__dirname, "..", CONTENT_PATH))).toBe(true);
  });
  it("37. detail-activity.ts permanece existente", () => {
    expect(existsSync(resolve(__dirname, "..", ACTIVITY_PATH))).toBe(true);
  });
  it("38. criação permanece inalterada (Content + Dialog existem)", () => {
    expect(existsSync(resolve(__dirname, "..", CREATE_CONTENT_PATH))).toBe(
      true,
    );
    expect(existsSync(resolve(__dirname, "..", CREATE_DIALOG_PATH))).toBe(true);
  });
  it("39. resolvedor permanece inalterado (arquivo existe)", () => {
    expect(existsSync(resolve(__dirname, "..", RESOLVE_PATH))).toBe(true);
  });
  it("40. disponibilidade continua ausente", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/routes/app.disponibilidade.tsx")),
    ).toBe(false);
    expect(
      existsSync(
        resolve(__dirname, "..", "src/features/agenda/availability.ts"),
      ),
    ).toBe(false);
  });
  it("41. domínio, serviços e mocks permanecem inalterados (pastas existem)", () => {
    expect(existsSync(resolve(__dirname, "..", "src/domain/core"))).toBe(true);
    expect(existsSync(resolve(__dirname, "..", "src/domain/services"))).toBe(
      true,
    );
    expect(existsSync(resolve(__dirname, "..", "src/domain/mocks"))).toBe(true);
  });
});

describe("LV-09.1B.6.3B.2.2 · DEC-AGE-001 reflete o progresso", () => {
  it("42. DEC menciona LV-09.1B.6.3B.2.2 e a página canônica", () => {
    expect(DEC_SRC).toMatch(/LV-09\.1B\.6\.3B\.2\.2/);
    expect(DEC_SRC).toMatch(/surface="page"|surface=\"page\"|surface: "page"/);
  });
});
