# DEC-ENT-001 — Entrevistas e diligências (mock)

## Contexto

A LV-11 remove o módulo "Entrevistas e diligências" do estado de "em
construção" e entrega uma experiência funcional dentro do ambiente mock
atual, sem qualquer conexão de backend, IA real ou transcrição automática.

## Decisões

1. A rota `/app/entrevistas` deixa de renderizar `UnderConstruction` e
   passa a renderizar `InterviewsDiligencesPage` em uso normal. Continua
   respondendo com `AudioSpikeLab` quando acessada com `?demo=audio-spike`
   (compatibilidade com a LV-10). Nenhuma rota nova é criada.
2. A entrada de menu perde a flag `construction: true` e a chave
   `/app/entrevistas` sai de `CONSTRUCTION_MODULES`. O selo "Em breve"
   deixa de existir para o módulo.
3. Entrevistas e diligências convivem no mesmo módulo com abas e um
   modelo unificado de listagem, filtros e pesquisa insensível a
   acentos/maiúsculas.
4. Os dados residem apenas em memória durante a sessão, com seed
   determinístico (8 entrevistas + 6 diligências, situações variadas).
5. O motor de gravação client-side da LV-10 é integrado por composição
   dentro do workspace de entrevista, sem duplicação de código. O áudio
   permanece somente em memória e é descartado ao encerrar a sessão.
6. A transcrição é totalmente manual: usuário adiciona blocos com
   horário/pessoa/texto, com aviso explícito de que "nenhuma IA está
   ativa nesta etapa".
7. Fotos das diligências utilizam `URL.createObjectURL` e são
   descartadas com `revokeObjectURL` no cleanup e ao remover.
8. A localização é opcional e obtida somente após clique explícito
   ("Usar localização do dispositivo"), tratando permissão negada,
   indisponibilidade, timeout e ausência da API `Geolocation`.
9. Nenhuma nova rota, nenhuma nova permissão, nenhum novo endpoint. O
   `routeTree.gen.ts` permanece intacto.
10. Preparação para etapas futuras: entidades e labels estão isoladas em
    `src/features/interviews/`, prontas para portabilidade para o
    domínio oficial quando a LV correspondente for aprovada.

## Escopo proibido explícito

- Sem Supabase, banco, storage remoto, API externa ou upload real.
- Sem transcrição automática, reconhecimento de voz ou resumo por IA.
- Sem exportação, assinatura digital ou autenticação real.
- Sem alteração dos módulos `documents/` e `agenda/`.
- LV-12 permanece sem início.

## Consequências

- Após recarregar a página, todos os registros criados no seed voltam
  ao estado inicial. Áudio, transcrição e fotos criados durante a
  sessão são perdidos. O aviso ao usuário é explícito.
- A funcionalidade é utilizável em desktop e mobile, com o gravador da
  LV-10 preservando seu contrato público.
