import { useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  formatFileSize,
  validateVersionForm,
  type DocumentFileMeta,
  type DocumentVersionErrors,
  type DocumentVersionInput,
} from "./document-form";

export interface DocumentVersionDialogProps {
  open: boolean;
  documentName: string;
  onClose: () => void;
  onSave: (input: DocumentVersionInput) => void;
}

export function DocumentVersionDialog({
  open,
  documentName,
  onClose,
  onSave,
}: DocumentVersionDialogProps) {
  const [file, setFile] = useState<DocumentFileMeta | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<DocumentVersionErrors>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const reset = () => {
    setFile(null);
    setDescription("");
    setErrors({});
    savingRef.current = false;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    setFile({ fileName: f.name, sizeBytes: f.size, mimeType: f.type || "application/octet-stream" });
  };

  const handleSave = () => {
    if (savingRef.current) return;
    const input: DocumentVersionInput = { file, description };
    const e = validateVersionForm(input);
    setErrors(e);
    if (e.file) {
      fileRef.current?.focus();
      return;
    }
    if (Object.keys(e).length > 0) return;
    savingRef.current = true;
    onSave(input);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar nova versão</DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ver-file">Novo arquivo *</Label>
            <Input
              id="ver-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              onChange={handleFile}
              aria-invalid={!!errors.file}
            />
            {file ? (
              <p className="text-muted-foreground text-xs">
                {file.fileName} · {formatFileSize(file.sizeBytes)}
              </p>
            ) : null}
            {errors.file ? (
              <p role="alert" className="text-destructive text-xs">{errors.file}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ver-desc">Descrição da versão</Label>
            <Textarea
              id="ver-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description ? (
              <p role="alert" className="text-destructive text-xs">{errors.description}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar nova versão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
