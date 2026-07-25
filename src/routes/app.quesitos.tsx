import { createFileRoute } from "@tanstack/react-router";
import { QuestionsEvidencePage } from "@/features/questions-evidence/QuestionsEvidencePage";

export const Route = createFileRoute("/app/quesitos")({
  head: () => ({
    meta: [
      { title: "Quesitos e evidências — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Central de quesitos e evidências: cadastro por origem, vínculo a documentos, entrevistas e diligências, análise de cobertura e preparação para o laudo.",
      },
      { property: "og:title", content: "Quesitos e evidências — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Organize perguntas técnicas, vincule provas e acompanhe a cobertura da perícia dentro do Nexo Pericial 360.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QuestionsEvidencePage,
});
