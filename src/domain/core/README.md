# `src/domain/core` — Domínio oficial (LV-07.1)

Camada de contratos conceituais do Nexo Pericial 360. É **TypeScript puro**:
não depende de React, TanStack, storage, rede ou banco.

## Finalidade

Fundação tipada e testável antes de continuar construindo telas
operacionais. Substitui progressivamente os tipos simplificados de
`src/lib/mock/types.ts` (que permanecem como camada legada até LV-07.3/LV-08).

## Entidades implementadas

- `Organization`
- `ProfessionalProfile`, `Credential`
- `Case` + regra de triagem (`canLeaveDraft`, `getCaseReadinessIssues`)
- `Person` (só pessoa natural; PJ NÃO é `Person`)
- `CasePerson`, `Relationship`, `Assignment`

## Entidades apenas catalogadas por prefixo de ID

`deadline`, `appointment`, `communication`, `sourceDocument`, `fileVersion`,
`interview`, `recordingSession`, `audioChunk`, `transcript`, `transcriptSegment`,
`copilotSuggestion`, `diligence`, `evidence`, `question`, `questionAnswer`,
`analysisItem`, `contradiction`, `gap`, `package`, `template`, `templateVersion`,
`technicalDocument`, `section`, `approval`, `signature`, `export`, `delivery`,
`feeProposal`, `expense`, `aiExecution`, `auditEvent`, `consentRecord`,
`retentionPolicy`. Contratos completos virão em microetapas futuras.

## Domínio oficial × tipos legados

| Legado (`src/lib/mock/types.ts`) | Oficial (`src/domain/core`)              | Nota                                             |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `Cliente` (PF/PJ misturados)     | `Person` (só PF) ou entidade futura (PJ) | Migração real em LV-08. Nada é convertido agora. |
| `Perito`                         | `ProfessionalProfile` + `Assignment`     | Cadastro global ≠ atuação no caso.               |
| `Processo`                       | `Case`                                   | Migração em LV-08.                               |
| `Perícia`                        | Ainda por reconciliar                    | Sobreposição com `Case` a resolver.              |

## Invariantes garantidas pelos validadores

1. IDs são branded e distinguíveis por prefixo.
2. Toda entidade operacional carrega `EntityMetadata` (createdAt, updatedAt, version ≥ 1).
3. Toda entidade sob organização carrega `organizationId`.
4. Todo vínculo de caso carrega `caseId` + `organizationId` consistentes com o caso.
5. Uma `Relationship` não pode apontar para a mesma pessoa nos dois lados.
6. `CasePerson` só é aceito se pessoa e caso existirem.
7. `Assignment` só é aceito se perfil profissional e caso existirem.
8. IDs de tipos diferentes NÃO são intercambiáveis (compile-time via brand + runtime via prefixo).
9. Datas ISO inválidas são rejeitadas.
10. Chaves `password`, `senha`, `token`, `secret`, `accessToken`, `refreshToken`, `apiKey` são rejeitadas em qualquer entrada.
11. `CasePerson` de criança/adolescente exige `restrictedByDefault: true`.

## Regra de saída de `draft`

Um `Case` só sai de `draft` quando **todos** os requisitos de
`CaseReadiness` estiverem satisfeitos: papel profissional definido, objeto
definido, prazo revisado, sigilo revisado, conflito de interesse revisado.
`canLeaveDraft(readiness)` devolve `false` enquanto houver pendências.

## Proteção conceitual de crianças e adolescentes

- Classificação por `ageClassification: "adult" | "child" | "adolescent" | "unknown"`.
- `CasePerson` de menor com `restrictedByDefault: false` é **rejeitado** pelo validador.
- Fixtures não contêm nome real, data de nascimento, nem qualquer PII.

## Limites desta microetapa (LV-07.1)

- Sem repositórios, serviços CRUD ou persistência.
- Sem formulários, rotas ou telas novas.
- Nenhum tipo legado foi removido.
- Nenhuma rota foi renomeada.
- Sessão (`nexo:session`) não foi alterada.

## O que vem em LV-07.2 (referência, não implementar aqui)

- Interfaces conceituais de serviços (queries + comandos) sobre o domínio.
- Formatadores e projeções para camada visual.
- Continua sem banco.

## Proibições

- Não importar hooks React aqui.
- Não usar `localStorage`, `sessionStorage`, `window`, `document`, `fetch`.
- Não criar timestamps dinâmicos nos fixtures.
- Não gerar IDs aleatórios em módulo (só via `buildDomainId` para fixtures).
- Não armazenar senha/token/segredo em nenhum contrato.
