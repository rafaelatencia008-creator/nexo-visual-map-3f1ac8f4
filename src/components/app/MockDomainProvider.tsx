import * as React from "react";
import {
  createMockDomainEnvironment,
  type MockDomainEnvironment,
} from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";
import {
  SEED_MEM_ALFA_OWNER_ID,
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
} from "@/domain/mocks/seed";

/**
 * Contexto demonstrativo — proprietário ativo da Organização Alfa.
 * Fictício e local; nunca é usado como identidade real.
 */
const DEMO_CONTEXT: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});

export type MockDomainAccess = Readonly<{
  environment: MockDomainEnvironment;
  context: ServiceContext;
}>;

const MockDomainContext = React.createContext<MockDomainAccess | null>(null);

/**
 * Provider único do painel /app/**. Cria exatamente um ambiente por
 * montagem via `useState(inicializador)` — a fábrica não é executada em
 * cada render e nenhuma instância vaza como global de módulo.
 */
export function MockDomainProvider({ children }: { children: React.ReactNode }) {
  const [environment] = React.useState<MockDomainEnvironment>(() =>
    createMockDomainEnvironment(),
  );
  const value = React.useMemo<MockDomainAccess>(
    () => ({ environment, context: DEMO_CONTEXT }),
    [environment],
  );
  return (
    <MockDomainContext.Provider value={value}>
      {children}
    </MockDomainContext.Provider>
  );
}

export function useMockDomain(): MockDomainAccess {
  const value = React.useContext(MockDomainContext);
  if (value === null) {
    throw new Error(
      "useMockDomain: precisa ser utilizado dentro de <MockDomainProvider>.",
    );
  }
  return value;
}
