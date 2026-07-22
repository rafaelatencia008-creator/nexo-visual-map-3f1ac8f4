import type { Role, WorkMode } from "./onboarding";

export type DemoContext = {
  id: string;
  nome: string;
  tipo: WorkMode;
  role: Role;
  integrantes: number;
  descricao: string;
};
