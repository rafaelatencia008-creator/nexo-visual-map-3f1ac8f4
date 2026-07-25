# DEC-DOC-002 — Visualizador documental (mock)

**Status:** aceita
**Escopo:** LV-09.4
**Data:** 2026-07-25

## Contexto

A LV-09.3 entregou a biblioteca documental funcional em `/app/documentos`. Faltava permitir
a inspeção do conteúdo dos documentos, sem introduzir upload real, storage remoto ou
qualquer chamada externa.

## Decisão

- Foi adicionado um **visualizador mock** integrado à rota atual, sem criar nenhuma nova
  rota. A implementação vive em `src/features/documents/DocumentViewerDialog.tsx`.
- As ações **Visualizar conteúdo** e **Visualizar versão** são acessíveis:
  - pela lista de documentos (botão em cada linha);
  - pelo detalhe do documento (botão principal);
  - pelo item de cada versão no histórico (`Visualizar versão`).
- O visualizador oferece: página anterior, próxima página, indicador “Página X de Y”,
  miniaturas, zoom mais, zoom menos, percentual do zoom, ajustar à largura, rotação em
  incrementos de 90°, tela cheia dentro do aplicativo, fechar e restauração de foco ao
  elemento que o abriu.
- Prévias por tipo:
  - **PDF/DOC/DOCX/TXT** → páginas textuais demonstrativas (3 a 8 páginas);
  - **XLS/XLSX/CSV** → grade demonstrativa;
  - **JPG/JPEG/PNG/GIF/WEBP** → imagem demonstrativa (gradiente determinístico);
  - **áudio (MP3/WAV/OGG/M4A)** → player visual mock com waveform;
  - **vídeo (MP4/MOV/WEBM/MKV)** → player visual mock com duração fictícia;
  - demais formatos → estado explícito **“Formato sem prévia”**.
- Todo conteúdo é **determinístico** e derivado do par `(documentId, versionId)` por
  hash FNV-1a + PRNG Mulberry32. É proibido usar `Math.random`, `crypto.randomUUID`
  ou `Date.now` para gerar prévia.
- Estados apresentados: **Preparando visualização…**, **Prévia disponível**, **Formato
  sem prévia**, **Não foi possível preparar a visualização**, **Você está offline**,
  **Sem permissão** e **Tentar novamente**.
- Toda prévia carrega o aviso obrigatório: **“Prévia demonstrativa. O arquivo real não
  está armazenado nesta etapa.”**

## Fora de escopo

- Não há armazenamento, upload, download, backend ou chamada externa.
- Não há alteração de versões — o visualizador apenas lê.
- Não altera a Agenda.
- Não cria novas rotas: nada em `src/routes/app.documentos.*` além do já existente.

## Preparação para o storage futuro

O visualizador consome o par `(DocumentRecord, DocumentVersion)`. Quando o storage real
for conectado, bastará substituir os builders puros de prévia (`buildTextPage`,
`buildSheetPreview`, `buildImagePreview`, `buildAudioPreview`, `buildVideoPreview`) pelo
provedor equivalente. A superfície do componente e os controles (paginação, zoom,
rotação, tela cheia) permanecem inalterados.

## Acessibilidade

- Toolbar com `role="toolbar"`, botões com `aria-label` explícito.
- Região `aria-live="polite"` anuncia mudanças de página.
- `aria-busy` marca a etapa de preparação da prévia.
- `Escape` sai do modo tela cheia antes de fechar e o foco é restaurado ao elemento que
  abriu o visualizador.
