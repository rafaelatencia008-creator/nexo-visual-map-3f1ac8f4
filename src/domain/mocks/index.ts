/**
 * Barrel público dos mocks estáveis do domínio — LV-07.3.
 *
 * Exporta apenas: fábrica, tipos públicos, opções, snapshot, seed helpers
 * documentados. Não exporta store, clock mutável, gerador, arrays internos
 * ou instâncias globais.
 */

export { createMockDomainEnvironment } from "./factory";
export {
  MOCK_DOMAIN_OPTIONS_ALLOWED_KEYS,
  type MockDomainEnvironment,
  type MockDomainOptions,
  type MockDomainServices,
  type MockDomainSnapshot,
} from "./types";
export { validateMockDomainSeed, type SeedValidationIssue } from "./seed";
export { MOCK_BASE_EPOCH_MS, MOCK_TICK_MS } from "./clock";
