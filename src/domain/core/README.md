# `src/domain/core` — Domínio oficial (LV-07.1 + correção LV-07.1.1)

Camada de contratos conceituais do Nexo Pericial 360. **TypeScript puro**:
não depende de React, TanStack, storage, rede ou banco.

## Entidades implementadas

- `Organization` (`kind` usa `WorkMode`)
- `User` — identidade conceitual, **sem** autenticação, e-mail, senha ou token
- `Membership` — vínculo usuário↔organização, `role` usa `Role` do onboarding
- `ProfessionalProfile` (`area` usa `Perfil`)
- `Credential` — organizacionalmente escopada
- `Case` + regra de triagem (`canLeaveDraft`, `getCaseReadinessIssues`)
- `Person` (só pessoa natural)
- `CasePerson`, `Relationship`, `Assignment`

## Enums compartilhados (sem duplicação)

`Perfil`, `WorkMode` e `Role` são definidos uma única vez em
`src/domain/shared/work-context.ts` e reexportados por `onboarding.ts` e por
este módulo. Não existem arrays paralelos:

```ts
ORGANIZATION_KINDS === WORK_MODES  // mesma referência
PROFESSIONAL_AREAS === PERFIS      // mesma referência
```

Aliases `OrganizationKind = WorkMode` e `ProfessionalArea = Perfil`
existem apenas para conveniência de leitura.

## Entidades apenas catalogadas por prefixo de ID

`deadline`, `appointment`, `communication`, `sourceDocument`, `fileVersion`,
`interview`, `recordingSession`, `audioChunk`, `transcript`, `transcriptSegment`,
`copilotSuggestion`, `diligence`, `evidence`, `question`, `questionAnswer`,
`analysisItem`, `contradiction`, `gap`, `package`, `template`, `templateVersion`,
`technicalDocument`, `section`, `approval`, `signature`, `export`, `delivery`,
`feeProposal`, `expense`, `aiExecution`, `auditEvent`, `consentRecord`,
`retentionPolicy`.

## Builder tipado de IDs

`buildDomainId("case", "demo_001")` devolve `CaseId` diretamente; nenhum
`as` é necessário nos fixtures oficiais. Tipos reservados devolvem `string`.

## Invariantes garantidas

1. IDs branded distinguíveis por prefixo — não intercambiáveis em compile-time.
2. Todo contrato carrega `EntityMetadata` estrita (`createdAt`, `updatedAt`, `version ≥ 1`).
3. Toda entidade sob organização carrega `organizationId`.
4. Vínculos de caso carregam `caseId` + `organizationId` consistentes.
5. `Relationship` não aponta para a mesma pessoa nos dois lados.
6. `CasePerson`/`Assignment`/`Credential` exigem existência dos referenciados.
7. `Membership` exige usuário **e** organização existentes.
8. `Credential.organizationId === professionalProfile.organizationId`.
9. Datas ISO inválidas são rejeitadas.
10. Todos os validadores públicos aplicam **allow-list estrita** — qualquer
    propriedade desconhecida (mesmo em `metadata`) é rejeitada.
11. `containsForbiddenKey` é **recursivo** (objeto, array, aninhado) e
    protegido contra ciclos por `WeakSet`. Rejeita `password`, `senha`,
    `token`, `accessToken`, `refreshToken`, `secret`, `apiKey`.
12. `CasePerson` de criança/adolescente exige `restrictedByDefault: true`.

## Regra de saída de `draft`

`canLeaveDraft(readiness)` só devolve `true` quando todos os requisitos de
`CaseReadiness` estão satisfeitos.

## Proteção conceitual de crianças e adolescentes

`Person.ageClassification` ∈ `{adult, child, adolescent, unknown}`.
`CasePerson` de menor sem `restrictedByDefault: true` é rejeitado.
Fixtures não contêm nome, idade, data ou qualquer PII.

## User e Membership

`User` é uma identidade **conceitual**: id, status, rótulo neutro opcional,
metadata. Sem e-mail, senha, token, provedor OAuth, telefone ou CPF.
`Membership` liga um `User` a uma `Organization` com um `Role` do onboarding.

## Compatibilidade com o código antigo

`src/lib/mock/{types,data}.ts` permanecem intactos e continuam alimentando
`/app/*`. `src/domain/onboarding.ts` continua exportando toda sua API
pública anterior (apenas a fonte de `Perfil`/`WorkMode`/`Role` mudou).

## Limites desta microetapa

- Sem repositórios, serviços CRUD ou persistência.
- Sem formulários, rotas ou telas novas.
- Nenhum tipo legado removido.
- Sessão (`nexo:session`) inalterada.

## Proibições

- Sem hooks React nesta camada.
- Sem `localStorage`, `sessionStorage`, `window`, `document`, `fetch`.
- Sem timestamps dinâmicos nos fixtures.
- Sem IDs aleatórios em módulo.
- Sem senha/token/segredo em nenhum contrato.
