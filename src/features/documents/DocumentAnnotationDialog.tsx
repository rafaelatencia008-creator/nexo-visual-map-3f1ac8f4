import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ANNOTATION_LENGTH } from "./document-types";
import { validateAnnotation } from "./document-form";

export interface DocumentAnnotationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function DocumentAnnotationDialog({
  open,
  onClose,
  onSave,
}: DocumentAnnotationDialogProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const savingRef = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    setText("");
    setError(undefined);
    savingRef.current = false;
  };

  const handleSave = () => {
    if (savingRef.current) return;
    const e = validateAnnotation(text);
    setError(e);
    if (e) {
      textRef.current?.focus();
      return;
    }
    savingRef.current = true;
    onSave(text.trim());
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar anotação</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="an-text">Anotação *</Label>
          <Textarea
            id="an-text"
            ref={textRef}
            value={text}
            maxLength={MAX_ANNOTATION_LENGTH}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={!!error}
          />
          <p className="text-muted-foreground text-xs">
            {text.length}/{MAX_ANNOTATION_LENGTH}
          </p>
          {error ? <p role="alert" className="text-destructive text-xs">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar anotação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
