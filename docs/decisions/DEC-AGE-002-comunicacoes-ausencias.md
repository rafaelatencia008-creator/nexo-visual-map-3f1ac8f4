# DEC-AGE-002 — Comunicações e ausências (LV-09.2)

## Contexto

A LV-09.2 introduz o registro histórico de comunicações e presença
vinculado a compromissos da Agenda. A entrega foi realizada em duas
subetapas complementares e agora está integralmente concluída.

## Decisões

- **B1** implementou a fundação lógica: entidade `Communication`,
  `CommunicationService` append-only, mocks estáveis em memória, guards
  de permissão (`communication.read`, `communication.list`,
  `communication.create`) e seed de 8 registros cobrindo todos os
  `kinds` novos.
- **B2** implementou a interface visual: helpers puros de formulário
  (`communication-form.ts`), rótulos oficiais em português
  (`communication-labels.ts`), diálogo único `AgendaCommunicationDialog`
  com cinco presets e a seção compartilhada
  `AgendaCommunicationsSection` integrada ao `AgendaItemDetailContent`.
- **Comunicação é append-only.** Não há `update` nem `remove` — apenas
  `create`, `getById` e `listByAppointment`.
- A funcionalidade pertence **exclusivamente ao compromisso**: a seção
  só é renderizada quando `detail.loaded.type === "appointment"`.
- **Página e diálogo compartilham o mesmo `AgendaItemDetailContent`.**
  A integração da seção existe em um único lugar; nem
  `AgendaItemDetailDialog` nem `/app/agenda/$appointmentId` renderizam a
  seção diretamente.
- **Não existe** rota `/app/comunicacoes`. Comunicações são um subrecurso
  do compromisso e não uma área de navegação própria.
- As **cinco ações** (`contact`, `confirm`, `absence`, `cancellation`,
  `reschedule_request`) são apenas **registros históricos**.
- **Nenhuma ação altera automaticamente o compromisso.** Ausência,
  cancelamento e pedido de reagendamento não chamam
  `appointments.update`, `appointments.changeStatus` ou
  `appointments.remove`; não alteram `startsAt`, `endsAt`, `status` nem
  `metadata.version`.
- **Nenhuma comunicação real é enviada.** Nenhuma ligação, SMS,
  WhatsApp, e-mail, notificação ou requisição externa é disparada.
- **Não existe backend, banco ou storage** nesta etapa. Todo o histórico
  permanece na memória do `MockDomainEnvironment`.
- **LV-09.2 está concluída.**

## Consequências

- O histórico é sempre carregado pelo serviço oficial, com paginação
  completa, teto de páginas seguro, detecção de cursor repetido e
  proteção contra respostas obsoletas.
- Documentos permanece reservado para a LV-09.3.
- Qualquer futura mudança de comportamento (efeitos automáticos no
  compromisso, envio real, storage) exigirá nova decisão registrada.
