/**
 * LV-12 — Diálogo de vínculo de evidência.
 */
import { useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listDocumentOptions,
  listInterviewOptions,
  listDiligenceOptions,
  type EvidenceSource,
} from "./evidence-adapters";
import {
  EVIDENCE_RELEVANCE_LABEL,
  EVIDENCE_TYPE_LABEL,
} from "./question-labels";
import { EVIDENCE_RELEVANCES, type EvidenceRelevance, type EvidenceType } from "./question-types";
import { linkEvidence } from "./question-mock-store";

export function EvidenceLinkDialog({
  open,
  questionId,
  onClose,
}: {
  open: boolean;
  questionId: string;
  onClose: () => void;
}) {
  const [source, setSource] = useState<EvidenceSource>("documentos");
  const [selectedType, setSelectedType] = useState<EvidenceType>("documento");
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [excerpt, setExcerpt] = useState("");
  const [technicalNote, setTechnicalNote] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualAuthor, setManualAuthor] = useState("Dra. Ana Beatriz Salgado");
  const [manualDate, setManualDate] = useState("");
  const [relevance, setRelevance] = useState<EvidenceRelevance>("media");
  const [supports, setSupports] = useState(true);
  const [contradicts, setContradicts] = useState(false);
  const [contradictionJustification, setContradictionJustification] = useState("");
  const [error, setError] = useState<string | null>(null);

  const documents = useMemo(() => listDocumentOptions(), []);
  const interviews = useMemo(() => listInterviewOptions(), []);
  const diligences = useMemo(() => listDiligenceOptions(), []);

  function pickDocument(docId: string) {
    const d = documents.find((x) => x.id === docId);
    if (!d) return;
    setSelectedType("documento");
    setSelectedId(d.id);
    setSelectedParentId("");
    setSelectedLabel(d.label);
  }

  function submit() {
    setError(null);
    if (source === "manual") {
      if (!manualTitle.trim()) {
        setError("Informe o título da observação.");
        return;
      }
      const res = linkEvidence(questionId, {
        evidenceType: "observacao_manual",
        sourceLabel: manualTitle.trim(),
        excerpt: manualDescription.trim() || undefined,
        technicalNote: `Registrado por ${manualAuthor.trim()}` +
          (manualDate ? ` em ${manualDate}` : ""),
        relevance,
        supportsAnswer: supports,
        contradictsAnswer: contradicts,
        contradictionJustification:
          supports && contradicts ? contradictionJustification.trim() : undefined,
      });
      if (!res.ok) {
        setError(res.reason ?? "Falha ao vincular");
        return;
      }
      onClose();
      return;
    }
    if (!selectedId && !selectedLabel) {
      setError("Selecione uma fonte de evidência.");
      return;
    }
    const res = linkEvidence(questionId, {
      evidenceType: selectedType,
      sourceId: selectedId || undefined,
      sourceParentId: selectedParentId || undefined,
      sourceLabel: selectedLabel,
      excerpt: excerpt.trim() || undefined,
      technicalNote: technicalNote.trim() || undefined,
      relevance,
      supportsAnswer: supports,
      contradictsAnswer: contradicts,
      contradictionJustification:
        supports && contradicts ? contradictionJustification.trim() : undefined,
    });
    if (!res.ok) {
      setError(res.reason ?? "Falha ao vincular");
      return;
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vincular evidência</DialogTitle>
          <DialogDescription>
            Selecione a fonte, classifique a relevância e registre observações.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={source} onValueChange={(v) => setSource(v as EvidenceSource)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="entrevistas">Entrevistas</TabsTrigger>
            <TabsTrigger value="diligencias">Diligências</TabsTrigger>
            <TabsTrigger value="manual">Observação manual</TabsTrigger>
          </TabsList>

          <TabsContent value="documentos" className="space-y-3">
            <Label>Documento</Label>
            <Select value={selectedId} onValueChange={pickDocument}>
              <SelectTrigger aria-label="Documento">
                <SelectValue placeholder="Selecione um documento" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId && (
              <div className="space-y-2">
                <Label>Versão</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    const doc = documents.find((d) => d.id === selectedId);
                    const ver = doc?.versions.find((x) => x.id === v);
                    if (!ver || !doc) return;
                    setSelectedType("documento_versao");
                    setSelectedId(ver.id);
                    setSelectedParentId(doc.id);
                    setSelectedLabel(`${doc.label} — ${ver.label}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular versão específica (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents
                      .find((d) => d.id === selectedId)
                      ?.versions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="entrevistas" className="space-y-3">
            <Label>Entrevista</Label>
            <Select
              value={selectedType === "entrevista" ? selectedId : ""}
              onValueChange={(v) => {
                const it = interviews.find((x) => x.id === v);
                if (!it) return;
                setSelectedType("entrevista");
                setSelectedId(it.id);
                setSelectedParentId("");
                setSelectedLabel(it.label);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma entrevista" />
              </SelectTrigger>
              <SelectContent>
                {interviews.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType === "entrevista" && selectedId && (
              <>
                <Label>Trecho de transcrição (opcional)</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    const iv = interviews.find((x) => x.id === selectedId);
                    const bl = iv?.transcriptBlocks.find((b) => b.id === v);
                    if (!iv || !bl) return;
                    setSelectedType("transcricao_trecho");
                    setSelectedId(bl.id);
                    setSelectedParentId(iv.id);
                    setSelectedLabel(`${iv.label} — ${bl.label}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um trecho" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviews
                      .find((x) => x.id === selectedId)
                      ?.transcriptBlocks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Label>Nota (opcional)</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    const iv = interviews.find((x) => x.id === selectedId);
                    const nt = iv?.notes.find((n) => n.id === v);
                    if (!iv || !nt) return;
                    setSelectedType("entrevista_nota");
                    setSelectedId(nt.id);
                    setSelectedParentId(iv.id);
                    setSelectedLabel(`${iv.label} — ${nt.label}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma nota" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviews
                      .find((x) => x.id === selectedId)
                      ?.notes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </TabsContent>

          <TabsContent value="diligencias" className="space-y-3">
            <Label>Diligência</Label>
            <Select
              value={selectedType === "diligencia" ? selectedId : ""}
              onValueChange={(v) => {
                const it = diligences.find((x) => x.id === v);
                if (!it) return;
                setSelectedType("diligencia");
                setSelectedId(it.id);
                setSelectedParentId("");
                setSelectedLabel(it.label);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma diligência" />
              </SelectTrigger>
              <SelectContent>
                {diligences.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType === "diligencia" && selectedId && (
              <>
                <Label>Foto (opcional)</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    const it = diligences.find((x) => x.id === selectedId);
                    const ph = it?.photos.find((p) => p.id === v);
                    if (!it || !ph) return;
                    setSelectedType("diligencia_foto");
                    setSelectedId(ph.id);
                    setSelectedParentId(it.id);
                    setSelectedLabel(`${it.label} — ${ph.label}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma foto" />
                  </SelectTrigger>
                  <SelectContent>
                    {diligences
                      .find((x) => x.id === selectedId)
                      ?.photos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {diligences.find((x) => x.id === selectedId)?.hasLocation && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const it = diligences.find((x) => x.id === selectedId);
                      if (!it) return;
                      setSelectedType("diligencia_localizacao");
                      setSelectedParentId(it.id);
                      setSelectedLabel(`${it.label} — Localização ${it.locationLabel ?? ""}`);
                    }}
                  >
                    Vincular localização registrada
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="m-title">Título *</Label>
              <Input
                id="m-title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-desc">Descrição</Label>
              <Textarea
                id="m-desc"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="m-author">Responsável</Label>
                <Input
                  id="m-author"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-date">Data</Label>
                <Input
                  id="m-date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {selectedLabel && (
          <p className="text-xs text-muted-foreground">
            Fonte selecionada: <strong>{selectedLabel}</strong> ({EVIDENCE_TYPE_LABEL[selectedType]})
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Relevância</Label>
            <Select value={relevance} onValueChange={(v) => setRelevance(v as EvidenceRelevance)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_RELEVANCES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {EVIDENCE_RELEVANCE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={supports} onCheckedChange={(v) => setSupports(Boolean(v))} />
              Sustenta a resposta
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={contradicts} onCheckedChange={(v) => setContradicts(Boolean(v))} />
              Contradiz a resposta
            </label>
          </div>
        </div>

        {source !== "manual" && (
          <div className="space-y-1">
            <Label htmlFor="ev-excerpt">Trecho relevante</Label>
            <Textarea
              id="ev-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
            />
          </div>
        )}
        {source !== "manual" && (
          <div className="space-y-1">
            <Label htmlFor="ev-note">Nota técnica</Label>
            <Textarea
              id="ev-note"
              value={technicalNote}
              onChange={(e) => setTechnicalNote(e.target.value)}
              rows={2}
            />
          </div>
        )}
        {supports && contradicts && (
          <div className="space-y-1">
            <Alert>
              <AlertTitle>Confirmação necessária</AlertTitle>
              <AlertDescription>
                Um mesmo vínculo não pode sustentar e contradizer sem justificativa.
              </AlertDescription>
            </Alert>
            <Textarea
              value={contradictionJustification}
              onChange={(e) => setContradictionJustification(e.target.value)}
              placeholder="Justificativa técnica..."
              rows={2}
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível vincular</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>Vincular evidência</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
