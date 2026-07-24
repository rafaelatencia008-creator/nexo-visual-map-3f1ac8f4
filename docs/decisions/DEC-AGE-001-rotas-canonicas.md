# DEC-AGE-001 — Rotas canônicas da Agenda

**Status:** aceito
**Data:** 2026-07-24
**Etapa:** LV-09.1B.6.3 concluída; LV-09.1B.7.1 e LV-09.1B.7.1.1
concluídas; LV-09.1B.7.2 concluída; correção LV-09.1B.7.2.1 concluída
(tipagem segura, ciclo consultivo em helper puro
`availability-consultation-state.ts`, `SelectTrigger` único para o
Responsável e aria-linkage do erro de intervalo).

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
  real: cabeçalho com `h1`, botão "Voltar para a agenda" e renderização
  direta de `AgendaCreateContent` com `active`, `surface="page"` e
  `closeAfterCreate={false}`. A rota controla toda a navegação:
  compromisso → `/app/agenda/$appointmentId`; prazo → `pendingCreated`
  no provider + volta para `/app/agenda`; cancelamento/descarte →
  `/app/agenda`.

### Entregue na parcela B (LV-09.1B.6.3B.1.1 — saída segura da página de criação)

- A rota `/app/agenda/novo` deixou de expor um `<Link to="/app/agenda">`
  no cabeçalho. O retorno é agora um `<Button>` que chama
  `handleBackRequest`, que delega ao Content através de
  `contentRef.current.requestClose()` (handle imperativo
  `AgendaCreateContentHandle`). A detecção de rascunho e a confirmação
  "Descartar rascunho?" continuam **exclusivamente** no Content — a rota
  não duplica esse estado. O fallback direto `navigate({ to: "/app/agenda" })`
  só é usado quando o Content ainda não está montado (estados `loading`
  ou `error` do provider). Durante submit o Content permanece na página
  (o handle é responsável por ignorar o pedido).

### Entregue na parcela B (LV-09.1B.6.3B.2.1 — extração do detalhe)

- Criado `src/features/agenda/AgendaItemDetailContent.tsx` — corpo
  funcional completo do fluxo de detalhe/edição, sem shell de diálogo.
  Concentra a **única** implementação: carregamento, avaliação de
  permissões, formulário de edição, submit com `expectedVersion`,
  mudanças de status, exclusão, resolução de conflitos, banner de retry,
  single-flight (`bindSingleFlightLockToRef`), seis gates unificados
  (`deriveMutationLockDecisions` + `permissionAllowsAction`), toasts
  e detecção de rascunho com `AlertDialog` "Descartar alterações?".
- O Content expõe `forwardRef` com o handle imperativo
  `AgendaItemDetailContentHandle.requestClose()`; usa a prop
  `surface: "page" | "dialog"` para condicionar apenas layout e nível de
  cabeçalho (`h1` em página, `h2` em diálogo). NÃO conhece a camada de
  roteamento — não importa `@tanstack/react-router` nem `useNavigate`.
- `AgendaItemDetailDialog` passou a ser um **wrapper fino**: monta
  apenas `<Dialog>` + `<DialogContent>` acessível (título/descrição no
  `DialogHeader` `sr-only`) e delega o fechamento externo (X, Escape,
  clique fora) ao Content via `contentRef.current.requestClose()`. A API
  pública histórica (`AgendaItemDetailDialog`,
  `AgendaItemDetailDialogProps`, `SelectedAgendaItem`,
  `AgendaItemUpdated`, `AgendaItemDeleted`) permanece compatível — os
  testes existentes continuam válidos, apenas as leituras estruturais de
  fonte foram redirecionadas para `AgendaItemDetailContent.tsx`.

### Entregue na parcela B (LV-09.1B.6.3B.2.1.1 — ciclo de atividade e invalidação assíncrona)

- Criado `src/features/agenda/detail-activity.ts` com
  `buildAgendaDetailSelectionKey(selected)`, que produz uma chave estável
  `${type}:${caseId}:${id}`. Duas seleções para o mesmo item da agenda
  geram chaves idênticas, mesmo quando o pai recria o objeto `selected`.
- `AgendaItemDetailContent` passou a chavear **todos** os efeitos
  (reset, load, permissões, assignments) por `selectionKey` em vez da
  referência do objeto `selected`. Reset e load também dependem de
  `active`, e o assignments passa a incluir `selectionKey` no array de
  dependências.
- Introduzidos `activeRef` e `selectionKeyRef` sincronizados por
  `useEffect`. Cada resposta assíncrona (load, permissão, assignments,
  submit, mudança de status, exclusão) captura a chave da seleção no
  início da chamada e só aplica `setState` se, no momento da resolução,
  o componente ainda estiver ativo **e** a seleção corrente for a mesma.
  Handlers antigos que só validavam `mountedRef.current` foram trocados
  por `stillCurrent()` / `stillSameSelection()`, garantindo que
  respostas atrasadas de uma seleção anterior nunca contaminem o estado
  da seleção atual.
