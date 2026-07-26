/**
 * LV-18.4 — Mapeamento de códigos de erro do domínio para mensagens
 * amigáveis em português. A UI nunca deve exibir stack, JSON bruto ou
 * detalhes sensíveis. Códigos desconhecidos caem em uma mensagem genérica.
 */

import { ReportTemplateError, type ReportTemplateErrorCode } from "./report-template-types";

const MESSAGES: Readonly<Record<ReportTemplateErrorCode, string>> = {
  template_not_found: "Modelo não encontrado.",
  template_archived: "Modelo arquivado — reative para editar.",
  template_published: "Modelo publicado — retorne para rascunho antes de editar.",
  template_invalid: "Modelo inválido para esta operação.",
  section_not_found: "Seção não encontrada.",
  block_not_found: "Bloco não encontrado.",
  variable_not_found: "Variável não encontrada.",
  duplicate_id: "Conflito de identificador.",
  duplicate_variable_key: "Já existe uma variável com essa chave.",
  empty_name: "Informe um nome válido.",
  empty_variable_key: "Chave de variável inválida — use letras minúsculas, dígitos e '_'.",
  invalid_position: "Posição inválida.",
  variable_in_use: "Variável em uso por blocos deste modelo.",
  invalid_transition: "Transição de status não permitida.",
  version_not_found: "Versão não encontrada.",
  version_reason_required: "Informe um motivo para criar a versão.",
  invalid_variable_reference: "Referência de variável inexistente no modelo.",
  validation_failed: "Modelo com erros de validação — corrija antes de publicar.",
  operation_not_allowed: "Operação não permitida.",
  history_append_failed: "Não foi possível registrar o histórico.",
  import_json_invalid: "O arquivo não é um JSON válido.",
  import_format_invalid: "Formato do arquivo não é reconhecido.",
  import_schema_version_unsupported: "Versão de esquema não suportada.",
  import_payload_too_large: "Arquivo excede o tamanho máximo permitido.",
  import_limit_exceeded: "Limite de elementos excedido.",
  import_template_invalid: "Estrutura do modelo importado é inválida.",
  import_dangerous_key: "Arquivo contém chaves perigosas e foi rejeitado.",
  import_duplicate_id: "IDs duplicados dentro do arquivo.",
  import_duplicate_variable_key: "Chaves de variável duplicadas dentro de um modelo.",
  import_invalid_variable_reference: "Referência de variável inexistente no arquivo.",
  import_conflict: "Conflito com IDs já presentes na base.",
  import_empty: "Nenhum modelo encontrado no arquivo.",
  export_failed: "Falha ao exportar o modelo.",
  serialization_failed: "Falha ao serializar o modelo.",
};

export function friendlyReportTemplateError(err: unknown): string {
  if (err instanceof ReportTemplateError) {
    return MESSAGES[err.code] ?? "Ocorreu um erro ao processar o modelo.";
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}

export function reportTemplateErrorCode(err: unknown): ReportTemplateErrorCode | null {
  return err instanceof ReportTemplateError ? err.code : null;
}
