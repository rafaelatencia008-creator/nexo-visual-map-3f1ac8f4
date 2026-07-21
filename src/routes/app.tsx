import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Painel — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
