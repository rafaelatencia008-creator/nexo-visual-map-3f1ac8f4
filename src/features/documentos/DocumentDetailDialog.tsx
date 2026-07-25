import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CATEGORIA_LABEL,
  SITUACAO_LABEL,
  getProcessoLabel,
  type Documento,
  type DocumentoAnotacao,
  type DocumentoVersao,
} from "@/lib/mock/documentos";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export interface DocumentDetailDialogProps {
  documento: Documento | null;
  open: boolean;
  onClose: () => void;
  onAddAnotacao: (documentoId: string, texto: string) => void;
  onCreateVersao: (documentoId: string, resumo: string) => void;
}

export function DocumentDetailDialog({
  documento,
  open,
  onClose,
  onAddAnotacao,
  onCreateVersao,
}: DocumentDetailDialogProps) {
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [novaVersaoResumo, setNovaVersaoResumo] = useState("");
  const [erroAnotacao, setErroAnotacao] = useState<string | null>(null);
  const [erroVersao, setErroVersao] = useState<string | null>(null);

  if (!documento) return null;

  const handleAnotacao = () => {
    const t = novaAnotacao.trim();
    if (t.length < 3) {
      setErroAnotacao("Informe ao menos 3 caracteres.");
      return;
    }
    onAddAnotacao(documento.id, t);
    setNovaAnotacao("");
    setErroAnotacao(null);
  };

  const handleVersao = () => {
    const r = novaVersaoResumo.trim();
    if (r.length < 3) {
      setErroVersao("Descreva o motivo da nova versão.");
      return;
    }
    onCreateVersao(documento.id, r);
    setNovaVersaoResumo("");
    setErroVersao(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="break-words">{documento.nome}</DialogTitle>
          <DialogDescription>
            {CATEGORIA_LABEL[documento.categoria]} · Processo{" "}
            {getProcessoLabel(documento.processoId)} · v{documento.versaoAtual}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <section aria-label="Metadados">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Situação</div>
                  <Badge variant="outline">{SITUACAO_LABEL[documento.situacao]}</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Responsável</div>
                  <div className="break-words">{documento.responsavel}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Atualizado em</div>
                  <div>{formatDate(documento.atualizadoEm)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Versão atual</div>
                  <div>v{documento.versaoAtual}</div>
                </div>
                {documento.observacoes ? (
                  <div className="sm:col-span-2">
                    <div className="text-muted-foreground text-xs uppercase tracking-wide">Observações</div>
                    <p className="break-words">{documento.observacoes}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <Separator />

            <section aria-label="Vínculos">
              <h3 className="font-semibold mb-2 text-sm">Vínculos</h3>
              {documento.vinculos.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem vínculos cadastrados.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {documento.vinculos.map((v, i) => (
                    <li key={i} className="break-words">
                      <span className="text-muted-foreground">{v.tipo}:</span> {v.descricao}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Separator />

            <section aria-label="Histórico de versões">
              <h3 className="font-semibold mb-2 text-sm">Histórico de versões</h3>
              <ul className="space-y-2">
                {[...documento.versoes]
                  .sort((a, b) => b.numero - a.numero)
                  .map((v: DocumentoVersao) => (
                    <li key={v.numero} className="rounded border p-2 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong>v{v.numero}</strong>
                        <span className="text-xs text-muted-foreground">{formatDate(v.criadoEm)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{v.autor}</div>
                      <p className="break-words">{v.resumo}</p>
                    </li>
                  ))}
              </ul>
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Descreva a nova versão (mock)"
                  value={novaVersaoResumo}
                  onChange={(e) => setNovaVersaoResumo(e.target.value)}
                  aria-label="Descrição da nova versão"
                />
                {erroVersao ? <p className="text-destructive text-xs">{erroVersao}</p> : null}
                <Button type="button" size="sm" onClick={handleVersao}>
                  Criar nova versão
                </Button>
              </div>
            </section>

            <Separator />

            <section aria-label="Anotações">
              <h3 className="font-semibold mb-2 text-sm">Anotações</h3>
              {documento.anotacoes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma anotação registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {documento.anotacoes.map((a: DocumentoAnotacao) => (
                    <li key={a.id} className="rounded border p-2 text-sm">
                      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                        <span>{a.autor}</span>
                        <span>{formatDate(a.criadoEm)}</span>
                      </div>
                      <p className="break-words">{a.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Adicionar anotação (mock)"
                  value={novaAnotacao}
                  onChange={(e) => setNovaAnotacao(e.target.value)}
                  aria-label="Nova anotação"
                />
                {erroAnotacao ? <p className="text-destructive text-xs">{erroAnotacao}</p> : null}
                <Button type="button" size="sm" variant="secondary" onClick={handleAnotacao}>
                  Adicionar anotação
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
