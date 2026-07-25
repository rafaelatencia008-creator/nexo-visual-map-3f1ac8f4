import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "@/components/app/UnderConstruction";
import { CONSTRUCTION_MODULES } from "@/lib/app-nav";
import { AudioSpikeLab } from "@/features/audio-spike/AudioSpikeLab";

const M = CONSTRUCTION_MODULES["/app/entrevistas"];

type EntrevistasSearch = { demo?: string };

export const Route = createFileRoute("/app/entrevistas")({
  validateSearch: (search: Record<string, unknown>): EntrevistasSearch => ({
    demo: typeof search.demo === "string" ? search.demo : undefined,
  }),
  head: () => ({
    meta: [
      { title: `${M.title} — Nexo Pericial 360` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EntrevistasRouteComponent,
});

function EntrevistasRouteComponent() {
  const { demo } = Route.useSearch();
  const isAudioSpike = demo === "audio-spike";
  return isAudioSpike ? <AudioSpikeLab /> : <UnderConstruction {...M} />;
}
