# DEC-AGE-001 — Rotas canônicas da Agenda

**Status:** aceito (parcela A concluída; parcela B em andamento — criação
extraída, detalhe ainda pendente)
**Data:** 2026-07-24
**Etapa:** LV-09.1B.6.3 (aberta) — parcela A entregue nas LV-09.1B.6.3A a
LV-09.1B.6.3A.3; parcela B iniciada na LV-09.1B.6.3B.1 (extração do
fluxo de criação); LV-09.1B.6.3B.2 (extração do detalhe) ainda não
iniciada.

## Estado atual desta decisão

### Entregue na parcela A (LV-09.1B.6.3A a .3A.3)

- Rota pai `src/routes/app.agenda.tsx` como layout com `<Outlet />` e
  `AgendaRouteStateProvider` compartilhado.
- Calendário como rota índice `src/routes/app.agenda.index.tsx`.
- Rota canônica de criação `src/routes/app.agenda.novo.tsx`.
- Rota canônica de detalhe `src/routes/app.agenda.$appointmentId.tsx`.
- Resolvedor puro `resolve-appointment-route.ts` com guard sintático,
  deduplicação e detecção de ciclo.
- Política pura `shouldCloseAgendaCreateAfterSuccess` — a rota canônica
  controla o fechamento pós-sucesso via `closeAfterCreate`.

### Entregue na parcela B (LV-09.1B.6.3B.1 — criação)

- Criado `src/features/agenda/AgendaCreateContent.tsx` — corpo completo
  do fluxo de criação, sem shell de diálogo. Concentra a **única**
  implementação funcional: estado dos formulários, permissões, carregamento
  paginado de assignments, submit, single-flight, detecção de rascunho e
  confirmação de descarte.
- `AgendaCreateDialog` passou a ser um **wrapper fino**: monta apenas
  `<Dialog>`, `<DialogTitle>`, `<DialogDescription>` e delega o
  fechamento externo ao Content via `React.useImperativeHandle`
  (`AgendaCreateContentHandle.requestClose()`). A API pública histórica
  (`AgendaCreateDialog`, `AgendaCreateDialogProps`, `AgendaCreatedItem`)
  permanece compatível — os testes existentes continuam válidos.
- `/app/agenda/novo` deixou de montar diálogo e passou a ser uma página
  real: cabeçalho com `h1`, link "Voltar para a agenda" e renderização
  direta de `AgendaCreateContent` com `active`, `surface="page"` e
  `closeAfterCreate={false}`. A rota controla toda a navegação:
  compromisso → `/app/agenda/$appointmentId`; prazo → `pendingCreated`
  no provider + volta para `/app/agenda`; cancelamento/descarte →
  `/app/agenda`.

### Pendente da parcela B (LV-09.1B.6.3B.2)

Ainda **não** foi criado:

- `AgendaItemDetailContent` — corpo do fluxo de detalhe/edição sem shell
  de diálogo.

A rota `/app/agenda/$appointmentId` continua montando temporariamente
(condição transitória) o `AgendaItemDetailDialog` existente — os diálogos
ainda não foram convertidos em wrappers finos para o detalhe. A
LV-09.1B.6.3 permanece **aberta** e só será encerrada quando a
LV-09.1B.6.3B.2 extrair esse `Content` e transformar o diálogo de detalhe
em wrapper fino.

A LV-09.1B.7 (motor consultivo de disponibilidade) **não está iniciada**.
Qualquer artefato antecipado dessa etapa foi removido na LV-09.1B.6.3A.1.

## Contexto

A documentação oficial v3.2 do Nexo Pericial 360 define três rotas canônicas
para a Agenda:

- `/app/agenda` — calendário e listagens;
- `/app/agenda/novo` — criação de prazo ou compromisso;
- `/app/agenda/:appointmentId` — detalhe de compromisso.

Até esta etapa, a Agenda vivia inteiramente em `/app/agenda`, com criação e
detalhe implementados apenas como diálogos internos do componente-página.
Isso divergia da documentação e impedia deep-linking, refresh direto de um
compromisso, e navegação natural pelo botão de voltar do navegador.

## Decisão

1. **Reconciliação das rotas canônicas.** As três rotas passam a existir de
   forma explícita no roteamento file-based do TanStack Router:
   - `src/routes/app.agenda.tsx` — rota pai (layout com `<Outlet />`) que
     hospeda o `AgendaRouteStateProvider` compartilhado.
   - `src/routes/app.agenda.index.tsx` — calendário e listagem.
   - `src/routes/app.agenda.novo.tsx` — criação de prazo ou compromisso.
   - `src/routes/app.agenda.$appointmentId.tsx` — detalhe de compromisso.

