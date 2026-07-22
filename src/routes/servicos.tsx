import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Recursos — Nexo Pericial 360" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/recursos", replace: true });
  },
  component: () => null,
});
