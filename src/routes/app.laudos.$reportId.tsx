import { createFileRoute } from "@tanstack/react-router";
import { ReportWorkspacePage } from "@/features/reports/workspace/ReportWorkspacePage";

export const Route = createFileRoute("/app/laudos/$reportId")({
  head: () => ({
    meta: [
      { title: "Workspace do laudo — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  const { reportId } = Route.useParams();
  return <ReportWorkspacePage reportId={reportId} />;
}
