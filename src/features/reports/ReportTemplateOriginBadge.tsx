/**
 * LV-18.5 — Badge de rastreabilidade de origem do modelo.
 * Exibição somente-leitura. Não permite edição.
 */
import { FileType2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportTemplateOrigin } from "./report-types";

export function ReportTemplateOriginBadge({
  origin,
  compact = false,
}: {
  readonly origin: ReportTemplateOrigin;
  readonly compact?: boolean;
}) {
  const label = `Criado a partir do modelo “${origin.templateName}”, versão ${origin.templateVersionNumber}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="gap-1 font-normal"
            aria-label={label}
          >
            <FileType2 className="h-3 w-3" aria-hidden />
            {compact ? (
              <span>Modelo v{origin.templateVersionNumber}</span>
            ) : (
              <span className="truncate max-w-[16rem]">{label}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p className="font-medium">{origin.templateName}</p>
          <p>Versão {origin.templateVersionNumber}</p>
          <p>Especialidade: {origin.templateSpecialty}</p>
          <p>Aplicado em: {new Date(origin.appliedAt).toLocaleString("pt-BR")}</p>
          <p>Aplicado por: {origin.appliedBy}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