2. **Reuso de conteúdo por extração planejada, não por duplicação.** Na
   parcela B, as implementações funcionais dos fluxos de criação e de
   detalhe/edição serão extraídas em dois componentes reutilizáveis:
   - `AgendaCreateContent` — corpo completo do fluxo de criação, sem
     shell de diálogo.
   - `AgendaItemDetailContent` — corpo completo do fluxo de detalhe/edição,
     sem shell de diálogo.

   Após essa extração, `AgendaCreateDialog` e `AgendaItemDetailDialog`
   serão transformados em wrappers finos que apenas montam o `Content`
   correspondente dentro de um `<Dialog>`, preservando compatibilidade
   com o restante do app e com a suíte de testes existente. Nesta parcela
   A, esses componentes `Content` ainda não foram criados e os diálogos
   ainda não são wrappers finos.

3. **Prazo permanece em diálogo.** O detalhe/edição de prazo continua sendo
   apresentado como diálogo sobre o calendário — a documentação v3.2 não
   define rota canônica para prazos individuais. Somente o detalhe de
   compromisso migra para rota (`/app/agenda/$appointmentId`).

4. **Estado compartilhado no pai.** Filtros, modo de visualização, âncora
   temporal, marcadores de pós-mutação e chave de recarga vivem em um
   `AgendaRouteStateProvider` montado no componente pai (`app.agenda.tsx`).
   Como o pai não desmonta durante navegação entre as rotas filhas, o
   estado sobrevive à ida e volta entre `/app/agenda`, `/app/agenda/novo` e
   `/app/agenda/$appointmentId`. Nada é persistido em `localStorage`,
   `sessionStorage`, singletons ou `window`.

5. **Resolvedor de rota de compromisso.** Um resolvedor puro
   (`resolve-appointment-route.ts`) percorre paginadamente os compromissos
   acessíveis para localizar o `Appointment` correspondente a um
   `appointmentId` de URL. O resultado é uma união discriminada com
   exatamente três estados:
   - `{ kind: "found"; appointment }`
   - `{ kind: "not_found" }`
   - `{ kind: "error"; source: "appointments"; code? }`

   O resolvedor **não fabrica `forbidden`**: itens fora do escopo de acesso
   do usuário simplesmente não aparecem na listagem, e nesse caso
   retornamos `not_found` — coerente com o resto do sistema, que já protege
   o acesso pela listagem. Um estado visual `forbidden` só é apresentado
   quando um serviço oficial retorna explicitamente `error.code === "forbidden"`.
   Não usamos snapshot, store, seed ou consulta paralela não autorizada
   para inferir a existência de item inacessível.

6. **Pós-criação de prazo atravessa a rota.** Ao criar um prazo em
   `/app/agenda/novo`, registramos no estado compartilhado um marcador
   `pendingCreated { type: "deadline", id, requiredGeneration }` **antes**
   de navegar para `/app/agenda`, incrementando a geração de recarga.
   O calendário aguarda uma nova geração concluir para decidir entre
   `visible`, `hidden` ou continuar aguardando. O aviso "Ele não aparece
   na visualização atual" permanece funcional e cruza a fronteira de rota.

7. **Pós-criação de compromisso navega direto para o detalhe.** Ao criar um
   compromisso em `/app/agenda/novo`, navegamos para
   `/app/agenda/$appointmentId` diretamente, sem passar por marcadores de
   visibilidade.

## Consequências

- A árvore gerada `src/routeTree.gen.ts` é regenerada pelo plugin do
  TanStack Router e passa a incluir os IDs `/app/agenda/`,
  `/app/agenda/novo` e `/app/agenda/$appointmentId`. **A auditoria
  verifica isso via diff do build**; a suíte de testes não depende de
  ferramentas Git.
- Nenhum contrato de domínio, serviço ou mock foi alterado. As
  assinaturas oficiais e os seeds permanecem exatamente como estavam
  antes desta etapa.
- Os testes existentes que exercitam `AgendaCreateDialog` e
  `AgendaItemDetailDialog` continuam válidos, porque os componentes
  seguem exportados com o mesmo shape público.
- Não criamos `/app/disponibilidade` nesta etapa. LV-09.1B.7 permanece
  não iniciada.

## Não-objetivos

- Este DEC não altera o comportamento de validação, permissões, submit,
  transição de status, exclusão, tratamento de conflito ou single-flight
  lock. Nesta parcela A, essas regras continuam preservadas dentro dos
  diálogos existentes (`AgendaCreateDialog` e `AgendaItemDetailDialog`).
  A parcela B realizará a extração para `AgendaCreateContent` e
  `AgendaItemDetailContent` sem alterar nenhuma dessas regras.
- Este DEC não introduz nenhuma nova regra de permissão nem novo
  contrato de serviço.
