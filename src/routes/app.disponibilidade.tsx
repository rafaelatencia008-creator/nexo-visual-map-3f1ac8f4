/**
 * LV-09.1B.7.2 — Rota canônica consultiva de disponibilidade.
 *
 * Rota fina: obtém `environment`/`context` via `useMockDomain` e monta
 * `AgendaAvailabilityContent`. Não implementa paginação, validação,
 * regra de conflito nem chama o serviço de compromissos diretamente.
 */

import { createFileRoute } from "@tanstack/react-router";
import { AgendaAvailabilityContent } from "@/features/agenda/AgendaAvailabilityContent";
import { useMockDomain } from "@/components/app/MockDomainProvider";

export const Route = createFileRoute("/app/disponibilidade")({
  head: () => ({
    meta: [
      { title: "Disponibilidade — Nexo Pericial 360" },
      {
        name: "description",
        content: "Consulta de conflitos de horário para compromissos da agenda.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaAvailabilityPage,
});

function AgendaAvailabilityPage() {
  const { environment, context } = useMockDomain();
  return <AgendaAvailabilityContent environment={environment} context={context} />;
}
