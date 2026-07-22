import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "@/components/app/UnderConstruction";
import { CONSTRUCTION_MODULES } from "@/lib/app-nav";

const M = CONSTRUCTION_MODULES["/app/configuracoes"];

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({
    meta: [
      { title: `${M.title} — Nexo Pericial 360` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <UnderConstruction {...M} />,
});
