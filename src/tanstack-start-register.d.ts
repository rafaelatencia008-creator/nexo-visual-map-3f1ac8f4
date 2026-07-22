/**
 * Registro estável do TanStack React Start — LV-07.4.1.
 *
 * Fonte de verdade única e versionada. Não depende do conteúdo final de
 * `src/routeTree.gen.ts` (arquivo gerado). Este `.d.ts` é incluído
 * automaticamente pelo TypeScript porque o `tsconfig.json` do projeto
 * inclui `src/**\/*`, e a extensão `.d.ts` garante que ele contribui apenas
 * com tipos (nunca produz código runtime).
 */

import type { getRouter } from "./router";
import type { startInstance } from "./start";

declare module "@tanstack/react-start" {
  interface Register {
    ssr: true;
    router: Awaited<ReturnType<typeof getRouter>>;
    config: Awaited<ReturnType<typeof startInstance.getOptions>>;
  }
}

export {};
