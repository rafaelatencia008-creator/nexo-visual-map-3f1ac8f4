/**
 * Aplicação de ações confirmadas — integra com stores públicos existentes.
 * Retorna o resultado sem alterar dados quando o fingerprint estiver defasado.
 */
import type { CopilotProposedAction, CopilotSourceRecord } from "./copilot-types";
import {
  addInterviewNote,
  getInterviewRecord,
} from "@/features/interviews/interview-mock-store";
import {
  addGapItem,
  changeStatus,
  getQuestion,
  markReadyForReport,
  updateAnswer,
} from "@/features/questions-evidence/question-mock-store";
import { computeFingerprint } from "./copilot-action-adapters";

export type ApplyOutcome =
  | { ok: true; summary: string }
  | { ok: false; reason: "stale" | "no_api" | "invalid" | "failed"; summary: string };

export function applyAction(
  action: CopilotProposedAction,
  currentSources: readonly CopilotSourceRecord[],
): ApplyOutcome {
  const target = currentSources.find(
    (s) => s.sourceType === (action.targetType as CopilotSourceRecord["sourceType"]) &&
      s.id === action.targetId,
  );
  if (!target) {
    return { ok: false, reason: "invalid", summary: "Registro não encontrado." };
  }
  if (action.sourceFingerprint && computeFingerprint(target) !== action.sourceFingerprint) {
    return { ok: false, reason: "stale", summary: "Registro foi alterado desde a sugestão." };
  }

  try {
    switch (action.kind) {
      case "add_interview_note": {
        const rec = getInterviewRecord(action.targetId ?? "");
        if (!rec || rec.kind !== "entrevista") {
          return { ok: false, reason: "invalid", summary: "Entrevista não encontrada." };
        }
        const p = action.payload as { text?: string; kind?: string };
        addInterviewNote(rec.id, {
          text: String(p.text ?? "Nota criada pelo copiloto."),
          kind: (p.kind as "observacao") ?? "observacao",
        });
        return { ok: true, summary: `Nota adicionada em ${rec.title}.` };
      }
      case "create_question_gap": {
        const q = getQuestion(action.targetId ?? "");
        if (!q) return { ok: false, reason: "invalid", summary: "Quesito não encontrado." };
        const p = action.payload as { text?: string };
        addGapItem(q.id, {
          kind: "documento_ausente",
          priority: "normal",
          description: String(p.text ?? "Lacuna sugerida pelo copiloto."),
        });
        return { ok: true, summary: `Lacuna registrada em ${q.text.slice(0, 40)}.` };
      }
      case "save_question_draft": {
        const q = getQuestion(action.targetId ?? "");
        if (!q) return { ok: false, reason: "invalid", summary: "Quesito não encontrado." };
        const p = action.payload as { draft?: string };
        updateAnswer(q.id, { technicalAnswer: String(p.draft ?? "") });
        return { ok: true, summary: `Rascunho salvo em ${q.text.slice(0, 40)}.` };
      }
      case "mark_question_in_analysis": {
        const q = getQuestion(action.targetId ?? "");
        if (!q) return { ok: false, reason: "invalid", summary: "Quesito não encontrado." };
        const res = changeStatus(q.id, "em_analise");
        if (!res.ok) return { ok: false, reason: "failed", summary: res.reason };
        return { ok: true, summary: `Quesito marcado como em análise.` };
      }
      case "prepare_question_for_report": {
        const q = getQuestion(action.targetId ?? "");
        if (!q) return { ok: false, reason: "invalid", summary: "Quesito não encontrado." };
        const res = markReadyForReport(q.id);
        if (!res.ok) return { ok: false, reason: "failed", summary: res.reason ?? "Falha ao preparar." };
        return { ok: true, summary: `Quesito preparado para o laudo.` };
      }
      case "add_diligence_pending": {
        // API pública atual não expõe adição isolada de pendência; recusa segura.
        return {
          ok: false,
          reason: "no_api",
          summary: "Aplicação automática indisponível — utilize o módulo Entrevistas.",
        };
      }
      case "copy_text":
      case "open_source":
        return { ok: true, summary: "Ação sem alteração de dados." };
      default:
        return { ok: false, reason: "invalid", summary: "Tipo de ação desconhecido." };
    }
  } catch (err) {
    return {
      ok: false,
      reason: "failed",
      summary: err instanceof Error ? err.message : "Falha ao aplicar.",
    };
  }
}
