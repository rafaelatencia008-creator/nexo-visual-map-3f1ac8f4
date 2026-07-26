import { createFileRoute } from "@tanstack/react-router";
import { ReportTemplatesPage } from "@/pages/app/ReportTemplatesPage";

export const Route = createFileRoute("/app/modelos")({
  head: () => ({
    meta: [
      { title: "Modelos de laudo — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportTemplatesPage,
});
