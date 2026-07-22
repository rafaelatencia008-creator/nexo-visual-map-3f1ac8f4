# src/domain/mocks — Mocks estáveis do domínio oficial (LV-07.3)

Implementação em memória, determinística e isolada dos contratos definidos
em `src/domain/services`. Não substitui os dados de demonstração das telas
(`src/lib/mock/**`) nesta etapa — a migração acontecerá em LV-07.4+.

## Regras

- Cada `createMockDomainEnvironment()` devolve um ambiente completamente
  isolado. Nenhum estado é compartilhado entre chamadas.
- Store, relógio e gerador de IDs ficam fechados por closure; nada é
  exportado pelo `index.ts`.
- Todas as leituras devolvem cópias profundas via `structuredClone`.
- Relógio começa em `2026-01-01T00:00:00Z` e avança 1s por escrita.
- IDs são gerados por contador (`mock_0001`, `mock_0002`…), sem colisão
  com o seed (`_seed_*`).
- Contexto é validado em toda chamada: organização, usuário, papel e
  status do membership precisam bater. Falhas mapeiam para
  `unauthorized` (contexto inválido) ou `forbidden` (dados divergentes).
- Recursos de outra organização retornam `not_found` (privacidade).
- Concorrência otimista via `expectedVersion`; conflito não avança o
  relógio e não altera a entidade.
- Paginação por cursor opaco (`mock_cursor_<offset>`) validado por
  `validatePageRequest()`.

## Escopo desta etapa

- LV-07.3: mocks estáveis, seed, isolamento cross-org/cross-case,
  concorrência, paginação, ordenação, readiness.
- **Fora do escopo**: matriz completa de permissões por papel, latência,
  falhas de serviço injetáveis, offline, migração das telas. Isso é LV-07.4.

## API

```ts
import {
  createMockDomainEnvironment,
  type MockDomainEnvironment,
} from "@/domain/mocks";

const env = createMockDomainEnvironment();
env.services.cases.list(context, { page: { limit: 10 } });
env.snapshot(); // cópia readonly de todo o estado
```
