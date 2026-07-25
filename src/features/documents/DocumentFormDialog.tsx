import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientes, pericias, processos } from "@/lib/mock/data";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_CONFIDENTIALITIES,
  DOCUMENT_CONFIDENTIALITY_LABEL,
} from "./document-labels";
import {
  formatFileSize,
  getFirstDocumentErrorField,
  validateDocumentForm,
  type DocumentFileMeta,
  type DocumentFormErrors,
  type DocumentFormInput,
} from "./document-form";
import type {
  DocumentCategory,
  DocumentConfidentiality,
} from "./document-types";

export interface DocumentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: DocumentFormInput) => void;
}

export function DocumentFormDialog({ open, onClose, onSave }: DocumentFormDialogProps) {
  const [file, setFile] = useState<DocumentFileMeta | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [confidentiality, setConfidentiality] = useState<DocumentConfidentiality | "">("");
  const [description, setDescription] = useState("");
  const [caseId, setCaseId] = useState<string>("");
  const [expertiseId, setExpertiseId] = useState<string>("");
  const [personId, setPersonId] = useState<string>("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [responsibleLabel, setResponsibleLabel] = useState("");
  const [errors, setErrors] = useState<DocumentFormErrors>({});
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const savingRef = useRef(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const confidentialityRef = useRef<HTMLButtonElement>(null);
  const deadlineRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const hasDraft =
    !!file ||
    name.length > 0 ||
    category !== "" ||
    confidentiality !== "" ||
    description.length > 0 ||
    caseId !== "" ||
    expertiseId !== "" ||
    personId !== "" ||
    deadlineAt.length > 0 ||
    responsibleLabel.length > 0;

  const reset = () => {
    setFile(null);
    setName("");
    setCategory("");
    setConfidentiality("");
    setDescription("");
    setCaseId("");
    setExpertiseId("");
    setPersonId("");
    setDeadlineAt("");
    setResponsibleLabel("");
    setErrors({});
    savingRef.current = false;
  };

  const requestClose = () => {
    if (hasDraft) setConfirmDiscardOpen(true);
    else onClose();
  };
  const confirmDiscard = () => {
    setConfirmDiscardOpen(false);
    reset();
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    setFile({ fileName: f.name, sizeBytes: f.size, mimeType: f.type || "application/octet-stream" });
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const focusFirst = (key: keyof DocumentFormErrors | null) => {
    if (!key) return;
    const map: Record<keyof DocumentFormErrors, HTMLElement | null> = {
      file: fileRef.current,
      name: nameRef.current,
      category: categoryRef.current,
      confidentiality: confidentialityRef.current,
      deadlineAt: deadlineRef.current,
      description: descriptionRef.current,
    };
    map[key]?.focus();
  };

  const handleSave = () => {
    if (savingRef.current) return;
    const input: DocumentFormInput = {
      file,
      name,
      category,
      confidentiality,
      description,
      caseId: caseId || undefined,
      expertiseId: expertiseId || undefined,
      personIds: personId ? [personId] : [],
      deadlineAt: deadlineAt || undefined,
      responsibleLabel: responsibleLabel || undefined,
    };
    const e = validateDocumentForm(input);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirst(getFirstDocumentErrorField(e));
      return;
    }
    savingRef.current = true;
    onSave(input);
    reset();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar documento</DialogTitle>
            <DialogDescription>
              Demonstração mock — nenhum arquivo é realmente enviado. Somente metadados
              (nome, tamanho, tipo) são registrados nesta sessão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="doc-file">Arquivo *</Label>
              <Input
                id="doc-file"
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={handleFile}
                aria-invalid={!!errors.file}
                aria-describedby={errors.file ? "doc-file-error" : "doc-file-help"}
              />
              {file ? (
                <p className="text-muted-foreground text-xs">
                  {file.fileName} · {formatFileSize(file.sizeBytes)} · {file.mimeType || "tipo desconhecido"}
                </p>
              ) : (
                <p id="doc-file-help" className="text-muted-foreground text-xs">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT (até 50 MB).
                </p>
              )}
              {errors.file ? (
                <p id="doc-file-error" role="alert" className="text-destructive text-xs">
                  {errors.file}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-name">Nome do documento *</Label>
              <Input
                id="doc-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "doc-name-error" : undefined}
              />
              {errors.name ? (
                <p id="doc-name-error" role="alert" className="text-destructive text-xs">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="doc-category">Categoria *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                  <SelectTrigger id="doc-category" ref={categoryRef} aria-invalid={!!errors.category}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {DOCUMENT_CATEGORY_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category ? (
                  <p role="alert" className="text-destructive text-xs">
                    {errors.category}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label htmlFor="doc-conf">Sigilo *</Label>
                <Select
                  value={confidentiality}
                  onValueChange={(v) => setConfidentiality(v as DocumentConfidentiality)}
                >
                  <SelectTrigger id="doc-conf" ref={confidentialityRef} aria-invalid={!!errors.confidentiality}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CONFIDENTIALITIES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {DOCUMENT_CONFIDENTIALITY_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.confidentiality ? (
                  <p role="alert" className="text-destructive text-xs">
                    {errors.confidentiality}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="doc-case">Processo</Label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger id="doc-case">
                    <SelectValue placeholder="Vincular a processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {processos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.numero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-exp">Perícia</Label>
                <Select value={expertiseId} onValueChange={setExpertiseId}>
                  <SelectTrigger id="doc-exp">
                    <SelectValue placeholder="Vincular a perícia" />
                  </SelectTrigger>
                  <SelectContent>
                    {pericias.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        Perícia {p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="doc-person">Pessoa vinculada</Label>
                <Select value={personId} onValueChange={setPersonId}>
                  <SelectTrigger id="doc-person">
                    <SelectValue placeholder="Vincular a pessoa" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-deadline">Prazo</Label>
                <Input
                  id="doc-deadline"
                  ref={deadlineRef}
                  type="date"
                  value={deadlineAt}
                  onChange={(e) => setDeadlineAt(e.target.value)}
                  aria-invalid={!!errors.deadlineAt}
                />
                {errors.deadlineAt ? (
                  <p role="alert" className="text-destructive text-xs">
                    {errors.deadlineAt}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-resp">Responsável</Label>
              <Input
                id="doc-resp"
                value={responsibleLabel}
                onChange={(e) => setResponsibleLabel(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-desc">Descrição</Label>
              <Textarea
                id="doc-desc"
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!errors.description}
              />
              {errors.description ? (
                <p role="alert" className="text-destructive text-xs">
                  {errors.description}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações preenchidas ainda não foram salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar preenchendo</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Descartar documento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
