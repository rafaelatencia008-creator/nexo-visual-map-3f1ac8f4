import {
  LayoutDashboard,
  ClipboardList,
  Gavel,
  Users,
  Calendar,
  UserCog,
  AlertCircle,
  FolderOpen,
  Mic,
  ListChecks,
  FileText,
  Layout,
  Users2,
  FileBarChart,
  Wallet,
  Settings,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Módulo em construção (usa página compartilhada) */
  construction?: boolean;
  /** Descrição curta para busca global */
  description?: string;
};

export type AppNavGroup = {
  title: string;
  items: AppNavItem[];
};

export const APP_NAV: AppNavGroup[] = [
  {
    title: "Principal",
    items: [
      { label: "Início", to: "/app", icon: LayoutDashboard, description: "Painel geral" },
      { label: "Processos", to: "/app/processos", icon: Gavel, description: "Autos judiciais" },
      { label: "Perícias", to: "/app/pericias", icon: ClipboardList, description: "Perícias em curso" },
      { label: "Clientes", to: "/app/clientes", icon: Users, description: "Carteira de clientes" },
      { label: "Agenda", to: "/app/agenda", icon: Calendar, description: "Compromissos" },
      { label: "Peritos", to: "/app/peritos", icon: UserCog, description: "Equipe pericial" },
      { label: "Pendências", to: "/app/pendencias", icon: AlertCircle, description: "Central de pendências" },
    ],
  },
  {
    title: "Trabalho pericial",
    items: [
      { label: "Documentos", to: "/app/documentos", icon: FolderOpen, construction: true, description: "Arquivos do caso" },
      { label: "Entrevistas e diligências", to: "/app/entrevistas", icon: Mic, construction: true, description: "Registros de campo" },
      { label: "Quesitos e evidências", to: "/app/quesitos", icon: ListChecks, construction: true, description: "Perguntas e provas" },
      { label: "Laudos", to: "/app/laudos", icon: FileText, construction: true, description: "Peças técnicas" },
      { label: "Modelos", to: "/app/modelos", icon: Layout, construction: true, description: "Templates de laudo" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Equipe", to: "/app/equipe", icon: Users2, construction: true, description: "Time e permissões" },
      { label: "Relatórios", to: "/app/relatorios", icon: FileBarChart, construction: true, description: "Indicadores" },
      { label: "Financeiro", to: "/app/financeiro", icon: Wallet, construction: true, description: "Honorários" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Configurações", to: "/app/configuracoes", icon: Settings, construction: true, description: "Preferências do sistema" },
      { label: "Ajuda", to: "/app/ajuda", icon: HelpCircle, construction: true, description: "Suporte e documentação" },
    ],
  },
];

export const ALL_NAV_ITEMS: AppNavItem[] = APP_NAV.flatMap((g) => g.items);

export const CONSTRUCTION_MODULES: Record<
  string,
  { title: string; purpose: string; features: string[] }
> = {
  "/app/documentos": {
    title: "Documentos",
    purpose:
      "Organizar, versionar e vincular arquivos aos processos, perícias e partes envolvidas.",
    features: [
      "Upload manual e por lote",
      "Versionamento com histórico",
      "Vinculação a processo, perícia e pessoa",
      "Marcação de sigilo e prazo",
    ],
  },
  "/app/entrevistas": {
    title: "Entrevistas e diligências",
    purpose:
      "Registrar entrevistas, vistorias e diligências com roteiros, anotações e mídias.",
    features: [
      "Roteiros pré-definidos",
      "Notas e transcrição manual",
      "Localização e registro fotográfico",
      "Relatório resumido por diligência",
    ],
  },
  "/app/quesitos": {
    title: "Quesitos e evidências",
    purpose:
      "Consolidar quesitos das partes e o juízo com as evidências que os respondem.",
    features: [
      "Cadastro de quesitos por origem",
      "Rastreabilidade quesito → evidência",
      "Marcação de quesitos respondidos",
      "Exportação para o laudo",
    ],
  },
  "/app/laudos": {
    title: "Laudos",
    purpose:
      "Redigir, revisar e concluir laudos técnicos a partir das evidências coletadas.",
    features: [
      "Rascunho estruturado por seções",
      "Sugestões de IA sob revisão humana",
      "Revisão em pares",
      "Assinatura e protocolo",
    ],
  },
  "/app/modelos": {
    title: "Modelos",
    purpose:
      "Manter modelos de laudo, quesitos e petições por área de atuação.",
    features: [
      "Modelos por especialidade",
      "Variáveis dinâmicas",
      "Compartilhamento na equipe",
      "Histórico de versões",
    ],
  },
  "/app/equipe": {
    title: "Equipe",
    purpose:
      "Gerenciar profissionais, papéis e permissões dentro da organização.",
    features: [
      "Cadastro de membros",
      "Papéis e permissões",
      "Auditoria de acessos",
      "Convites e desligamentos",
    ],
  },
  "/app/relatorios": {
    title: "Relatórios",
    purpose:
      "Consolidar indicadores de produção, prazos e carteira em painéis.",
    features: [
      "Painéis por período",
      "Filtros por perito, cliente e comarca",
      "Exportação em PDF",
      "Alertas de desvio",
    ],
  },
  "/app/financeiro": {
    title: "Financeiro",
    purpose:
      "Acompanhar honorários, adiantamentos e recebimentos por perícia.",
    features: [
      "Registro de honorários e reembolsos",
      "Status de pagamento",
      "Extrato por cliente e perito",
      "Relatório fiscal simplificado",
    ],
  },
  "/app/configuracoes": {
    title: "Configurações",
    purpose:
      "Definir preferências gerais da organização e da conta.",
    features: [
      "Dados institucionais",
      "Fluxos e prazos padrão",
      "Integrações futuras",
      "Segurança e sessões",
    ],
  },
  "/app/ajuda": {
    title: "Ajuda",
    purpose:
      "Centralizar documentação, tutoriais e canais de suporte.",
    features: [
      "Guia rápido de uso",
      "Vídeos e passo a passo",
      "Contato com suporte",
      "Novidades da plataforma",
    ],
  },
  "/app/perfil": {
    title: "Meu perfil",
    purpose:
      "Editar dados profissionais, foto e assinatura eletrônica visual.",
    features: [
      "Dados pessoais e registro profissional",
      "Foto e assinatura",
      "Especialidades",
      "Preferências de comunicação",
    ],
  },
  "/app/organizacao": {
    title: "Organização",
    purpose:
      "Configurar dados institucionais compartilhados por toda a equipe.",
    features: [
      "Identificação da organização",
      "Endereço e contato",
      "Marca e cabeçalho de laudos",
      "Assinantes autorizados",
    ],
  },
  "/app/preferencias": {
    title: "Preferências",
    purpose:
      "Ajustar a experiência pessoal: tema, densidade, notificações e atalhos.",
    features: [
      "Tema claro/escuro/automático",
      "Densidade de listas",
      "Ordenações padrão",
      "Atalhos de teclado",
    ],
  },
};
