import { useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processos, pericias } from "@/lib/mock/data";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_CONFIDENTIALITIES,
  DOCUMENT_CONFIDENTIALITY_LABEL,
} from "./document-labels";
import {
  formatFileSize,
  validateFileMeta,
  type DocumentFileMeta,
  type DocumentFormInput,
} from "./document-form";
import type {
  DocumentCategory,
  DocumentConfidentiality,
} from "./document-types";

interface BatchItem {
  key: string;
  file: DocumentFileMeta;
  name: string;
  category: DocumentCategory | "";
  error?: string;
}

export interface DocumentBatchDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (inputs: DocumentFormInput[]) => void;
}

export function DocumentBatchDialog({ open, onClose, onConfirm }: DocumentBatchDialogProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [commonCategory, setCommonCategory] = useState<DocumentCategory | "">("");
  const [commonConfidentiality, setCommonConfidentiality] =
    useState<DocumentConfidentiality | "">("");
  const [commonCaseId, setCommonCaseId] = useState("");
  const [commonExpertiseId, setCommonExpertiseId] = useState("");
  const [commonDeadline, setCommonDeadline] = useState("");
  const [commonResponsible, setCommonResponsible] = useState("");
  const savingRef = useRef(false);
  const keyCounter = useRef(0);

  const validCount = useMemo(() => items.filter((i) => !i.error).length, [items]);
  const hasInvalid = items.some((i) => !!i.error);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const next: BatchItem[] = files.map((f) => {
      keyCounter.current += 1;
      const meta: DocumentFileMeta = {
        fileName: f.name,
        sizeBytes: f.size,
        mimeType: f.type || "application/octet-stream",
      };
      const err = validateFileMeta(meta);
      return {
        key: `batch-${keyCounter.current}`,
        file: meta,
        name: f.name.replace(/\.[^.]+$/, ""),
        category: "",
        error: err,
      };
    });
    setItems((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const remove = (key: string) =>
    setItems((prev) => prev.filter((i) => i.key !== key));

  const patchItem = (key: string, patch: Partial<BatchItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const reset = () => {
    setItems([]);
    setCommonCategory("");
    setCommonConfidentiality("");
    setCommonCaseId("");
    setCommonExpertiseId("");
    setCommonDeadline("");
    setCommonResponsible("");
    savingRef.current = false;
  };

  const handleConfirm = () => {
    if (savingRef.current) return;
    if (items.length === 0 || hasInvalid) return;
    if (!commonCategory || !commonConfidentiality) return;
    savingRef.current = true;
    const inputs: DocumentFormInput[] = items.map((i) => ({
      file: i.file,
      name: i.name.trim() || i.file.fileName,
      category: (i.category || commonCategory) as DocumentCategory,
      confidentiality: commonConfidentiality as DocumentConfidentiality,
      caseId: commonCaseId || undefined,
      expertiseId: commonExpertiseId || undefined,
      deadlineAt: commonDeadline || undefined,
      responsibleLabel: commonResponsible || undefined,
    }));
    onConfirm(inputs);
    reset();
    onClose();
  };

  const canConfirm =
    items.length > 0 && !hasInvalid && !!commonCategory && !!commonConfidentiality;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload em lote</DialogTitle>
          <DialogDescription>
            Selecione vários arquivos. Demonstração mock — nenhum upload real é realizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="batch-files">Arquivos</Label>
            <Input
              id="batch-files"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              onChange={handleSelect}
            />
            <p className="text-muted-foreground text-xs">
              {items.length} arquivo(s) na lista · {validCount} válido(s)
            </p>
          </div>

          {items.length > 0 ? (
            <div className="rounded-md border">
              <ul className="divide-y">
                {items.map((i) => (
                  <li key={i.key} className="p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-words">{i.file.fileName}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(i.file.sizeBytes)} · {i.file.mimeType || "—"}
                        </p>
                        {i.error ? (
                          <p role="alert" className="text-destructive text-xs">
                            {i.error}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${i.file.fileName}`}
                        onClick={() => remove(i.key)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    {!i.error ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          aria-label={`Nome de ${i.file.fileName}`}
                          value={i.name}
                          onChange={(e) => patchItem(i.key, { name: e.target.value })}
                        />
                        <Select
                          value={i.category}
                          onValueChange={(v) =>
                            patchItem(i.key, { category: v as DocumentCategory })
                          }
                        >
                          <SelectTrigger aria-label={`Categoria de ${i.file.fileName}`}>
                            <SelectValue placeholder="Categoria (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_CATEGORIES.map((k) => (
                              <SelectItem key={k} value={k}>
                                {DOCUMENT_CATEGORY_LABEL[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">Configuração comum</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Categoria padrão *</Label>
                <Select
                  value={commonCategory}
                  onValueChange={(v) => setCommonCategory(v as DocumentCategory)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((k) => (
                      <SelectItem key={k} value={k}>{DOCUMENT_CATEGORY_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sigilo *</Label>
                <Select
                  value={commonConfidentiality}
                  onValueChange={(v) => setCommonConfidentiality(v as DocumentConfidentiality)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CONFIDENTIALITIES.map((k) => (
                      <SelectItem key={k} value={k}>{DOCUMENT_CONFIDENTIALITY_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Processo</Label>
                <Select value={commonCaseId} onValueChange={setCommonCaseId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    {processos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Perícia</Label>
                <Select value={commonExpertiseId} onValueChange={setCommonExpertiseId}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    {pericias.map((p) => (
                      <SelectItem key={p.id} value={p.id}>Perícia {p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prazo</Label>
                <Input type="date" value={commonDeadline} onChange={(e) => setCommonDeadline(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Responsável</Label>
                <Input value={commonResponsible} onChange={(e) => setCommonResponsible(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancelar
          </Button>
          <Button disabled={!canConfirm} onClick={handleConfirm}>
            Concluir upload em lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
