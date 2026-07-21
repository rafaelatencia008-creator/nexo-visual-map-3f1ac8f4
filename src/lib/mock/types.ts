/**
 * Tipos do domínio pericial — Nexo Pericial 360
 *
 * Definições de contrato para dados mockados usados apenas pela camada visual.
 * Nenhum destes tipos está acoplado a backend, banco ou API.
 */

export type TipoPessoa = "PF" | "PJ";

export type StatusPericia =
  | "agendada"
  | "em_andamento"
  | "laudo_pendente"
  | "concluida"
  | "cancelada";

export type StatusProcesso = "ativo" | "suspenso" | "arquivado";

export type TipoPericia =
  | "engenharia_civil"
  | "grafotecnica"
  | "contabil"
  | "medica"
  | "ambiental"
  | "trabalhista";

export interface Perito {
  id: string;
  nome: string;
  especialidade: TipoPericia;
  registroProfissional: string; // CREA, CRC, CRM, etc.
  email: string;
  telefone: string; // dígitos apenas
  fotoUrl?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  tipoPessoa: TipoPessoa;
  documento: string; // dígitos apenas (CPF ou CNPJ)
  email: string;
  telefone: string;
}

export interface Processo {
  id: string;
  numero: string; // padrão CNJ
  comarca: string;
  vara: string;
  clienteId: string;
  status: StatusProcesso;
  criadoEm: string; // ISO
}

export interface Pericia {
  id: string;
  processoId: string;
  peritoId: string;
  tipo: TipoPericia;
  dataAgendada: string; // ISO
  status: StatusPericia;
  honorarios: number; // BRL
  observacoes?: string;
}