- Gate unificado `isInteractive = active && selected !== null &&
  detail.kind === "ready"` aplicado aos seis gates de UI (`canEditItem`,
  `canOpenItemAction`, `canConfirmStatusChange`, `canConfirmRemoval`,
  `canRetryPermissionEvaluation`) e como pré-condição de `canCloseDetail`.
  `submit`, `confirmStatusChange` e `confirmRemoval` também verificam
  `activeRef.current` antes de acionar o serviço.

### Entregue na parcela B (LV-09.1B.6.3B.2.1.2 — gates completos, invalidação síncrona e propriedade dos locks)

- `activeRef` e `selectionKeyRef` passaram a ser sincronizados **durante
  o render** (atribuição direta, sem `useEffect`). Fecha a janela em que
  uma promessa antiga poderia aplicar `setState` após o pai já ter
  desativado o detalhe.
- Introduzida `buildAgendaDetailActivationKey(active, selectionKey)`, que
  chaveia o efeito de reset. Mudança apenas de `referenceEpoch` ou
  recriação equivalente de `selected` deixaram de resetar o formulário.
- Separadas as noções de atividade e prontidão via
  `deriveAgendaDetailActivityState`: `hasActiveSelection` permite
  fechamento e retry mesmo em `loading` ou `error`; `isInteractiveReady`
  só é verdadeiro depois de `detail.kind === "ready"`. Substituíram o
  antigo `isInteractive`.
- Os SEIS gates funcionais (`canCloseDetail`, `canEditItem`,
  `canOpenItemAction`, `canConfirmStatusChange`, `canConfirmRemoval`,
  `canRetryPermissionEvaluation`) são calculados no topo do render e
  usados também nos handlers (`if (!canX) return;`). `retryDetail` foi
  extraído e gateado por `hasActiveSelection`.
- Introduzidos tokens monotônicos `submitOperationIdRef` /
  `mutationOperationIdRef`. Cada operação é dona da sua trava até o
  próprio `finally` — o reset **não** libera `mutationLock` nem zera
  `submittingRef`, apenas reprojeta os estados visuais
  (`setSubmitting(submittingRef.current)`,
  `setMutating(mutationLock.isLocked())`). Finalizadores antigos não
  conseguem desligar `setSubmitting`/`setMutating` de operações
  posteriores porque o token corrente já é diferente.
- `isAgendaDetailAsyncResultCurrent` centraliza a decisão de aplicar ou
  descartar respostas assíncronas (`mounted`, `active`, `cancelled`,
  identidade de seleção e request ID).

### Entregue na parcela B (LV-09.1B.6.3B.2.1.3 — vinculação do detalhe à seleção e geração monotônica de atividade)

- Introduzida uma **geração monotônica de atividade** em `AgendaItemDetailContent`.
  A cada mudança da `activationKey` (ativação, troca de item ou desativação),
  a geração é incrementada **durante o render** — via `previousActivationKeyRef`
  e `activityGenerationRef`, sem `useEffect`. Isso diferencia o cenário
  A → B → A: a terceira sessão tem geração maior que a primeira, e uma
  resposta lenta da sessão inicial nunca é aplicada na sessão final,
  mesmo com a chave semântica idêntica.
- O estado de detalhe foi trocado por `DetailSnapshot` — carrega
  `activityGeneration`, `selectionKey` e `state`. O detalhe **visível**
  (`detail`) é derivado: quando o snapshot não é da sessão corrente
  (`detailIsCurrent === false`), a UI mostra "loading" mesmo que o
  snapshot contenha um `ready` de outra sessão. `setDetail` é um wrapper
  que estampa o snapshot com `activityGenerationRef.current` e
  `selectionKeyRef.current` no momento da chamada.
- `AgendaDetailAsyncGuard` foi ampliado com `currentActivityGeneration` e
  `requestActivityGeneration` (ambos opcionais para retrocompatibilidade).
  `isAgendaDetailAsyncResultCurrent` rejeita respostas cuja geração
  capturada difere da corrente. Os `stillCurrent`/`stillSameSelection`
  do load, das permissões, dos assignments, do submit, do
  `confirmStatusChange` e do `confirmRemoval` agora comparam também a
  geração.
- `AgendaDetailActivityInputs` passou a exigir
  `detailBelongsToCurrentActivity: boolean`. `deriveAgendaDetailActivityState`
  compõe `isInteractiveReady = hasActiveSelection && detailBelongsToCurrentActivity && detailReady`.
  Snapshots órfãos não habilitam edição, mudança de status ou exclusão.

### Entregue na parcela B (LV-09.1B.6.3B.2.1.3.1 — sessão de atividade segura para renderizações concorrentes)

- Removidas TODAS as mutações de refs no corpo do render de
  `AgendaItemDetailContent`. `activeRef`, `selectionKeyRef`,
  `previousActivationKeyRef` e `activityGenerationRef` deixaram de
  existir. Um render abandonado pelo React não avança mais a geração de
  atividade nem contamina a próxima render.
