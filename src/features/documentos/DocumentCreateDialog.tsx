import { useState } from "react";
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
import {
  CATEGORIA_LABEL,
  processoOptions,
  type DocumentoCategoria,
} from "@/lib/mock/documentos";

export interface DocumentCreateInput {
  nome: string;
  categoria: DocumentoCategoria;
  processoId: string;
  descricao: string;
  arquivoNome: string;
}

export interface DocumentCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DocumentCreateInput) => void;
}

type Errors = Partial<Record<keyof DocumentCreateInput, string>>;

export function validateDocumentCreate(input: DocumentCreateInput): Errors {
  const e: Errors = {};
  if (!input.nome.trim() || input.nome.trim().length < 3)
    e.nome = "Informe um nome com ao menos 3 caracteres.";
  if (!input.categoria) e.categoria = "Escolha uma categoria.";
  if (!input.processoId) e.processoId = "Vincule a um processo.";
  if (!input.arquivoNome.trim()) e.arquivoNome = "Informe um nome de arquivo fictício.";
  return e;
}

export function DocumentCreateDialog({ open, onClose, onSave }: DocumentCreateDialogProps) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<DocumentoCategoria | "">("");
  const [processoId, setProcessoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const hasDraft =
    nome.length > 0 || categoria !== "" || processoId !== "" || descricao.length > 0 || arquivoNome.length > 0;

  const reset = () => {
    setNome("");
    setCategoria("");
    setProcessoId("");
    setDescricao("");
    setArquivoNome("");
    setErrors({});
  };

  const requestClose = () => {
    if (hasDraft) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    setConfirmDiscardOpen(false);
    reset();
    onClose();
  };

  const handleSave = () => {
    const input: DocumentCreateInput = {
      nome: nome.trim(),
      categoria: (categoria || "outros") as DocumentoCategoria,
      processoId,
      descricao: descricao.trim(),
      arquivoNome: arquivoNome.trim(),
    };
    if (!categoria) {
      setErrors({ ...validateDocumentCreate(input), categoria: "Escolha uma categoria." });
      return;
    }
    const e = validateDocumentCreate(input);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave(input);
    reset();
    onClose();
  };

  const processos = processoOptions();

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar documento</DialogTitle>
            <DialogDescription>
              Cadastro mockado. Nenhum arquivo real é enviado nesta etapa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="doc-nome">Nome</Label>
              <Input
                id="doc-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-invalid={!!errors.nome}
              />
              {errors.nome ? <p className="text-destructive text-xs">{errors.nome}</p> : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as DocumentoCategoria)}>
                <SelectTrigger id="doc-categoria" aria-invalid={!!errors.categoria}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIA_LABEL) as DocumentoCategoria[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {CATEGORIA_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria ? <p className="text-destructive text-xs">{errors.categoria}</p> : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-processo">Processo</Label>
              <Select value={processoId} onValueChange={setProcessoId}>
                <SelectTrigger id="doc-processo" aria-invalid={!!errors.processoId}>
                  <SelectValue placeholder="Vincular a processo" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.processoId ? <p className="text-destructive text-xs">{errors.processoId}</p> : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-descricao">Descrição</Label>
              <Textarea
                id="doc-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-arquivo">Arquivo fictício</Label>
              <Input
                id="doc-arquivo"
                placeholder="ex: laudo-preliminar.pdf"
                value={arquivoNome}
                onChange={(e) => setArquivoNome(e.target.value)}
                aria-invalid={!!errors.arquivoNome}
              />
              {errors.arquivoNome ? (
                <p className="text-destructive text-xs">{errors.arquivoNome}</p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Nenhum arquivo real é enviado. Apenas o nome é registrado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações preenchidas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
