# DEC-COP-001 — Copiloto Nexo (chat mock)

## Contexto

LV-13 introduz um copiloto demonstrativo global na área `/app`.

## Decisões

- Copiloto global integrado ao shell (`src/routes/app.tsx`) via `CopilotProvider`.
- Nenhuma rota nova (`/app/copiloto`, `/app/chat`, `/app/assistente` proibidas).
- Nenhum item novo no menu lateral ou barra inferior.
- Botão `Copiloto` adicionado ao `AppTopbar`, com ícone `Sparkles`.
- Atalho global `Ctrl/Cmd + J` (não conflita com `Ctrl+K` da busca).
- Painel utiliza `Sheet` lateral direito (desktop) e tela quase cheia (mobile).
- Motor determinístico local em `copilot-engine.ts` — nenhuma chamada a IA, rede ou modelo real. Nenhuma dependência OpenAI/Anthropic/Gemini.
- Atraso fixo de 450ms simula processamento, com botão **Parar**.
- Store apenas em memória (`copilot-mock-store.ts`) — sem `localStorage`, `sessionStorage`, cookies ou backend. Conversas se perdem ao recarregar.
- IDs determinísticos por contador; relógio determinístico.
- Contexto derivado da rota + registro opcional de entidade aberta (`useRegisterCopilotEntity`).
- Biblioteca com 30+ perguntas prontas em 10 categorias (busca insensível a acento).
- Sugestões contextuais mudam conforme rota (documentos, entrevistas, diligências, quesitos, agenda, pendências…).
- Respostas fundamentadas: cada uso de dado interno cita fontes (`Fontes consultadas`).
- Ações propostas separadas da execução; toda alteração exige diálogo de confirmação com resumo do impacto.
- Risco alto exige checkbox "Revisei a alteração e desejo aplicá-la.".
- Fingerprint por registro (`updatedAt` + metadados) detecta desatualização e bloqueia com estado `stale`.
- Auditoria append-only com filtros por evento e busca textual.
- Feedback local (útil / não útil + motivo) — nunca sai do navegador.
- Recusa explícita para "assine o laudo", "protocole", "envie ao tribunal", "apague todas as evidências", "conclusão definitiva".
- Sem `dangerouslySetInnerHTML`. Sem HTML vindo de mensagens. Sem chaves de API. Sem `fetch`.
- Preparação para integração real com IA será tratada na LV-19.

## Alternativas descartadas

- Rota dedicada `/app/copiloto`: contraria a diretriz de shell global.
- Uso de `localStorage`/`IndexedDB`: contraria a diretriz de simulação temporária.
- Uso de chamadas a modelo real: bloqueado explicitamente até LV-19.

## Impacto

- `src/routes/app.tsx`: envolve o shell com `CopilotProvider`.
- `src/components/app/AppTopbar.tsx`: exibe `CopilotTrigger`.
- Nenhum outro módulo é modificado além de pequenas integrações opcionais via `useRegisterCopilotEntity`.
