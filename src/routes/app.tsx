import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { BottomNav } from "@/components/app/BottomNav";
import { AuthGate } from "@/components/app/AuthGate";

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
    <AuthGate>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-h-screen bg-muted/20">
          <AppTopbar />
          {/* pb-24 sm:pb-8 evita que a barra inferior cubra conteúdo no celular */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-8 lg:p-8 lg:pb-10">
            <Outlet />
          </main>
          <BottomNav />
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
