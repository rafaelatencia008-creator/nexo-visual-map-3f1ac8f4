/**
 * Barrel do domínio oficial — LV-07.1 + correção LV-07.1.1.
 */

export * from "./ids";
export * from "./common";
export * from "./access";
export * from "./organization";
export * from "./professional";
export * from "./case";
export * from "./person";
export * from "./assignment";
export * from "./case-plan";
export * from "./validators";
export * from "./labels";
export * as fixtures from "./fixtures";

// Reexporta enums compartilhados para conveniência.
export {
  PERFIS,
  WORK_MODES,
  ROLES,
  isPerfil,
  isWorkMode,
  isRole,
} from "../shared/work-context";
export type { Perfil, WorkMode, Role } from "../shared/work-context";
