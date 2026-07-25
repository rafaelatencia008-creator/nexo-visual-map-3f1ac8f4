# DEC-QUE-001 — Quesitos e evidências (mock)

Status: aceito
Data: 2026-07-25
Autor: Equipe Nexo Pericial 360

## Contexto

A LV-12 entrega a central de **quesitos e evidências** completamente client-side,
sem backend, banco de dados ou serviço de IA. O módulo integra Documentos (LV-09.3–5),
Entrevistas e diligências (LV-11) apenas por **leitura**, sem alterá-los.

## Decisão

1. **Domínio isolado** em `src/features/questions-evidence/`, com contratos próprios
   (`question-types.ts`) e store determinístico em memória (`question-mock-store.ts`).
2. **Cobertura determinística** (`question-coverage.ts`): pontuação 0–100 e faixas
   `insuficiente | baixa | parcial | boa | completa`. Nenhuma heurística de IA.
3. **Adaptadores somente-leitura** para Documentos, Entrevistas e Diligências
   (`evidence-adapters.ts`). É proibido mutar aqueles domínios a partir daqui.
4. **Regras de resposta**: só é possível marcar como *Respondido* quando existe
   resposta técnica preenchida, não há lacunas obrigatórias abertas e eventuais
   divergências determinantes foram analisadas.
5. **Preparação para laudo é mock**: gera bloco textual copiável e mantém marca
   `readyForReport`. A integração real virá no módulo de Laudos.
6. **Origem obrigatória**: quesitos de origem `assistente_tecnico` e `outro` exigem
   identificação livre.
7. **Auditoria interna**: cada mutação registra evento imutável em `history`.
8. **UI**: TanStack Router, shadcn/ui, sem novas dependências. Rota canônica
   `/app/quesitos` deixa o modo "Em construção".

## Consequências

* Cobertura, lacunas e divergências continuam previsíveis e testáveis.
* Documentos e Entrevistas permanecem canônicos das próprias fontes.
* Substituir o mock por backend real, no futuro, exige apenas trocar
  `question-mock-store.ts` e os adaptadores, mantendo os contratos.
