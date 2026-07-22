import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "@/components/app/UnderConstruction";
import { CONSTRUCTION_MODULES } from "@/lib/app-nav";

const M = CONSTRUCTION_MODULES["/app/documentos"];

export const Route = createFileRoute("/app/documentos")({
  head: () => ({
    meta: [
      { title: `${M.title} — Nexo Pericial 360` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <UnderConstruction {...M} />,
});