- Criados em `detail-activity.ts` (puro, sem React) três novos
  primitivos: `AgendaDetailActivitySession`,
  `createAgendaDetailActivitySession(activationKey)` e
  `deriveAgendaDetailRenderSession(committed, activationKey)`. A derivação
  é idempotente quando a chave não muda e incrementa a geração exatamente
  uma vez quando muda — mesmo que o render seja repetido/descartado, o
  próximo render recalcula a partir da sessão **confirmada**.
- No Content, a sessão confirmada vive em `useState<AgendaDetailActivitySession>`;
  cada render deriva `renderActivitySession` pura. Um `useCommitLayoutEffect`
  isomórfico (`useLayoutEffect` no navegador, `useEffect` em SSR) promove
  a sessão candidata a confirmada — e somente aí sincroniza a única ref
  runtime `currentActivityRef` (`{active, selectionKey, activityGeneration}`).
- Handlers e closures assíncronas leem exclusivamente
  `currentActivityRef.current` para validar pertinência. Snapshots de
  detalhe são carimbados com um `detailOwner` derivado do render corrente
  (memo), garantindo que closures da sessão A jamais carimbem snapshots
  em uma sessão A' posterior. `stillCurrent`/`stillSameSelection` do
  load, permissões, assignments, submit, `confirmStatusChange` e
  `confirmRemoval` comparam contra a ref consolidada — a geração muda
  apenas via commit, então A → B → A confirmado é preservado sem
  depender de mutação de ref no render.



### LV-09.1B.6.3B.2.2 concluída

A rota `/app/agenda/$appointmentId` tornou-se página real, montando
`AgendaItemDetailContent` com `surface="page"` diretamente. O uso do
`AgendaItemDetailDialog` permanece exclusivo do calendário. A
LV-09.1B.6.3 está concluída.






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

## Adendo LV-09.1B.6.3B.2.1 e LV-09.1B.6.3B.2.2

- **LV-09.1B.6.3B.2.1** concluída: `AgendaItemDetailContent` é a única
  implementação funcional do fluxo de detalhe/edição.
- `AgendaItemDetailDialog` permanece como **wrapper fino** consumido em
  `/app/agenda` (calendário) para abertura rápida em diálogo. Delega o
  fechamento seguro ao handle `requestClose()` exposto pelo Content.
- **LV-09.1B.6.3B.2.2** concluída: a rota canônica
  `/app/agenda/$appointmentId` tornou-se **página real**. Ela monta
  diretamente `AgendaItemDetailContent` com `surface="page"` (sem
  diálogo). O botão superior "Voltar para a agenda" chama
  `contentRef.current.requestClose()`; o fallback direto para
  `navigate({ to: "/app/agenda" })` só ocorre quando o Content ainda não
  está montado (loading / not_found / error / forbidden).
- Consequência: criação (`/app/agenda/novo`) e detalhe
  (`/app/agenda/$appointmentId`) agora possuem **páginas canônicas
  reais**, encerrando **LV-09.1B.6.3B.2** e permitindo marcar
  **LV-09.1B.6.3** como concluída se nenhuma outra parcela pendente
  existir dentro dela.
- Disponibilidade: **LV-09.1B.7.1** (motor consultivo puro) e
  **LV-09.1B.7.1.1** (helpers oficiais / paginação) foram concluídas.

## Adendo LV-09.1B.7.2 — Página consultiva de disponibilidade

- **LV-09.1B.6.3** concluída.
- **LV-09.1B.7.1** concluída (motor consultivo puro).
- **LV-09.1B.7.1.1** concluída (helpers e paginação vinculados ao domínio).
- **LV-09.1B.7.2** concluída nesta entrega: criada a rota canônica
  `/app/disponibilidade` (`src/routes/app.disponibilidade.tsx`) como
  página consultiva `SCR-AGE-004`. A rota é fina — obtém
  `environment`/`context` via `useMockDomain` e monta
  `AgendaAvailabilityContent`. O componente reutiliza o motor aprovado
  `checkAppointmentAvailability` sem alterá-lo.
- Composição canônica das rotas da Agenda após esta etapa:
  - `/app/agenda` — calendário e diálogos rápidos.
  - `/app/agenda/novo` — página real de criação.
  - `/app/agenda/$appointmentId` — página real do compromisso.
  - `/app/disponibilidade` — página consultiva de disponibilidade.
- **A página é consultiva.** Não cria, altera, cancela, conclui nem
  remove compromissos, e não bloqueia os formulários de criação ou
  edição. O motor é consultivo e não existe persistência de
  disponibilidade — nenhuma reserva, `AvailabilityService`, `working
  hours`, `time slots` ou sincronização externa foi criada.
- Acesso: a Agenda (`/app/agenda`) ganhou um botão secundário
  "Verificar disponibilidade" que navega para `/app/disponibilidade`,
  preservando o botão "Novo item" e todo o restante do cabeçalho.

