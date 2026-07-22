import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import { ProcessCreateForm } from "@/features/processos/ProcessCreateForm";
import {
  mapCreateCaseError,
  type ProcessCreatePublicError,
} from "@/features/processos/process-create-model";
import type { CreateCaseInput } from "@/domain/services/inputs";

export const Route = createFileRoute("/app/processos/novo")({
  head: () => ({
    meta: [
      { title: "Novo processo — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Cadastre as informações iniciais para começar a organizar o trabalho pericial.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NovoProcessoPage,
});

function NovoProcessoPage() {
  const { environment, context } = useMockDomain();
  const navigate = useNavigate();

  const goToList = () => {
    void navigate({ to: "/app/processos", replace: true });
  };

  const handleSubmit = async (
    input: CreateCaseInput,
  ): Promise<ProcessCreatePublicError | null> => {
    const result = await environment.services.cases.create(context, input);
    if (!result.ok) {
      return mapCreateCaseError(result.error);
    }
    toast.success("Processo criado", {
      description: "O processo foi adicionado como rascunho.",
    });
    goToList();
    return null;
  };

  return (
    <div className="max-w-3xl">
      <ProcessCreateForm onSubmit={handleSubmit} onCancel={goToList} />
    </div>
  );
}
