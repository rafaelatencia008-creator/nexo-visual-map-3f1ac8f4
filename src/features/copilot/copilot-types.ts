/**
 * LV-13 — Contratos do Copiloto Nexo (mock).
 *
 * Todos imutáveis. Nenhum acesso a rede, IA ou persistência.
 */

export type CopilotSourceType =
  | "processo"
  | "pericia"
  | "documento"
  | "entrevista"
  | "diligencia"
  | "quesito"
  | "evidencia"
  | "pendencia"
  | "agenda";

export type CopilotIntent =
  | "resumo_contexto"
  | "listar_pendencias"
  | "identificar_prazos"
  | "localizar_documentos"
  | "resumir_documentos"
  | "sugerir_perguntas_entrevista"
  | "preparar_roteiro_entrevista"
  | "preparar_checklist_diligencia"
  | "localizar_evidencias"
  | "identificar_lacunas"
  | "identificar_divergencias"
  | "rascunhar_resposta_quesito"
  | "explicar_cobertura_quesito"
  | "preparar_para_laudo"
  | "explicar_situacao_processo"
  | "sugerir_proximos_passos"
  | "abrir_modulo"
  | "ajuda_sistema"
  | "recusar_acao"
  | "desconhecido";

export type CopilotActionKind =
  | "add_interview_note"
  | "add_diligence_pending"
  | "create_question_gap"
  | "save_question_draft"
  | "mark_question_in_analysis"
  | "prepare_question_for_report"
  | "copy_text"
  | "open_source";

export type CopilotProcessingState =
  | "idle"
  | "thinking"
  | "completed"
  | "failed"
  | "cancelled";

export type CopilotActionStatus =
  | "proposed"
  | "awaiting_confirmation"
  | "applied"
  | "rejected"
  | "failed"
  | "stale";

export type CopilotRisk = "low" | "medium" | "high";

export type CopilotMessageStatus = "pending" | "completed" | "failed";

export type CopilotReference = Readonly<{
  id: string;
  sourceType: CopilotSourceType;
  sourceId: string;
  parentId?: string;
  label: string;
  excerpt?: string;
  route?: string;
  sourceUpdatedAt?: string;
}>;

export type CopilotProposedAction = Readonly<{
  id: string;
  kind: CopilotActionKind;
  label: string;
  description: string;
  targetType: string;
  targetId?: string;
  payload: Readonly<Record<string, unknown>>;
  risk: CopilotRisk;
  status: CopilotActionStatus;
  sourceFingerprint?: string;
  reason?: string;
}>;

export type CopilotFeedback = Readonly<{
  helpful: boolean;
  reason?: string;
  createdAt: string;
}>;

export type CopilotMessage = Readonly<{
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  status: CopilotMessageStatus;
  intent?: CopilotIntent;
  references: readonly CopilotReference[];
  proposedActions: readonly CopilotProposedAction[];
  createdAt: string;
  feedback?: CopilotFeedback;
}>;

export type CopilotThread = Readonly<{
  id: string;
  title: string;
  status: "active" | "archived";
  messages: readonly CopilotMessage[];
  createdAt: string;
  updatedAt: string;
}>;

export type CopilotAuditEventType =
  | "conversation_created"
  | "message_sent"
  | "response_produced"
  | "response_cancelled"
  | "response_failed"
  | "suggestion_created"
  | "confirmation_opened"
  | "suggestion_confirmed"
  | "suggestion_rejected"
  | "action_applied"
  | "action_failed"
  | "action_stale"
  | "text_copied"
  | "source_opened"
  | "conversation_archived"
  | "conversation_cleared"
  | "feedback_given";

export type CopilotAuditEvent = Readonly<{
  id: string;
  threadId: string;
  messageId?: string;
  actionId?: string;
  eventType: CopilotAuditEventType;
  actorLabel: string;
  summary: string;
  outcome?: string;
  createdAt: string;
}>;

export type CopilotSourceRecord = Readonly<{
  sourceType: CopilotSourceType;
  id: string;
  parentId?: string;
  label: string;
  searchableText: string;
  excerpt?: string;
  route?: string;
  updatedAt?: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CopilotRouteContext = Readonly<{
  route: string;
  moduleLabel: string;
  moduleKey: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CopilotEngineInput = Readonly<{
  text: string;
  context: CopilotRouteContext;
  availableSources: readonly CopilotSourceRecord[];
  threadHistory: readonly CopilotMessage[];
}>;

export type CopilotEngineOutput = Readonly<{
  intent: CopilotIntent;
  responseText: string;
  references: readonly CopilotReference[];
  suggestedPrompts: readonly string[];
  proposedActions: readonly CopilotProposedAction[];
}>;
