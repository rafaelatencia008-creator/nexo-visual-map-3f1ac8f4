import type {
  CopilotActionKind,
  CopilotAuditEventType,
  CopilotIntent,
  CopilotSourceType,
} from "./copilot-types";

export const SOURCE_TYPE_LABEL: Record<CopilotSourceType, string> = {
  processo: "Processo",
  pericia: "Perícia",
  documento: "Documento",
  entrevista: "Entrevista",
  diligencia: "Diligência",
  quesito: "Quesito",
  evidencia: "Evidência",
  pendencia: "Pendência",
  agenda: "Agenda",
};

export const INTENT_LABEL: Record<CopilotIntent, string> = {
  resumo_contexto: "Resumir contexto atual",
  listar_pendencias: "Listar pendências",
  identificar_prazos: "Identificar prazos",
  localizar_documentos: "Localizar documentos",
  resumir_documentos: "Resumir documentos disponíveis",
  sugerir_perguntas_entrevista: "Sugerir perguntas de entrevista",
  preparar_roteiro_entrevista: "Preparar roteiro de entrevista",
  preparar_checklist_diligencia: "Preparar checklist de diligência",
  localizar_evidencias: "Localizar evidências",
  identificar_lacunas: "Identificar lacunas",
  identificar_divergencias: "Identificar divergências",
  rascunhar_resposta_quesito: "Rascunhar resposta de quesito",
  explicar_cobertura_quesito: "Explicar cobertura de quesito",
  preparar_para_laudo: "Preparar conteúdo para laudo",
  explicar_situacao_processo: "Explicar situação de processo",
  sugerir_proximos_passos: "Sugerir próximos passos",
  abrir_modulo: "Abrir módulo relacionado",
  ajuda_sistema: "Ajuda sobre o sistema",
  recusar_acao: "Ação recusada",
  desconhecido: "Solicitação não interpretada",
};

export const ACTION_KIND_LABEL: Record<CopilotActionKind, string> = {
  add_interview_note: "Adicionar nota à entrevista",
  add_diligence_pending: "Adicionar pendência à diligência",
  create_question_gap: "Registrar lacuna no quesito",
  save_question_draft: "Salvar rascunho de resposta",
  mark_question_in_analysis: "Marcar quesito em análise",
  prepare_question_for_report: "Preparar quesito para o laudo",
  copy_text: "Copiar conteúdo",
  open_source: "Abrir fonte",
};

export const AUDIT_EVENT_LABEL: Record<CopilotAuditEventType, string> = {
  conversation_created: "Conversa criada",
  message_sent: "Pergunta enviada",
  response_produced: "Resposta produzida",
  response_cancelled: "Resposta cancelada",
  response_failed: "Resposta falhou",
  suggestion_created: "Sugestão criada",
  confirmation_opened: "Confirmação aberta",
  suggestion_confirmed: "Sugestão confirmada",
  suggestion_rejected: "Sugestão rejeitada",
  action_applied: "Ação aplicada",
  action_failed: "Ação falhou",
  action_stale: "Ação ficou desatualizada",
  text_copied: "Texto copiado",
  source_opened: "Fonte aberta",
  conversation_archived: "Conversa arquivada",
  conversation_cleared: "Conversa limpa",
  feedback_given: "Feedback registrado",
};

export const DEFAULT_ACTOR_LABEL = "Dra. Ana Beatriz Salgado";

export const SIMULATION_BANNER = "Simulação local";
export const SIMULATION_DESCRIPTION =
  "Nenhuma IA real está ativa nesta etapa.";
export const EPHEMERAL_WARNING =
  "As conversas deste copiloto são temporárias e não serão preservadas após recarregar a página.";
export const REFUSAL_MESSAGE =
  "Esta ação não está disponível nesta etapa ou exige revisão e execução direta pelo profissional responsável.";
export const UNKNOWN_INTENT_MESSAGE =
  "Ainda não consigo interpretar esse pedido nesta demonstração. Escolha uma pergunta da biblioteca ou reformule usando o contexto atual.";
export const INSUFFICIENT_DATA_MESSAGE =
  "Não encontrei dados suficientes no contexto atual para responder com segurança.";
export const DRAFT_DISCLAIMER =
  "Rascunho demonstrativo produzido por regras locais. Revise todo o conteúdo antes de utilizar.";
export const STALE_MESSAGE =
  "Os dados foram alterados desde que a sugestão foi criada. Revise a sugestão novamente.";
