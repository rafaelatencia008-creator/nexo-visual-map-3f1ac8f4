# DEC-DOC-003 — Extração e comparação documental (mock)

**Status:** aceita
**Escopo:** LV-09.5
**Data:** 2026-07-25

## Contexto

As LV-09.3 e LV-09.4 entregaram a biblioteca documental e o visualizador mock em
`/app/documentos`. Faltava permitir análise de conteúdo (extração de informações),
comparação entre versões de um mesmo documento e comparação entre dois documentos,
sem introduzir IA real, backend, storage remoto ou chamadas externas.

## Decisão

- Nenhuma rota nova. Toda a funcionalidade vive dentro de `/app/documentos`,
  integrada via três diálogos:
  - `src/features/documents/DocumentExtractionDialog.tsx`
  - `src/features/documents/DocumentCompareVersionsDialog.tsx`
  - `src/features/documents/DocumentCompareDocumentsDialog.tsx`
- Helpers puros e determinísticos vivem em
  `src/features/documents/document-analysis.ts` e derivam resultados a partir do
  par `(documentId, versionId)` reutilizando o motor de prévia LV-09.4
  (`previewSeed`, `seededRandom`, `buildTextPage`, `buildSheetPreview`).
- **Proibido**: `Math.random`, `crypto.randomUUID`, `Date.now` em qualquer
  caminho de geração de resultado.
- Extração devolve: resumo, pessoas mencionadas, datas, valores, números de
  processo, prazos, palavras-chave, possíveis inconsistências e trechos
  relevantes — cada item acompanhado de confiança demonstrativa (0–100).
- Comparação de versões: valida IDs distintos, monta duas colunas com contagens
  de linhas adicionadas, removidas, alteradas e inalteradas. Nenhuma versão é
  modificada; a operação apenas lê.
- Comparação de documentos: recusa mesmo `id` dos dois lados, apresenta metadados
  lado a lado (nome, categoria, processo, perícia, pessoas, sigilo, prazo),
  lista semelhanças, diferenças e possíveis conflitos, calcula percentual
  demonstrativo de similaridade combinando metadados (40%) e conteúdo mock
  (60%) — com leve variação por par determinística.
- Todo diálogo carrega o aviso obrigatório:
  **“Análise demonstrativa. Nenhum arquivo real foi processado nesta etapa.”**
- Estados apresentados: **Preparando análise…**, **Análise concluída**,
  **Nenhum conteúdo disponível**, **Não foi possível concluir a análise**,
  **Você está offline**, **Sem permissão**, além de botão **Tentar novamente**.

## Fora de escopo

- Sem IA real, sem OpenAI, sem API externa, sem Supabase, sem backend, sem
  storage, sem upload/download real, sem autenticação real.
- Sem alteração da Agenda.
- Sem alteração das versões existentes — o motor de comparação é somente leitura.

## Acessibilidade

- Toolbar e ações com `aria-label` explícito.
- Região `aria-live="polite"` anuncia mudança de estado e `aria-busy` marca a
  fase de preparação.
- Erros com `role="alert"`.
- Foco restaurado ao elemento que abriu o diálogo.

## Preparação para o storage futuro

Os helpers de análise recebem `DocumentRecord` / `DocumentVersion`. Quando o
storage real for conectado, a substituição dos builders puros (
`extractFromDocument`, `versionContentLines`) pelo provedor equivalente basta —
a superfície dos diálogos permanece inalterada.
