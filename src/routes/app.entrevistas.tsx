import { createFileRoute } from "@tanstack/react-router";
import { AudioSpikeLab } from "@/features/audio-spike/AudioSpikeLab";
import { InterviewsDiligencesPage } from "@/features/interviews/InterviewsDiligencesPage";

type EntrevistasSearch = { demo?: string };

export const Route = createFileRoute("/app/entrevistas")({
  validateSearch: (search: Record<string, unknown>): EntrevistasSearch => ({
    demo: typeof search.demo === "string" ? search.demo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrevistas e diligências — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Registre entrevistas, vistorias e diligências com roteiros, anotações, transcrição manual e mídias.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EntrevistasRouteComponent,
});

function EntrevistasRouteComponent() {
  const { demo } = Route.useSearch();
  if (demo === "audio-spike") return <AudioSpikeLab />;
  return <InterviewsDiligencesPage />;
}
