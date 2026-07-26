import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ReportTemplateHistoryEvent } from "../report-template-history-store";

const ACTION_LABEL: Record<string, string> = {
  template_created: "Modelo criado",
  template_metadata_updated: "Metadados atualizados",
  template_duplicated: "Modelo duplicado",
  template_archived: "Arquivado",
  template_reactivated: "Reativado",
  template_published: "Publicado",
  template_returned_to_draft: "Retornado a rascunho",
  template_validated: "Validação executada",
  template_publication_blocked: "Publicação bloqueada",
  template_transition_blocked: "Transição bloqueada",
  template_operation_blocked: "Operação bloqueada",
  section_added: "Seção adicionada",
  section_updated: "Seção atualizada",
  section_removed: "Seção removida",
  section_reordered: "Seção reordenada",
  block_added: "Bloco adicionado",
  block_updated: "Bloco atualizado",
  block_removed: "Bloco removido",
  block_reordered: "Bloco reordenado",
  variable_added: "Variável adicionada",
  variable_updated: "Variável atualizada",
  variable_removed: "Variável removida",
  version_created: "Versão criada",
  template_exported: "Modelo exportado",
  template_import_previewed: "Importação — preview",
  template_imported: "Importação concluída",
  template_import_blocked: "Importação bloqueada",
  template_import_failed: "Importação falhou",
};

const RESULT_STYLE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  blocked: "bg-amber-100 text-amber-800 border-amber-200",
  failure: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ReportTemplateHistoryPanel({
  events,
}: {
  events: readonly ReportTemplateHistoryEvent[];
}) {
  const ordered = [...events].reverse(); // mais recentes primeiro

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico ({events.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem eventos.</p>
        )}
        <ScrollArea className="max-h-96 pr-3">
          <ul className="space-y-2">
            {ordered.map((e) => (
              <li key={e.id} className="rounded border p-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {ACTION_LABEL[e.action] ?? e.action}
                    </p>
                    <p className="text-muted-foreground">{e.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={RESULT_STYLE[e.result] ?? ""}
                    aria-label={`Resultado: ${e.result}`}
                  >
                    {e.result === "success"
                      ? "sucesso"
                      : e.result === "blocked"
                        ? "bloqueado"
                        : "falha"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.actor}
                </p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
