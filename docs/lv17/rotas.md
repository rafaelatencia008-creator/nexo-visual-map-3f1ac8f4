# LV-17 — Inventário de rotas

Este documento registra a auditoria de rotas realizada na LV-17. Ele não
é uma rota executável, apenas documentação para o proprietário.

## Rotas públicas (marketing / autenticação demonstrativa)

- `/` — página inicial (marketing)
- `/produto`, `/servicos`, `/recursos`, `/planos`, `/profissoes`, `/sobre`, `/contato`, `/seguranca`
- `/entrar` — login demonstrativo
- `/criar-conta`, `/recuperar-senha`, `/verificar-email`
- `/selecionar-contexto` — seleção de organização mock

## Rotas de onboarding

- `/onboarding` (index e subpassos: `forma-de-trabalho`, `contexto`, `perfil`, `preferencias`, `revisao`)

## Rotas do painel (`/app/**`, protegidas por `AuthGate`)

- `/app` — início / painel
- `/app/agenda` + `/app/agenda/novo` + `/app/agenda/$appointmentId`
- `/app/pericias` + `nova`, `$id`, `$id/editar`
- `/app/processos` + `novo`, `$id`, `$id/editar`
- `/app/clientes` + `novo`, `$id`, `$id/editar`
- `/app/peritos` + `novo`, `$id`, `$id/editar`
- `/app/pendencias`, `/app/documentos`, `/app/entrevistas`, `/app/quesitos`, `/app/laudos`
- `/app/perfil`, `/app/preferencias`, `/app/organizacao`, `/app/disponibilidade`
- `/app/modelos`, `/app/equipe`, `/app/relatorios`, `/app/financeiro`, `/app/configuracoes`, `/app/ajuda`
  (módulos em construção usam `UnderConstruction`)

## Rotas de erro/estado

- `/acesso-negado`, `/conflito`, `/offline`
- `notFoundComponent` global em `src/routes/__root.tsx`
- `errorComponent` global em `src/routes/__root.tsx`

## Auditoria de menus

Todos os itens em `src/lib/app-nav.ts` (`APP_NAV`) foram cruzados com o
`routeTree.gen.ts` — não há apontamento para rota inexistente. Rotas em
construção usam o mesmo componente `UnderConstruction`.

## Painel de diagnóstico

Não é uma rota. Fica disponível como overlay quando a URL contém
`?demo=1` em qualquer página `/app/**`.
