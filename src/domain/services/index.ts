/**
 * Barrel público da camada de serviços do domínio — LV-07.2.
 *
 * Exporta apenas CONTRATOS. Não exporta implementações concretas, fixtures,
 * mocks estáveis ou estado. Mocks estáveis vêm em LV-07.3.
 */

export * from "./context";
export * from "./result";
export * from "./pagination";
export * from "./permissions";
export * from "./inputs";
export * from "./organization-service";
export * from "./membership-service";
export * from "./professional-service";
export * from "./case-service";
export * from "./person-service";
export * from "./assignment-service";
