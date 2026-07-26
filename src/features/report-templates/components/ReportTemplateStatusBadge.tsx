import { Badge } from "@/components/ui/badge";
import {
  REPORT_TEMPLATE_STATUS_LABEL,
  type ReportTemplateStatus,
} from "../report-template-types";

const CLASSES: Readonly<Record<ReportTemplateStatus, string>> = {
  rascunho: "bg-amber-100 text-amber-900 border-amber-200",
  publicado: "bg-emerald-100 text-emerald-900 border-emerald-200",
  arquivado: "bg-muted text-muted-foreground",
};

export function ReportTemplateStatusBadge({
  status,
}: {
  status: ReportTemplateStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={CLASSES[status]}
      aria-label={`Status: ${REPORT_TEMPLATE_STATUS_LABEL[status]}`}
    >
      {REPORT_TEMPLATE_STATUS_LABEL[status]}
    </Badge>
  );
}
