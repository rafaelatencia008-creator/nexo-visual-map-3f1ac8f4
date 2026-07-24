/**
 * LV-09.1B.6.3A — Rota pai canônica da Agenda.
 *
 * Este layout hospeda o `AgendaRouteStateProvider` compartilhado e renderiza
 * o `<Outlet />` para as rotas filhas canônicas:
 *
 *  - `/app/agenda/`               → calendário (app.agenda.index.tsx)
 *  - `/app/agenda/novo`           → criação de prazo/compromisso
 *  - `/app/agenda/$appointmentId` → detalhe de compromisso
 *
 * O detalhe/edição de prazo permanece em diálogo sobre o calendário, porque
 * a documentação v3.2 não define rota canônica para prazos individuais.
 *
 * Ver `docs/decisions/DEC-AGE-001-rotas-canonicas.md`.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AgendaRouteStateProvider } from "@/features/agenda/route-state";

export const Route = createFileRoute("/app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Agenda profissional com visão diária, semanal e mensal de prazos e compromissos.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaLayout,
});

function AgendaLayout() {
  return (
    <AgendaRouteStateProvider>
      <Outlet />
    </AgendaRouteStateProvider>
  );
}
