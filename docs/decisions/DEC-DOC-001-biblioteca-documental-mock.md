# DEC-DOC-001 — Biblioteca documental (mock)

**Status:** aceita
**Escopo:** LV-09.3
**Data:** 2026-07-25

## Contexto

A área **Documentos** (`/app/documentos`) estava marcada como módulo em construção. Precisamos
entregar a biblioteca documental funcional dentro do ambiente mock atual, sem introduzir
backend, storage, upload real, IA ou autenticação real.

## Decisão

- Documentos deixou de ser módulo em construção.
- `/app/documentos` passa a ser a rota funcional da biblioteca documental.
- Nenhuma rota nova é criada — detalhes, criação, versões, anotações e upload em lote acontecem
  em diálogos dentro da própria rota.
- O upload manual e o upload em lote são **mock**: o input `<input type="file">` do navegador é
  usado para capturar somente metadados (`fileName`, `sizeBytes`, `mimeType`). Nenhum byte é
  transmitido, armazenado ou persistido em qualquer camada.
- Versões e anotações são **append-only** dentro do store em memória.
- Vínculos abrangem **processo**, **perícia** e **pessoas** (múltiplas), reutilizando os IDs
  existentes em `src/lib/mock/data.ts`.
- Sigilo é apresentado como badge (`publico` | `restrito` | `sigiloso`). Nesta fase o sigilo é
  puramente visual — o acesso real será controlado por permissões na fase de backend.
- O estado do prazo é derivado por um helper puro (`computeDeadlineState`) que recebe a data de
  referência por parâmetro, garantindo determinismo nos testes.
- Persistência real (Supabase, storage, sync) só será implementada em uma etapa de backend
  posterior à conclusão da fase visual.

## Escopo mock

O store `document-mock-store.ts` mantém os registros no escopo de módulo. Novos documentos,
versões e anotações permanecem disponíveis durante a sessão atual; um reload completo restaura
o seed determinístico com 12 documentos.

## Contrato de tipos

- `DocumentRecord` (readonly) com `personIds`, `versions` e `annotations` como arrays imutáveis.
- `DocumentVersion` (readonly) com `version` monotônico crescente.
- `DocumentAnnotation` (readonly) com `authorLabel` e `createdAt`.

## Impacto em navegação

- `src/lib/app-nav.ts`: entrada `Documentos` habilitada (sem `construction: true`).
- Nenhuma nova rota adicionada a `src/routeTree.gen.ts`.

## Conclusão

**LV-09.3 está concluída.** A biblioteca documental é utilizável no ambiente mock, com upload
manual, upload em lote, versionamento, anotações, vínculos, sigilo, prazos, pesquisa e filtros.
