# DEC-AUD-001 — Spike técnico de gravação longa de áudio (LV-10)

## Objetivo

Provar tecnicamente, dentro do ambiente exclusivamente frontend do Nexo
Pericial 360, a viabilidade de um motor client-side de gravação longa de
áudio para uso futuro no módulo **Entrevistas e diligências** (LV-11+).

Escopo estritamente técnico: não implementa lista, cadastro, roteiros,
entrevistados, transcrição, geolocalização ou qualquer parte funcional do
módulo final. Não introduz backend, IA, transcrição, storage remoto,
upload/download nem nova rota.

## APIs utilizadas

- `navigator.mediaDevices.getUserMedia`
- `navigator.mediaDevices.enumerateDevices`
- `navigator.mediaDevices.addEventListener("devicechange", …)`
- `MediaRecorder` e `MediaRecorder.isTypeSupported`
- `AudioContext` + `AnalyserNode` (medidor)
- `MediaStreamTrack.addEventListener("ended", …)` (queda de dispositivo)
- `URL.createObjectURL` / `URL.revokeObjectURL` (prévia local)
- `performance.now()` (tempo monotônico)
- `beforeunload` (aviso ao sair com gravação pendente)

Nenhuma biblioteca externa de gravação foi adicionada.

## Máquina de estados

Estados: `unsupported`, `idle`, `requesting_permission`, `ready`,
`recording`, `paused`, `stopping`, `completed`, `recovering`, `error`.

Todas as transições são puras (`audio-state-machine.ts`) e bloqueiam
combinações inválidas: iniciar sem permissão, iniciar duas vezes, pausar
fora de `recording`, retomar fora de `paused`, encerrar mais de uma vez,
etc. A UI adicionalmente confirma a troca de microfone durante gravação e
o descarte de dados.

## MIME types preferenciais

Prioridade avaliada via `MediaRecorder.isTypeSupported` na ordem:

1. `audio/webm;codecs=opus`
2. `audio/webm`
3. `audio/mp4`
4. `audio/ogg;codecs=opus`

O primeiro suportado é adotado. O painel de diagnóstico expõe o MIME e o
codec efetivamente escolhidos no ambiente atual, sem afirmar
compatibilidade universal.

## Timeslice e segmentos

- `timeslice`: 1000 ms (`MediaRecorder.start(1000)`), gerando um bloco por
  segundo.
- `segmentDurationMs`: 60 000 ms no laboratório.
- `overlapMs`: 2 000 ms.

O `MediaRecorder` não é reiniciado por segmento. A segmentação é feita em
memória por um reducer puro (`audio-segmenter.ts`) que:

- acumula blocos até atingir a duração alvo;
- fecha o segmento com todos os blocos acumulados;
- reutiliza os blocos cujo `endedAtMs > segmentEnd - overlapMs` como base
  do próximo segmento, produzindo sobreposição aproximada de 2 s;
- preserva ordem, evita duplicação e emite um último segmento menor
  marcado como `incomplete`.

## Fila em memória

`audio-queue.ts` mantém estados `captured | queued | processing | ready |
failed | retrying | discarded | incomplete`. Como não existe backend,
“processar” significa validar Blob, calcular metadados e preparar uma URL
local (`URL.createObjectURL`) para reprodução. A fila impede
processamento duplicado, permite `retry` explícito e descarte individual
ou total.

## Recuperação dentro da mesma sessão

Quando a faixa de áudio emite `ended` (microfone desconectado, permissão
revogada, sistema operacional interrompeu o dispositivo), a máquina entra
em `recovering`. A ação **Tentar recuperar** solicita novamente
`getUserMedia`, preserva os segmentos anteriores, incrementa
`interruptionCount` e retoma a captura em um novo segmento.

Recuperação após recarregar a página **não** é suportada e essa
limitação é exibida explicitamente no laboratório.

## Cleanup de recursos

Ao desmontar o componente, descartar dados ou reiniciar:

- `MediaRecorder.stop()` quando ativo;
- todas as tracks do `MediaStream` são paradas via `track.stop()`;
- `AnalyserNode` é desconectado, `AudioContext` é fechado, `RAF` cancelado;
- todas as URLs de prévia são revogadas com `URL.revokeObjectURL`;
- listeners de `devicechange` e `beforeunload` são removidos.

## Riscos identificados

- **Safari / iOS**: `MediaRecorder` historicamente ausente ou limitado;
  suporte a `AudioContext` requer gesto do usuário; `audio/webm` pode não
  ser suportado, exigindo `audio/mp4`. O painel apresenta o resultado
  real do ambiente.
- **Firefox**: sem suporte a `MediaRecorder.pause` em versões antigas;
  o flag `supportsPause` é derivado dinamicamente.
- **Android + navegador em segundo plano**: pode suspender a captura;
  precisa validação física, marcada no checklist manual.
- **Perda por reload**: dados residem apenas em `Blob`s em memória; sem
  IndexedDB nesta etapa.

## Validação física necessária

O laboratório inclui checklist manual (Android/iOS/desktop, microfones
internos/USB/Bluetooth, bloqueio de tela, troca de app, desconexão,
gravação prolongada). Nenhum dispositivo é marcado como aprovado sem
teste físico.

## Pendências para LV-11

- Persistência dos segmentos entre sessões (IndexedDB ou similar).
- Fluxo completo de Entrevistas e diligências (roteiros, entrevistados,
  diligências, mídias, relatório de diligência).
- Estratégia de upload/transcrição (proibida nesta etapa).
- Fixação de MIME type de fallback recomendável por plataforma após
  medição em campo.

## Ausência de backend e transcrição

Reafirma-se: **nenhum backend** foi consumido, **nenhum áudio** trafegou
pela rede, **nenhuma IA/transcrição** foi executada. O motor é
inteiramente client-side e temporário.
