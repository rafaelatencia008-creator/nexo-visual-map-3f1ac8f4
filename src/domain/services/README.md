# `src/domain/services` — Contratos conceituais de serviço (LV-07.2)

Camada de **contratos** TypeScript puros que descreve como telas, mocks,
banco e APIs futuras devem falar com o domínio. Nenhuma implementação
concreta vive aqui.

## Diferença entre entidade, DTO e serviço

- **Entidade** (`src/domain/core`): estado completo persistido, com `id`,
  `organizationId` e `metadata`. Validada pelos type guards de `core`.
- **DTO** (`inputs.ts`): forma dos dados que a tela ENVIA. Nunca contém
  `id`, `organizationId`, `metadata`, `createdAt`, `updatedAt` ou
  `version`. Atualizações carregam `expectedVersion`.
- **Serviço** (`*-service.ts`): interface conceitual que recebe
  `ServiceContext` e devolve `Promise<ServiceResult<T>>`.

## Contexto organizacional obrigatório

Toda operação recebe `ServiceContext` como primeiro argumento:
`{ organizationId, userId, membershipId, role }`. Não há contexto global
oculto. Consultas entre organizações são proibidas por contrato — uma
tentativa deve retornar `not_found` ou `forbidden` (nunca `null`).

## Resultados sem exceção

Falhas esperadas (não encontrado, sem permissão, validação, conflito,
offline, indisponível) NUNCA lançam. Sempre retornam:

```
ServiceResult<T> = { ok: true; data } | { ok: false; error: ServiceError }
```

`ServiceError` é uma união discriminada; nenhuma variante carrega
`Error`, `stack`, `cause: unknown`, token, segredo, SQL ou payload bruto.

## Permissões como contrato

`PermissionPolicy.evaluate(context, request)` devolve uma decisão. O
catálogo `PERMISSION_ACTIONS` é a única fonte de ações válidas — não
existe união manual separada do array. A matriz real vem depois.

## Concorrência otimista por `expectedVersion`

DTOs de atualização de entidades persistíveis exigem `expectedVersion`.
Conflitos devem virar `ServiceError { code: "conflict", expectedVersion,
actualVersion }` — sem exceção.

## Paginação por cursor opaco

`PageRequest { cursor?, limit }` + `PageResult<T> { items, nextCursor?,
total? }`. Cursor é opaco: nenhum consumidor deste barrel interpreta o
conteúdo. Limites: 1 ≤ `limit` ≤ 100.

## Ordenação restrita

Cada serviço define seu próprio enum de campos de ordenação
(`CASE_SORT_FIELDS`, `MEMBERSHIP_SORT_FIELDS` etc.). Strings arbitrárias
como `sortBy` são proibidas por tipagem.

## Sem implementação concreta

Este diretório NÃO contém:

- repositórios funcionais;
- arrays de dados;
- classes em memória exportadas;
- CRUD funcionando;
- HTTP, storage, banco, Supabase, Lovable Cloud;
- `setTimeout`, `Date.now`, `Math.random`, `new Date`.

Mocks estáveis são responsabilidade da **LV-07.3**. Fakes locais dentro
de arquivos de teste são permitidos apenas para provar que as
interfaces são implementáveis.

## Sem autenticação nos contratos

`ServiceContext` não guarda e-mail, senha, token, provedor OAuth ou
objeto de sessão visual. Chaves `password`, `senha`, `token`,
`accessToken`, `refreshToken`, `secret`, `apiKey` são recusadas pelos
type guards da fundação.
