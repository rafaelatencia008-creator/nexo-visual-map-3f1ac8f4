import { Lock, Shield, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_CONFIDENTIALITY_LABEL,
  DOCUMENT_CONFIDENTIALITY_SHORT,
  DOCUMENT_STATUS_LABEL,
} from "./document-labels";
import { formatDeadlineText } from "./document-form";
import type { DocumentRecord } from "./document-types";
import {
  getCaseNumberLabel,
  getExpertiseLabel,
  getPersonLabels,
} from "./document-filters";

export interface DocumentDetailDialogProps {
  open: boolean;
  document: DocumentRecord | null;
  referenceIsoDate: string;
  onClose: () => void;
  onNewVersion: () => void;
  onAddAnnotation: () => void;
  onView?: (versionId?: string) => void;
}

function fmt(iso: string): string {
  return format(new Date(iso), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
}

function ConfIcon({ level }: { level: DocumentRecord["confidentiality"] }) {
  const Icon = level === "sigiloso" ? Lock : level === "restrito" ? Shield : Globe;
  return <Icon className="h-3.5 w-3.5" aria-hidden />;
}

export function DocumentDetailDialog({
  open,
  document,
  referenceIsoDate,
  onClose,
  onNewVersion,
  onAddAnnotation,
  onView,
}: DocumentDetailDialogProps) {
  if (!document) return null;
  const caseNumber = getCaseNumberLabel(document.caseId);
  const expertise = getExpertiseLabel(document.expertiseId);
  const persons = getPersonLabels(document.personIds);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words">{document.name}</DialogTitle>
          <DialogDescription>
            {DOCUMENT_CATEGORY_LABEL[document.category]} · Versão atual v{document.currentVersion}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{DOCUMENT_STATUS_LABEL[document.status]}</Badge>
          <Badge variant="outline" className="gap-1">
            <ConfIcon level={document.confidentiality} />
            {DOCUMENT_CONFIDENTIALITY_SHORT[document.confidentiality]}
          </Badge>
          <Badge variant="outline">
            {formatDeadlineText(document.deadlineAt, referenceIsoDate)}
          </Badge>
        </div>

        <section className="space-y-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
            Informações
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Descrição</dt>
              <dd className="break-words">{document.description || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Sigilo</dt>
              <dd>{DOCUMENT_CONFIDENTIALITY_LABEL[document.confidentiality]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Processo vinculado</dt>
              <dd>{caseNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Perícia vinculada</dt>
              <dd>{expertise || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Pessoas vinculadas</dt>
              <dd>{persons.length > 0 ? persons.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Responsável</dt>
              <dd>{document.responsibleLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Criado em</dt>
              <dd>{fmt(document.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Atualizado em</dt>
              <dd>{fmt(document.updatedAt)}</dd>
            </div>
          </dl>
          {document.confidentiality === "sigiloso" ? (
            <p className="text-xs text-muted-foreground">
              Documento sigiloso — o acesso real será controlado por permissões quando o backend
              for conectado.
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
              Versões
            </h3>
            <div className="flex flex-wrap gap-2">
              {onView ? (
                <Button size="sm" variant="outline" onClick={() => onView()}>
                  Visualizar conteúdo
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={onNewVersion}>
                Adicionar nova versão
              </Button>
            </div>
          </div>
          <ul className="space-y-2">
            {document.versions.map((v) => (
              <li
                key={v.id}
                className={`rounded-md border p-3 text-sm ${
                  v.version === document.currentVersion ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    v{v.version}
                    {v.version === document.currentVersion ? (
                      <span className="ml-2 text-xs text-primary">atual</span>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-xs">{fmt(v.createdAt)}</p>
                    {onView ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(v.id)}
                        aria-label={`Visualizar versão v${v.version}`}
                      >
                        Visualizar versão
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="text-muted-foreground text-xs break-words">
                  {v.fileName} · {v.fileSizeLabel} · {v.mimeType}
                </p>
                {v.description ? (
                  <p className="text-xs break-words">{v.description}</p>
                ) : null}
                <p className="text-muted-foreground text-xs">Criado por {v.createdByLabel}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
              Anotações
            </h3>
            <Button size="sm" variant="outline" onClick={onAddAnnotation}>
              Adicionar anotação
            </Button>
          </div>
          {document.annotations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma anotação registrada.</p>
          ) : (
            <ul className="space-y-2">
              {document.annotations.map((a) => (
                <li key={a.id} className="rounded-md border p-3 text-sm">
                  <p className="break-words">{a.text}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {a.authorLabel} · {fmt(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
