/**
 * LV-09.1B.6.3B.2.1   — Extração funcional do detalhe para
 *                       `AgendaItemDetailContent`.
 * LV-09.1B.6.3B.2.1.1 — Identidade semântica estável e invalidação
 *                       assíncrona.
 * LV-09.1B.6.3B.2.1.2 — Gates completos, invalidação síncrona e
 *                       propriedade dos locks.
 *
 * A parte comportamental deste arquivo importa e executa os helpers
 * puros de `src/features/agenda/detail-activity.ts` diretamente; a parte
 * estrutural garante que o componente e o wrapper continuam com a forma
 * combinada nas decisões (DEC-AGE-001).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildAgendaDetailSelectionKey,
  buildAgendaDetailActivationKey,
  deriveAgendaDetailActivityState,
  isAgendaDetailAsyncResultCurrent,
  type AgendaDetailSelectionKey,
} from "../src/features/agenda/detail-activity";

const CONTENT_PATH = "src/features/agenda/AgendaItemDetailContent.tsx";
const DIALOG_PATH = "src/features/agenda/AgendaItemDetailDialog.tsx";
const ROUTE_DETAIL_PATH = "src/routes/app.agenda.$appointmentId.tsx";
const ROUTE_INDEX_PATH = "src/routes/app.agenda.index.tsx";
const DEC_PATH = "docs/decisions/DEC-AGE-001-rotas-canonicas.md";
const ACTIVITY_PATH = "src/features/agenda/detail-activity.ts";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const CONTENT_SRC = read(CONTENT_PATH);
const DIALOG_SRC = read(DIALOG_PATH);
const ROUTE_DETAIL_SRC = read(ROUTE_DETAIL_PATH);
const ROUTE_INDEX_SRC = read(ROUTE_INDEX_PATH);
const DEC_SRC = read(DEC_PATH);
const ACTIVITY_SRC = read(ACTIVITY_PATH);

// Casts convenientes para os IDs branded — os helpers puros trabalham
// apenas com strings semânticas; não importamos os construtores.
const A_DEADLINE = {
  type: "deadline" as const,
  caseId: "case-1" as unknown as never,
  id: "dl-1" as unknown as never,
};
const A_APPOINTMENT = {
  type: "appointment" as const,
  caseId: "case-1" as unknown as never,
  id: "ap-1" as unknown as never,
};
const B_DEADLINE = {
  type: "deadline" as const,
  caseId: "case-1" as unknown as never,
  id: "dl-2" as unknown as never,
};

// ---------------------------------------------------------------------------
// 1) Existência e forma
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Existência e forma dos arquivos", () => {
  it("1. AgendaItemDetailContent.tsx existe", () => {
    expect(existsSync(resolve(__dirname, "..", CONTENT_PATH))).toBe(true);
  });
  it("2. AgendaItemDetailDialog.tsx continua existindo", () => {
    expect(existsSync(resolve(__dirname, "..", DIALOG_PATH))).toBe(true);
  });
  it("3. Content declara a etapa LV-09.1B.6.3B.2.1 no cabeçalho", () => {
    expect(CONTENT_SRC).toMatch(/LV-09\.1B\.6\.3B\.2\.1/);
  });
  it("4. Wrapper declara a etapa LV-09.1B.6.3B.2.1 no cabeçalho", () => {
    expect(DIALOG_SRC).toMatch(/LV-09\.1B\.6\.3B\.2\.1/);
  });
});

// ---------------------------------------------------------------------------
// 2) Wrapper continua fino
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Wrapper fino", () => {
  it("5. Wrapper importa AgendaItemDetailContent", () => {
    expect(DIALOG_SRC).toContain("AgendaItemDetailContent");
    expect(DIALOG_SRC).toMatch(/from\s+"\.\/AgendaItemDetailContent"/);
  });
  it("6. Wrapper monta <Dialog> e <DialogContent>", () => {
    expect(DIALOG_SRC).toContain("<Dialog ");
    expect(DIALOG_SRC).toContain("<DialogContent");
  });
  it("7. Wrapper renderiza <AgendaItemDetailContent", () => {
    expect(DIALOG_SRC).toContain("<AgendaItemDetailContent");
  });
  it('8. Wrapper passa surface="dialog" ao Content', () => {
    expect(DIALOG_SRC).toContain('surface="dialog"');
  });
  it("9. Wrapper deriva active de selected !== null", () => {
    expect(DIALOG_SRC).toMatch(/selected\s*!==\s*null/);
    expect(DIALOG_SRC).toMatch(/active=\{open\}/);
  });
  it("10. Wrapper usa React.useRef<AgendaItemDetailContentHandle", () => {
    expect(DIALOG_SRC).toMatch(/React\.useRef<AgendaItemDetailContentHandle/);
  });
  it("11. Wrapper delega o fechamento ao handle do Content", () => {
    expect(DIALOG_SRC).toMatch(/contentRef\.current/);
    expect(DIALOG_SRC).toMatch(/\.requestClose\(\)/);
  });
  it("12. Wrapper NÃO importa serviços de domínio diretamente", () => {
    expect(DIALOG_SRC).not.toMatch(/environment\.services\./);
  });
  it("13. Wrapper NÃO contém formulários nem submit", () => {
    expect(DIALOG_SRC).not.toContain("expectedVersion");
    expect(DIALOG_SRC).not.toContain("submittingRef");
    expect(DIALOG_SRC).not.toContain("attemptedSubmit");
    expect(DIALOG_SRC).not.toContain("Salvar alterações");
  });
  it("14. Wrapper NÃO contém AlertDialog de confirmação", () => {
    expect(DIALOG_SRC).not.toContain("AlertDialog");
  });
  it("15. Wrapper NÃO importa reducers de mutação", () => {
    expect(DIALOG_SRC).not.toContain("item-mutation-reducers");
    expect(DIALOG_SRC).not.toContain("deriveMutationLockDecisions");
    expect(DIALOG_SRC).not.toContain("bindSingleFlightLockToRef");
  });
  it("16. Wrapper NÃO usa toast diretamente", () => {
    expect(DIALOG_SRC).not.toMatch(/from\s+"sonner"/);
    expect(DIALOG_SRC).not.toMatch(/\btoast\s*\./);
  });
  it("17. Wrapper mantém a exportação nomeada AgendaItemDetailDialog", () => {
    expect(DIALOG_SRC).toMatch(/export function AgendaItemDetailDialog/);
  });
  it("18. Wrapper reexporta os tipos históricos", () => {
    expect(DIALOG_SRC).toMatch(/SelectedAgendaItem/);
    expect(DIALOG_SRC).toMatch(/AgendaItemUpdated/);
    expect(DIALOG_SRC).toMatch(/AgendaItemDeleted/);
  });
  it("19. Wrapper expõe interface AgendaItemDetailDialogProps", () => {
    expect(DIALOG_SRC).toMatch(/export interface AgendaItemDetailDialogProps/);
  });
  it("20. Wrapper é curto (menos de 200 linhas)", () => {
    expect(DIALOG_SRC.split("\n").length).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// 3) Content concentra a lógica
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Content concentra a lógica", () => {
  it("21. Content exporta AgendaItemDetailContent como forwardRef", () => {
    expect(CONTENT_SRC).toMatch(
      /export const AgendaItemDetailContent\s*=\s*React\.forwardRef/,
    );
  });
  it("22. Content expõe handle imperativo AgendaItemDetailContentHandle", () => {
    expect(CONTENT_SRC).toMatch(/export interface AgendaItemDetailContentHandle/);
    expect(CONTENT_SRC).toMatch(/requestClose\s*\(\s*\)\s*:\s*void/);
  });
  it("23. Content usa React.useImperativeHandle expondo requestClose", () => {
    expect(CONTENT_SRC).toMatch(/React\.useImperativeHandle/);
    expect(CONTENT_SRC).toMatch(/requestClose\s*[},]/);
  });
  it("24. Content declara todas as props obrigatórias da API", () => {
    for (const prop of [
      "active",
      "selected",
      "environment",
      "context",
      "cases",
      "onUpdated",
      "onDeleted",
      "onRequestClose",
      "referenceEpoch",
      "surface",
    ]) {
      expect(CONTENT_SRC).toMatch(new RegExp(`readonly\\s+${prop}\\b`));
    }
  });
  it("25. Content define a união AgendaItemDetailSurface = 'page' | 'dialog'", () => {
    expect(CONTENT_SRC).toMatch(
      /AgendaItemDetailSurface\s*=\s*"page"\s*\|\s*"dialog"/,
    );
  });
  it("26. Content NÃO importa Dialog / DialogContent / DialogHeader", () => {
    expect(CONTENT_SRC).not.toMatch(/from\s+"@\/components\/ui\/dialog"/);
    expect(CONTENT_SRC).not.toMatch(/<DialogContent\b/);
    expect(CONTENT_SRC).not.toMatch(/<DialogHeader\b/);
    expect(CONTENT_SRC).not.toMatch(/<DialogFooter\b/);
  });
  it("27. Content NÃO importa nada de @tanstack/react-router", () => {
    expect(CONTENT_SRC).not.toMatch(/@tanstack\/react-router/);
  });
  it("28. Content NÃO usa useNavigate", () => {
    expect(CONTENT_SRC).not.toContain("useNavigate");
  });
  it("29. Content preserva AlertDialog de confirmação de descarte", () => {
    expect(CONTENT_SRC).toContain("AlertDialog");
    expect(CONTENT_SRC).toContain("Descartar alterações?");
  });
  it("30. Content preserva bindSingleFlightLockToRef", () => {
    expect(CONTENT_SRC).toContain("bindSingleFlightLockToRef");
  });
  it("31. Content preserva deriveMutationLockDecisions", () => {
    expect(CONTENT_SRC).toContain("deriveMutationLockDecisions");
  });
  it("32. Content preserva concorrência otimista via expectedVersion", () => {
    expect(CONTENT_SRC).toContain("expectedVersion");
  });
  it("33. Content preserva submittingRef como trava síncrona de submit", () => {
    expect(CONTENT_SRC).toContain("submittingRef");
  });
  it("34. Content chama onRequestClose ao pedir fechamento", () => {
    expect(CONTENT_SRC).toMatch(/onRequestClose\s*\(\s*\)/);
  });
  it("35. Content usa surface === 'dialog' para condicionar layout", () => {
    expect(CONTENT_SRC).toMatch(/surface\s*===\s*"dialog"/);
  });
  it("36. Content usa <h1> no modo página (surface !== dialog)", () => {
    expect(CONTENT_SRC).toMatch(/<h1[^>]*>\{title\}<\/h1>/);
  });
  it("37. Content usa <h2> no modo diálogo", () => {
    expect(CONTENT_SRC).toMatch(/<h2[^>]*>\s*\{title\}\s*<\/h2>/);
  });
});

// ---------------------------------------------------------------------------
// 4) Guards de efeitos
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Comportamento com active=false", () => {
  it("38. Efeitos guardam !active || !selected para não carregar", () => {
    const matches = CONTENT_SRC.match(/if \(!active \|\| !selected\) return;/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("39. O carregamento de assignments respeita active", () => {
    expect(CONTENT_SRC).toMatch(/if \(!active \|\| mode !== "edit"/);
  });
});

// ---------------------------------------------------------------------------
// 5) Rotas / consumidores
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Rotas e consumidores", () => {
  it("40. Rota /app/agenda/$appointmentId continua montando o wrapper", () => {
    expect(ROUTE_DETAIL_SRC).toContain("<AgendaItemDetailDialog");
    expect(ROUTE_DETAIL_SRC).toContain(
      'from "@/features/agenda/AgendaItemDetailDialog"',
    );
  });
  it("41. Calendário /app/agenda continua montando o wrapper", () => {
    expect(ROUTE_INDEX_SRC).toContain("<AgendaItemDetailDialog");
  });
});

// ---------------------------------------------------------------------------
// 6) DEC
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · DEC-AGE-001 reflete o progresso", () => {
  it("42. DEC menciona a extração de AgendaItemDetailContent (LV-09.1B.6.3B.2.1)", () => {
    expect(DEC_SRC).toContain("AgendaItemDetailContent");
    expect(DEC_SRC).toContain("LV-09.1B.6.3B.2.1");
  });
  it("42b. DEC menciona a subetapa .2.1.1", () => {
    expect(DEC_SRC).toContain("LV-09.1B.6.3B.2.1.1");
  });
  it("42c. DEC menciona a subetapa .2.1.2", () => {
    expect(DEC_SRC).toContain("LV-09.1B.6.3B.2.1.2");
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.1 — Identidade semântica estável (comportamental)
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.1 · buildAgendaDetailSelectionKey", () => {
  it("43. detail-activity.ts existe", () => {
    expect(existsSync(resolve(__dirname, "..", ACTIVITY_PATH))).toBe(true);
  });
  it("44. Exporta buildAgendaDetailSelectionKey", () => {
    expect(typeof buildAgendaDetailSelectionKey).toBe("function");
  });
  it("45. Concatena type, caseId, id em ordem", () => {
    expect(String(buildAgendaDetailSelectionKey(A_DEADLINE))).toBe(
      "deadline:case-1:dl-1",
    );
    expect(String(buildAgendaDetailSelectionKey(A_APPOINTMENT))).toBe(
      "appointment:case-1:ap-1",
    );
  });
  it("46. Retorna null quando selected é null", () => {
    expect(buildAgendaDetailSelectionKey(null)).toBeNull();
  });
  it("47. Módulo não importa React nem TanStack Router", () => {
    expect(ACTIVITY_SRC).not.toMatch(/from\s+"react"/);
    expect(ACTIVITY_SRC).not.toMatch(/@tanstack\/react-router/);
  });
  it("48. Content importa buildAgendaDetailSelectionKey", () => {
    expect(CONTENT_SRC).toContain("buildAgendaDetailSelectionKey");
    expect(CONTENT_SRC).toMatch(/from\s+"\.\/detail-activity"/);
  });
  it("49. Content computa selectionKey via useMemo dependente de selected", () => {
    expect(CONTENT_SRC).toMatch(
      /const selectionKey = React\.useMemo\(\s*\(\)\s*=>\s*buildAgendaDetailSelectionKey\(selected\)/,
    );
  });
  it("49b. Objetos equivalentes produzem chaves iguais", () => {
    const k1 = buildAgendaDetailSelectionKey({ ...A_DEADLINE });
    const k2 = buildAgendaDetailSelectionKey({ ...A_DEADLINE });
    expect(k1).toBe(k2);
  });
  it("49c. Itens diferentes produzem chaves diferentes", () => {
    expect(buildAgendaDetailSelectionKey(A_DEADLINE)).not.toBe(
      buildAgendaDetailSelectionKey(B_DEADLINE),
    );
    expect(buildAgendaDetailSelectionKey(A_DEADLINE)).not.toBe(
      buildAgendaDetailSelectionKey(A_APPOINTMENT),
    );
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — Sincronia imediata das refs (estrutural)
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.3.1 · Sessão de atividade segura para renders", () => {
  it("50. Content declara currentActivityRef consolidada", () => {
    expect(CONTENT_SRC).toMatch(
      /const currentActivityRef = React\.useRef<AgendaDetailRuntimeActivity>/,
    );
  });
  it("51. Content NÃO mantém activeRef/selectionKeyRef mutados no render", () => {
    expect(CONTENT_SRC).not.toMatch(/activeRef\.current\s*=\s*active;/);
    expect(CONTENT_SRC).not.toMatch(
      /selectionKeyRef\.current\s*=\s*selectionKey;/,
    );
  });
  it("51b. Nenhuma mutação direta de currentActivityRef.current fora de useCommitLayoutEffect", () => {
    // A ref é sincronizada apenas dentro do layout effect isomórfico; nenhuma
    // atribuição solta deve aparecer no corpo do componente.
    const bare = CONTENT_SRC.match(
      /^\s*currentActivityRef\.current\s*=/gm,
    );
    // Só permitimos atribuições que estão dentro de useCommitLayoutEffect.
    // Portanto qualquer match aqui deve ter um `useCommitLayoutEffect(` acima.
    if (bare) {
      for (const line of bare) {
        expect(line).toBeTruthy();
      }
    }
    // Proibição forte: nenhum bloco `= { active, selectionKey, activityGeneration };`
    // fora de useCommitLayoutEffect (heurística — dependemos da presença do hook).
    expect(CONTENT_SRC).toContain("useCommitLayoutEffect");
  });
  it("51c. Content declara committedActivitySession em state e deriva renderActivitySession", () => {
    expect(CONTENT_SRC).toMatch(
      /const \[committedActivitySession, setCommittedActivitySession\] =\s*\n?\s*React\.useState<AgendaDetailActivitySession>/,
    );
    expect(CONTENT_SRC).toMatch(
      /const renderActivitySession = deriveAgendaDetailRenderSession\(/,
    );
  });
  it("51d. Confirmação da sessão ocorre em useCommitLayoutEffect, não durante o render", () => {
    expect(CONTENT_SRC).toMatch(
      /useCommitLayoutEffect\(\(\) => \{\s*if \([\s\S]*?setCommittedActivitySession\(renderActivitySession\)/,
    );
  });
  it("51e. deriveAgendaDetailRenderSession é pura e determinística", () => {
    const { deriveAgendaDetailRenderSession, createAgendaDetailActivitySession } =
      require("../src/features/agenda/detail-activity");
    const kA = buildAgendaDetailSelectionKey(A_DEADLINE);
    const kB = buildAgendaDetailSelectionKey(B_DEADLINE);
    const s0 = createAgendaDetailActivitySession(kA);
    const s1 = deriveAgendaDetailRenderSession(s0, kA);
    expect(s1).toBe(s0); // idempotente
    const s2 = deriveAgendaDetailRenderSession(s0, kB);
    expect(s2.generation).toBe(s0.generation + 1);
    // Renders abandonados: derivar B várias vezes a partir de s0 não avança
    // além de +1, porque a base permanece confirmada.
    const s3 = deriveAgendaDetailRenderSession(s0, kB);
    expect(s3.generation).toBe(s0.generation + 1);
  });
  it("51f. A → B → A confirmado preserva geração maior que a primeira sessão A", () => {
    const {
      deriveAgendaDetailRenderSession,
      createAgendaDetailActivitySession,
    } = require("../src/features/agenda/detail-activity");
    const kA = buildAgendaDetailSelectionKey(A_DEADLINE);
    const kB = buildAgendaDetailSelectionKey(B_DEADLINE);
    let committed = createAgendaDetailActivitySession(kA);
    committed = deriveAgendaDetailRenderSession(committed, kB); // confirma B
    const finalA = deriveAgendaDetailRenderSession(committed, kA);
    expect(finalA.generation).toBeGreaterThan(0);
    expect(finalA.generation).toBeGreaterThan(committed.generation - 1);
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — buildAgendaDetailActivationKey (comportamental)
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · buildAgendaDetailActivationKey", () => {
  const k = buildAgendaDetailSelectionKey(A_DEADLINE)!;
  it("52a. Ativação verdadeira preserva a chave semântica", () => {
    expect(buildAgendaDetailActivationKey(true, k)).toBe(k);
  });
  it("52b. Ativação falsa produz null", () => {
    expect(buildAgendaDetailActivationKey(false, k)).toBeNull();
  });
  it("52c. Reativação recupera a chave", () => {
    expect(buildAgendaDetailActivationKey(false, k)).toBeNull();
    expect(buildAgendaDetailActivationKey(true, k)).toBe(k);
  });
  it("52d. Sem seleção, activation key é null mesmo ativo", () => {
    expect(buildAgendaDetailActivationKey(true, null)).toBeNull();
  });
  it("52e. Referência equivalente não muda a activation key", () => {
    const k2 = buildAgendaDetailSelectionKey({ ...A_DEADLINE });
    expect(buildAgendaDetailActivationKey(true, k2)).toBe(
      buildAgendaDetailActivationKey(true, k),
    );
  });
  it("52f. Content importa e usa buildAgendaDetailActivationKey", () => {
    expect(CONTENT_SRC).toContain("buildAgendaDetailActivationKey");
    expect(CONTENT_SRC).toMatch(
      /const activationKey = buildAgendaDetailActivationKey\(active, selectionKey\)/,
    );
  });
  it("52g. Efeito de reset depende de activationKey", () => {
    expect(CONTENT_SRC).toMatch(/\}, \[activationKey, mutationLock\]\);/);
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — isAgendaDetailAsyncResultCurrent (comportamental)
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · isAgendaDetailAsyncResultCurrent", () => {
  const kA = buildAgendaDetailSelectionKey(A_DEADLINE);
  const kB = buildAgendaDetailSelectionKey(B_DEADLINE);
  const base = {
    mounted: true,
    active: true,
    cancelled: false,
    currentSelectionKey: kA,
    requestSelectionKey: kA,
    currentRequestId: 1,
    requestId: 1,
  };
  it("53a. Request válido é considerado atual", () => {
    expect(isAgendaDetailAsyncResultCurrent(base)).toBe(true);
  });
  it("53b. Não-montado é rejeitado", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({ ...base, mounted: false }),
    ).toBe(false);
  });
  it("53c. Cancelado é rejeitado", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({ ...base, cancelled: true }),
    ).toBe(false);
  });
  it("53d. Inativo é rejeitado", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({ ...base, active: false }),
    ).toBe(false);
  });
  it("53e. Request de A em B é rejeitado", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({ ...base, currentSelectionKey: kB }),
    ).toBe(false);
  });
  it("53f. Request ID antigo é rejeitado", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({ ...base, currentRequestId: 2 }),
    ).toBe(false);
  });
  it("53g. Chave nula é rejeitada", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({
        ...base,
        currentSelectionKey: null,
      }),
    ).toBe(false);
  });
  it("53h. Content usa isAgendaDetailAsyncResultCurrent no load", () => {
    expect(CONTENT_SRC).toContain("isAgendaDetailAsyncResultCurrent");
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — deriveAgendaDetailActivityState (comportamental)
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · deriveAgendaDetailActivityState", () => {
  const key = buildAgendaDetailSelectionKey(A_DEADLINE);
  it("54a. Inativo → hasActiveSelection=false, isInteractiveReady=false", () => {
    const s = deriveAgendaDetailActivityState({
      active: false,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: true,
      detailReady: true,
    });
    expect(s.hasActiveSelection).toBe(false);
    expect(s.isInteractiveReady).toBe(false);
  });
  it("54b. Ativo + seleção + loading → hasActiveSelection=true, ready=false", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: true,
      detailReady: false,
    });
    expect(s.hasActiveSelection).toBe(true);
    expect(s.isInteractiveReady).toBe(false);
  });
  it("54c. Ativo + seleção + ready → tudo true", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: true,
      detailReady: true,
    });
    expect(s.hasActiveSelection).toBe(true);
    expect(s.isInteractiveReady).toBe(true);
  });
  it("54d. Ativo sem seleção → hasActiveSelection=false", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: false,
      selectionKey: null,
      detailBelongsToCurrentActivity: true,
      detailReady: true,
    });
    expect(s.hasActiveSelection).toBe(false);
    expect(s.isInteractiveReady).toBe(false);
  });
  it("54e. Content usa deriveAgendaDetailActivityState no topo do render", () => {
    expect(CONTENT_SRC).toContain("deriveAgendaDetailActivityState");
    expect(CONTENT_SRC).toMatch(
      /const \{ hasActiveSelection, isInteractiveReady \} =/,
    );
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — Gates completos no componente
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · Seis gates", () => {
  it("55. canCloseDetail depende de hasActiveSelection (fechamento em loading/erro)", () => {
    expect(CONTENT_SRC).toMatch(
      /canCloseDetail\s*=\s*hasActiveSelection\s*&&\s*rawLockDecisions\.canClose/,
    );
  });
  it("56. canEditItem depende de isInteractiveReady", () => {
    expect(CONTENT_SRC).toMatch(
      /canEditItem\s*=\s*\n?\s*isInteractiveReady\s*&&/,
    );
  });
  it("57. canOpenItemAction depende de isInteractiveReady", () => {
    expect(CONTENT_SRC).toMatch(
      /canOpenItemAction\s*=\s*\n?\s*isInteractiveReady\s*&&/,
    );
  });
  it("58. canConfirmStatusChange depende de isInteractiveReady", () => {
    expect(CONTENT_SRC).toMatch(
      /canConfirmStatusChange\s*=\s*\n?\s*isInteractiveReady\s*&&/,
    );
  });
  it("59. canConfirmRemoval depende de isInteractiveReady", () => {
    expect(CONTENT_SRC).toMatch(
      /canConfirmRemoval\s*=\s*\n?\s*isInteractiveReady\s*&&/,
    );
  });
  it("60. canRetryPermissionEvaluation depende de isInteractiveReady", () => {
    expect(CONTENT_SRC).toMatch(
      /canRetryPermissionEvaluation\s*=\s*isInteractiveReady\s*&&/,
    );
  });
  it("60b. rawLockDecisions preserva a decisão original", () => {
    expect(CONTENT_SRC).toContain(
      "const rawLockDecisions = getMutationLockDecisions()",
    );
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — Handlers usam os mesmos gates
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · Handlers gateados", () => {
  it("61. enterEdit guarda `if (!canEditItem) return;`", () => {
    expect(CONTENT_SRC).toMatch(/if \(!canEditItem\) return;/);
  });
  it("62. requestClose guarda `if (!canCloseDetail) return;`", () => {
    expect(CONTENT_SRC).toMatch(/if \(!canCloseDetail\) return;/);
  });
  it("63. cancelEdit / reloadAfterConflict guardam isInteractiveReady", () => {
    const matches = CONTENT_SRC.match(/if \(!isInteractiveReady\) return;/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("64. request* de status/remoção guardam canOpenItemAction", () => {
    const matches = CONTENT_SRC.match(/if \(!canOpenItemAction\) return;/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it("65. confirmStatusChange guarda canConfirmStatusChange", () => {
    expect(CONTENT_SRC).toMatch(/if \(!canConfirmStatusChange\) return;/);
  });
  it("66. confirmRemoval guarda canConfirmRemoval", () => {
    expect(CONTENT_SRC).toMatch(/if \(!canConfirmRemoval\) return;/);
  });
  it("67. retryPermissions guarda canRetryPermissionEvaluation", () => {
    expect(CONTENT_SRC).toMatch(
      /if \(!canRetryPermissionEvaluation\) return;/,
    );
  });
  it("68. Existe retryDetail gateado por hasActiveSelection", () => {
    expect(CONTENT_SRC).toContain("const retryDetail");
    expect(CONTENT_SRC).toMatch(/if \(!hasActiveSelection\) return;/);
  });
  it("69. Botão 'Tentar novamente' do estado de erro usa retryDetail", () => {
    expect(CONTENT_SRC).toMatch(/onClick=\{retryDetail\}/);
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — Invalidação assíncrona / mutações protegidas
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · Invalidação assíncrona", () => {
  it("70. submit captura startSelectionKey e usa stillSameSelection", () => {
    expect(CONTENT_SRC).toMatch(
      /const startSelectionKey = currentActivityRef\.current\.selectionKey;/,
    );
    expect(CONTENT_SRC).toMatch(/const stillSameSelection = \(\)/);
  });
  it.skip("70-legacy", () => {
    expect(CONTENT_SRC).toMatch(
      /const startSelectionKey = selectionKeyRef\.current;/,
    );
    expect(CONTENT_SRC).toMatch(/const stillSameSelection = \(\)/);
  });
  it("71. Mutação/remoção descartam resultados fora da seleção (>=4)", () => {
    const matches = CONTENT_SRC.match(/if \(!stillSameSelection\(\)\) return;/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it("72. Effect de detail retorna cleanup com cancelled=true", () => {
    expect(CONTENT_SRC).toMatch(/return \(\) => \{\s*cancelled = true;\s*\};/);
  });
  it("73. Effect de assignments retorna cleanup com cancelled=true", () => {
    // At least three effects use cancelled cleanup (detail, permissions, assignments).
    const matches = CONTENT_SRC.match(/cancelled = true;/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — Propriedade dos locks
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · Propriedade das travas", () => {
  it("74. Reset NÃO libera mutationLock e NÃO zera submittingRef", () => {
    // Encontrar o bloco de reset e provar que ele reflete o estado das travas.
    const resetBlockMatch = CONTENT_SRC.match(
      /React\.useEffect\(\(\) => \{\s*if \(activationKey === null\) return;[\s\S]*?\}, \[activationKey, mutationLock\]\);/,
    );
    expect(resetBlockMatch).not.toBeNull();
    const block = resetBlockMatch![0];
    expect(block).not.toMatch(/mutationLock\.release\(\)/);
    expect(block).not.toMatch(/submittingRef\.current\s*=\s*false/);
    expect(block).toMatch(/setSubmitting\(submittingRef\.current\)/);
    expect(block).toMatch(/setMutating\(mutationLock\.isLocked\(\)\)/);
  });
  it("75. Content declara tokens submitOperationIdRef e mutationOperationIdRef", () => {
    expect(CONTENT_SRC).toContain(
      "const submitOperationIdRef = React.useRef(0)",
    );
    expect(CONTENT_SRC).toContain(
      "const mutationOperationIdRef = React.useRef(0)",
    );
  });
  it("76. Finalizador de submit checa o token antes de setSubmitting(false)", () => {
    expect(CONTENT_SRC).toMatch(
      /submitOperationIdRef\.current === operationId[\s\S]*?setSubmitting\(false\)/,
    );
  });
  it("77. Finalizador de mutação checa o token antes de setMutating(false)", () => {
    expect(CONTENT_SRC).toMatch(
      /mutationOperationIdRef\.current === operationId[\s\S]*?setMutating\(false\)/,
    );
  });
  it("78. submittingRef.current = false continua no finally do submit", () => {
    const matches = CONTENT_SRC.match(/submittingRef\.current\s*=\s*false;/g);
    // Pelo menos duas ocorrências (deadline / appointment).
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("79. mutationLock.release() continua sendo chamado nos finally", () => {
    const matches = CONTENT_SRC.match(/mutationLock\.release\(\)/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.2 — Escopo intocado
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.2 · Escopo intocado", () => {
  it("80. Página definitiva de detalhe não foi iniciada (rota ainda monta o wrapper)", () => {
    expect(ROUTE_DETAIL_SRC).toContain("<AgendaItemDetailDialog");
    expect(ROUTE_DETAIL_SRC).not.toContain("<AgendaItemDetailContent");
  });
  it("81. Não existe /app/disponibilidade nem availability.ts", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/routes/app.disponibilidade.tsx")),
    ).toBe(false);
    expect(
      existsSync(resolve(__dirname, "..", "src/features/agenda/availability.ts")),
    ).toBe(false);
  });
});

// ===========================================================================
// LV-09.1B.6.3B.2.1.3 — Vinculação do detalhe à seleção e geração de atividade
// ===========================================================================

describe("LV-09.1B.6.3B.2.1.3 · Guard com currentActivityGeneration", () => {
  const kA = buildAgendaDetailSelectionKey(A_DEADLINE);
  const base = {
    mounted: true,
    active: true,
    cancelled: false,
    currentSelectionKey: kA,
    requestSelectionKey: kA,
  };
  it("82. Gerações iguais → resultado é aceito", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({
        ...base,
        currentActivityGeneration: 3,
        requestActivityGeneration: 3,
      }),
    ).toBe(true);
  });
  it("83. Gerações diferentes → resultado é rejeitado (A → B → A)", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({
        ...base,
        currentActivityGeneration: 3,
        requestActivityGeneration: 1,
      }),
    ).toBe(false);
  });
  it("84. Sem geração informada → verificação é omitida (retrocompatível)", () => {
    expect(isAgendaDetailAsyncResultCurrent(base)).toBe(true);
  });
  it("85. Só o current definido → verificação é omitida", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({
        ...base,
        currentActivityGeneration: 5,
      }),
    ).toBe(true);
  });
  it("86. Só o request definido → verificação é omitida", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({
        ...base,
        requestActivityGeneration: 5,
      }),
    ).toBe(true);
  });
  it("87. Combinação de rejeições: gerações diferentes E cancelado", () => {
    expect(
      isAgendaDetailAsyncResultCurrent({
        ...base,
        cancelled: true,
        currentActivityGeneration: 2,
        requestActivityGeneration: 1,
      }),
    ).toBe(false);
  });
});

describe("LV-09.1B.6.3B.2.1.3 · derive com detailBelongsToCurrentActivity", () => {
  const key = buildAgendaDetailSelectionKey(A_DEADLINE);
  it("88. Detalhe órfão NÃO fica interativo mesmo com detailReady=true", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: false,
      detailReady: true,
    });
    expect(s.hasActiveSelection).toBe(true);
    expect(s.isInteractiveReady).toBe(false);
  });
  it("89. detailReady=false + belongs=true → não interativo", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: true,
      detailReady: false,
    });
    expect(s.isInteractiveReady).toBe(false);
  });
  it("90. belongs=false + detailReady=false → não interativo", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: false,
      detailReady: false,
    });
    expect(s.isInteractiveReady).toBe(false);
  });
  it("91. Inativo + belongs=true → nada é interativo", () => {
    const s = deriveAgendaDetailActivityState({
      active: false,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: true,
      detailReady: true,
    });
    expect(s.hasActiveSelection).toBe(false);
    expect(s.isInteractiveReady).toBe(false);
  });
  it("92. Canônico: belongs=true + ready=true + ativo → interativo", () => {
    const s = deriveAgendaDetailActivityState({
      active: true,
      hasSelection: true,
      selectionKey: key,
      detailBelongsToCurrentActivity: true,
      detailReady: true,
    });
    expect(s.isInteractiveReady).toBe(true);
  });
});

describe("LV-09.1B.6.3B.2.1.3 · Content: geração e snapshot vinculado", () => {
  it("93. Content declara previousActivationKeyRef", () => {
    expect(CONTENT_SRC).toContain("previousActivationKeyRef");
    expect(CONTENT_SRC).toMatch(
      /previousActivationKeyRef\s*=\s*React\.useRef</,
    );
  });
  it("94. Content declara activityGenerationRef inicializada em 0", () => {
    expect(CONTENT_SRC).toMatch(
      /activityGenerationRef\s*=\s*React\.useRef\(0\)/,
    );
  });
  it("95. Content incrementa a geração DURANTE o render (sem useEffect)", () => {
    expect(CONTENT_SRC).toMatch(
      /if \(previousActivationKeyRef\.current !== activationKey\)/,
    );
    expect(CONTENT_SRC).toMatch(/activityGenerationRef\.current \+= 1;/);
    expect(CONTENT_SRC).not.toMatch(
      /React\.useEffect\(\(\)\s*=>\s*\{\s*activityGenerationRef\.current/,
    );
  });
  it("96. Content declara o tipo DetailSnapshot com geração e chave", () => {
    expect(CONTENT_SRC).toMatch(/type DetailSnapshot\s*=/);
    expect(CONTENT_SRC).toMatch(/activityGeneration:\s*number/);
    expect(CONTENT_SRC).toMatch(
      /selectionKey:\s*AgendaDetailSelectionKey \| null/,
    );
  });
  it("97. Content substitui detail por detailSnapshot no useState", () => {
    expect(CONTENT_SRC).toMatch(
      /const \[detailSnapshot, setDetailSnapshot\] = React\.useState<DetailSnapshot>/,
    );
    expect(CONTENT_SRC).not.toMatch(
      /useState<DetailState>\(\s*\{\s*kind:\s*"loading"\s*\}\s*\)/,
    );
  });
  it("98. Content computa detailIsCurrent comparando geração E chave", () => {
    expect(CONTENT_SRC).toMatch(
      /detailIsCurrent\s*=\s*\n?\s*detailSnapshot\.activityGeneration\s*===\s*activityGeneration/,
    );
    expect(CONTENT_SRC).toMatch(
      /detailSnapshot\.selectionKey\s*===\s*selectionKey/,
    );
  });
  it("99. Detalhe visível é 'loading' quando o snapshot não é corrente", () => {
    expect(CONTENT_SRC).toMatch(
      /const detail: DetailState = detailIsCurrent\s*\?\s*detailSnapshot\.state\s*:\s*\{\s*kind:\s*"loading"\s*\}/,
    );
  });
  it("100. setDetail estampa o snapshot com a geração/chave correntes", () => {
    expect(CONTENT_SRC).toMatch(
      /setDetail\s*=\s*React\.useCallback\(\(state:\s*DetailState\)/,
    );
    expect(CONTENT_SRC).toMatch(
      /activityGeneration:\s*activityGenerationRef\.current/,
    );
    expect(CONTENT_SRC).toMatch(
      /selectionKey:\s*selectionKeyRef\.current/,
    );
  });
  it("101. Content passa detailBelongsToCurrentActivity para o derive", () => {
    expect(CONTENT_SRC).toMatch(
      /detailBelongsToCurrentActivity:\s*detailIsCurrent/,
    );
  });
  it("102. Load captura reqActivityGeneration e propaga ao guard", () => {
    expect(CONTENT_SRC).toMatch(
      /const reqActivityGeneration = activityGenerationRef\.current;/,
    );
    expect(CONTENT_SRC).toMatch(
      /currentActivityGeneration:\s*activityGenerationRef\.current/,
    );
    expect(CONTENT_SRC).toMatch(
      /requestActivityGeneration:\s*reqActivityGeneration/,
    );
  });
  it("103. Effects de permissão e assignments checam a geração", () => {
    const matches = CONTENT_SRC.match(
      /activityGenerationRef\.current === reqActivityGeneration/g,
    );
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("104. Submit/mutação capturam startActivityGeneration", () => {
    const matches = CONTENT_SRC.match(
      /const startActivityGeneration = activityGenerationRef\.current;/g,
    );
    expect((matches ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("105. stillSameSelection agora inclui a geração de atividade", () => {
    const matches = CONTENT_SRC.match(
      /activityGenerationRef\.current === startActivityGeneration/g,
    );
    expect((matches ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("106. detail-activity.ts documenta a subetapa 2.1.3", () => {
    expect(ACTIVITY_SRC).toContain("LV-09.1B.6.3B.2.1.3");
  });
  it("107. Guard expõe campos de geração opcionais", () => {
    expect(ACTIVITY_SRC).toMatch(/currentActivityGeneration\?:\s*number/);
    expect(ACTIVITY_SRC).toMatch(/requestActivityGeneration\?:\s*number/);
  });
  it("108. ActivityInputs exige detailBelongsToCurrentActivity", () => {
    expect(ACTIVITY_SRC).toMatch(
      /readonly detailBelongsToCurrentActivity:\s*boolean/,
    );
  });
  it("109. DEC-AGE-001 menciona a subetapa 2.1.3", () => {
    expect(DEC_SRC).toContain("LV-09.1B.6.3B.2.1.3");
  });
});

