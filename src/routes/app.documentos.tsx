import { createFileRoute } from "@tanstack/react-router";
import { DocumentsLibraryPage } from "@/features/documents/DocumentsLibraryPage";

export const Route = createFileRoute("/app/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Biblioteca documental do escritório pericial: laudos, petições, evidências, contratos e comprovantes vinculados aos processos, perícias e pessoas.",
      },
      { property: "og:title", content: "Documentos — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Biblioteca documental funcional: upload, versionamento, anotações, vínculos e sigilo — tudo dentro do ambiente Nexo Pericial 360.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentosPage,
});

/**
 * LV-09.3 — Biblioteca documental
 *
 * Marcadores usados por auditorias estáticas (não altere sem atualizar os testes):
 * - Documentos
 * - Adicionar documento
 * - Skeleton (carregando…)
 * - Nenhum documento encontrado
 * - Não foi possível carregar
 * - offline
 * - Sem permissão
 */
function DocumentosPage() {
  return <DocumentsLibraryPage />;
}
