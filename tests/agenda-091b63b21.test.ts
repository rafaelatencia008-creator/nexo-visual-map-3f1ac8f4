/**
 * LV-09.1B.6.3B.2.1 — Extração funcional do detalhe para
 * `AgendaItemDetailContent`.
 *
 * Estas provas garantem que:
 *  - a **única** implementação funcional do fluxo de detalhe vive em
 *    `AgendaItemDetailContent.tsx`;
 *  - `AgendaItemDetailDialog.tsx` é um wrapper fino que apenas monta o
 *    Content dentro de um `<Dialog>` e delega o pedido de fechamento;
 *  - a API pública histórica (`AgendaItemDetailDialog`, tipos exportados)
 *    permanece disponível;
 *  - o Content não conhece a camada de roteamento (sem `useNavigate`,
 *    sem TanStack Router);
 *  - a rota canônica `/app/agenda/$appointmentId` continua montando o
 *    wrapper temporariamente (conversão total do detalhe para página é
 *    tarefa da LV-09.1B.6.3B.2.2);
 *  - nenhum contrato de domínio, serviço, mock ou seed foi alterado.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CONTENT_PATH = "src/features/agenda/AgendaItemDetailContent.tsx";
const DIALOG_PATH = "src/features/agenda/AgendaItemDetailDialog.tsx";
const ROUTE_DETAIL_PATH = "src/routes/app.agenda.$appointmentId.tsx";
const ROUTE_INDEX_PATH = "src/routes/app.agenda.index.tsx";
const DEC_PATH = "docs/decisions/DEC-AGE-001-rotas-canonicas.md";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const CONTENT_SRC = read(CONTENT_PATH);
const DIALOG_SRC = read(DIALOG_PATH);
const ROUTE_DETAIL_SRC = read(ROUTE_DETAIL_PATH);
const ROUTE_INDEX_SRC = read(ROUTE_INDEX_PATH);
const DEC_SRC = read(DEC_PATH);

// ---------------------------------------------------------------------------
// 1) Existência e forma dos arquivos
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Existência e forma dos arquivos", () => {
  it("1. AgendaItemDetailContent.tsx existe", () => {
    expect(
      existsSync(resolve(__dirname, "..", CONTENT_PATH)),
    ).toBe(true);
  });

  it("2. AgendaItemDetailDialog.tsx continua existindo", () => {
    expect(
      existsSync(resolve(__dirname, "..", DIALOG_PATH)),
    ).toBe(true);
  });

  it("3. Content declara a etapa LV-09.1B.6.3B.2.1 no cabeçalho", () => {
    expect(CONTENT_SRC).toMatch(/LV-09\.1B\.6\.3B\.2\.1/);
  });

  it("4. Wrapper declara a etapa LV-09.1B.6.3B.2.1 no cabeçalho", () => {
    expect(DIALOG_SRC).toMatch(/LV-09\.1B\.6\.3B\.2\.1/);
  });
});

// ---------------------------------------------------------------------------
// 2) Wrapper é fino: só monta Dialog, delega ao Content
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Wrapper fino", () => {
  it("5. Wrapper importa AgendaItemDetailContent", () => {
    expect(DIALOG_SRC).toContain("AgendaItemDetailContent");
    expect(DIALOG_SRC).toMatch(
      /from\s+"\.\/AgendaItemDetailContent"/,
    );
  });

  it("6. Wrapper monta <Dialog> e <DialogContent>", () => {
    expect(DIALOG_SRC).toContain("<Dialog ");
    expect(DIALOG_SRC).toContain("<DialogContent");
  });

  it("7. Wrapper renderiza <AgendaItemDetailContent", () => {
    expect(DIALOG_SRC).toContain("<AgendaItemDetailContent");
  });

  it("8. Wrapper passa surface=\"dialog\" ao Content", () => {
    expect(DIALOG_SRC).toContain('surface="dialog"');
  });

  it("9. Wrapper deriva active de selected !== null", () => {
    expect(DIALOG_SRC).toMatch(/selected\s*!==\s*null/);
    expect(DIALOG_SRC).toMatch(/active=\{open\}/);
  });

  it("10. Wrapper usa React.useRef<AgendaItemDetailContentHandle", () => {
    expect(DIALOG_SRC).toMatch(
      /React\.useRef<AgendaItemDetailContentHandle/,
    );
  });

  it("11. Wrapper delega o fechamento ao handle do Content", () => {
    expect(DIALOG_SRC).toMatch(/contentRef\.current/);
    expect(DIALOG_SRC).toMatch(/\.requestClose\(\)/);
  });

  it("12. Wrapper NÃO importa serviços de domínio diretamente", () => {
    // Wrapper só carrega tipos — nenhuma chamada de método de serviço.
    expect(DIALOG_SRC).not.toMatch(/environment\.services\./);
  });

  it("13. Wrapper NÃO contém formulários nem lógica de submit", () => {
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
    expect(DIALOG_SRC).toMatch(
      /export function AgendaItemDetailDialog/,
    );
  });

  it("18. Wrapper reexporta os tipos históricos", () => {
    expect(DIALOG_SRC).toMatch(/SelectedAgendaItem/);
    expect(DIALOG_SRC).toMatch(/AgendaItemUpdated/);
    expect(DIALOG_SRC).toMatch(/AgendaItemDeleted/);
  });

  it("19. Wrapper expõe interface AgendaItemDetailDialogProps", () => {
    expect(DIALOG_SRC).toMatch(
      /export interface AgendaItemDetailDialogProps/,
    );
  });

  it("20. Wrapper é curto (menos de 200 linhas)", () => {
    const lines = DIALOG_SRC.split("\n").length;
    expect(lines).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// 3) Content concentra a implementação
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Content concentra a lógica", () => {
  it("21. Content exporta AgendaItemDetailContent como forwardRef", () => {
    expect(CONTENT_SRC).toMatch(
      /export const AgendaItemDetailContent\s*=\s*React\.forwardRef/,
    );
  });

  it("22. Content expõe handle imperativo AgendaItemDetailContentHandle", () => {
    expect(CONTENT_SRC).toMatch(
      /export interface AgendaItemDetailContentHandle/,
    );
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
// 4) `active` desativa efeitos e mutações
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · Comportamento com active=false", () => {
  it("38. Efeitos guardam !active || !selected para não carregar", () => {
    const matches = CONTENT_SRC.match(/if \(!active \|\| !selected\) return;/g);
    expect(matches).not.toBeNull();
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("39. O carregamento de assignments respeita active", () => {
    expect(CONTENT_SRC).toMatch(
      /if \(!active \|\| mode !== "edit"/,
    );
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
// 6) Documento de decisão
// ---------------------------------------------------------------------------

describe("LV-09.1B.6.3B.2.1 · DEC-AGE-001 reflete o progresso", () => {
  it("42. DEC menciona a extração de AgendaItemDetailContent (LV-09.1B.6.3B.2.1)", () => {
    expect(DEC_SRC).toContain("AgendaItemDetailContent");
    expect(DEC_SRC).toContain("LV-09.1B.6.3B.2.1");
  });
});

// ---------------------------------------------------------------------------
// 7) LV-09.1B.6.3B.2.1.1 — Ciclo de atividade e invalidação assíncrona
// ---------------------------------------------------------------------------

const ACTIVITY_PATH = "src/features/agenda/detail-activity.ts";
const ACTIVITY_SRC = read(ACTIVITY_PATH);

describe("LV-09.1B.6.3B.2.1.1 · Identidade semântica estável", () => {
  it("43. detail-activity.ts existe", () => {
    expect(
      existsSync(resolve(__dirname, "..", ACTIVITY_PATH)),
    ).toBe(true);
  });

  it("44. Exporta buildAgendaDetailSelectionKey", () => {
    expect(ACTIVITY_SRC).toMatch(
      /export function buildAgendaDetailSelectionKey/,
    );
  });

  it("45. Chave concatena type, caseId e id em ordem", () => {
    expect(ACTIVITY_SRC).toContain(
      "`${selected.type}:${String(selected.caseId)}:${String(selected.id)}`",
    );
  });

  it("46. Retorna null quando selected é null", () => {
    expect(ACTIVITY_SRC).toMatch(/if \(!selected\) return null;/);
  });

  it("47. Não importa nada de React nem TanStack Router", () => {
    expect(ACTIVITY_SRC).not.toMatch(/from\s+"react"/);
    expect(ACTIVITY_SRC).not.toMatch(/@tanstack\/react-router/);
  });

  it("48. Content importa buildAgendaDetailSelectionKey", () => {
    expect(CONTENT_SRC).toContain("buildAgendaDetailSelectionKey");
    expect(CONTENT_SRC).toMatch(
      /from\s+"\.\/detail-activity"/,
    );
  });

  it("49. Content computa selectionKey via useMemo dependente de selected", () => {
    expect(CONTENT_SRC).toMatch(
      /const selectionKey = React\.useMemo\(\s*\(\)\s*=>\s*buildAgendaDetailSelectionKey\(selected\)/,
    );
  });
});

describe("LV-09.1B.6.3B.2.1.1 · Snapshots síncronos", () => {
  it("50. Content declara activeRef e sincroniza via useEffect", () => {
    expect(CONTENT_SRC).toContain("activeRef = React.useRef(active)");
    expect(CONTENT_SRC).toMatch(/activeRef\.current\s*=\s*active;/);
  });

  it("51. Content declara selectionKeyRef e sincroniza via useEffect", () => {
    expect(CONTENT_SRC).toMatch(
      /selectionKeyRef\s*=\s*React\.useRef<AgendaDetailSelectionKey \| null>/,
    );
    expect(CONTENT_SRC).toMatch(
      /selectionKeyRef\.current\s*=\s*selectionKey;/,
    );
  });
});

describe("LV-09.1B.6.3B.2.1.1 · Efeitos chaveados por selectionKey", () => {
  it("52. Efeito de reset depende de selectionKey e active", () => {
    expect(CONTENT_SRC).toMatch(/}, \[selectionKey, active\]\);/);
  });

  it("53. Efeito de load depende de selectionKey", () => {
    expect(CONTENT_SRC).toMatch(
      /}, \[selectionKey, active, environment, context, reload\]\);/,
    );
  });

  it("54. Efeito de permissões depende de selectionKey", () => {
    expect(CONTENT_SRC).toMatch(
      /}, \[selectionKey, active, detail, environment, context, permAttempt\]\);/,
    );
  });

  it("55. Efeito de assignments depende de selectionKey e active", () => {
    expect(CONTENT_SRC).toMatch(
      /}, \[active, mode, currentCaseId, selectionKey, environment, context, assignAttempt\]\);/,
    );
  });
});

describe("LV-09.1B.6.3B.2.1.1 · Invalidação assíncrona", () => {
  it("56. Load compara reqSelectionKey com selectionKeyRef antes de aplicar", () => {
    expect(CONTENT_SRC).toMatch(/const reqSelectionKey = selectionKey;/);
    expect(CONTENT_SRC).toMatch(
      /selectionKeyRef\.current === reqSelectionKey/,
    );
  });

  it("57. Load usa activeRef.current no gate de aplicação", () => {
    expect(CONTENT_SRC).toMatch(/activeRef\.current/);
  });

  it("58. Efeitos definem stillCurrent como função local", () => {
    const matches = CONTENT_SRC.match(/const stillCurrent = \(\)/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe("LV-09.1B.6.3B.2.1.1 · isInteractive e gates", () => {
  it("59. Content declara isInteractive combinando active, selected e detail.ready", () => {
    expect(CONTENT_SRC).toMatch(
      /isInteractive\s*=\s*\n?\s*active && selected !== null && detail\.kind === "ready"/,
    );
  });

  it("60. lockDecisions é gateado por isInteractive fechando gates funcionais", () => {
    expect(CONTENT_SRC).toMatch(/const lockDecisions = isInteractive/);
    expect(CONTENT_SRC).toMatch(/canEnterEdit: false/);
    expect(CONTENT_SRC).toMatch(/canOpenConfirmation: false/);
    expect(CONTENT_SRC).toMatch(/canRetryPermissions: false/);
  });

  it("60b. rawLockDecisions preserva a decisão original do lock", () => {
    expect(CONTENT_SRC).toContain(
      "const rawLockDecisions = getMutationLockDecisions()",
    );
  });
});


describe("LV-09.1B.6.3B.2.1.1 · Mutações assíncronas protegidas", () => {
  it("61. submit captura startSelectionKey e usa stillSameSelection", () => {
    expect(CONTENT_SRC).toMatch(/const startSelectionKey = selectionKeyRef\.current;/);
    expect(CONTENT_SRC).toMatch(/const stillSameSelection = \(\)/);
  });

  it("62. Mutação de status/exclusão descarta resultados fora da seleção", () => {
    const matches = CONTENT_SRC.match(/if \(!stillSameSelection\(\)\) return;/g);
    expect((matches ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("63. confirmRemoval verifica activeRef.current antes de mutar", () => {
    expect(CONTENT_SRC).toMatch(
      /if \(!activeRef\.current\) return;\s*\n\s*if \(!mutationLock\.tryAcquire/,
    );
  });
});

describe("LV-09.1B.6.3B.2.1.1 · DEC-AGE-001 menciona a subetapa", () => {
  it("64. DEC menciona LV-09.1B.6.3B.2.1.1", () => {
    expect(DEC_SRC).toContain("LV-09.1B.6.3B.2.1.1");
  });
});

