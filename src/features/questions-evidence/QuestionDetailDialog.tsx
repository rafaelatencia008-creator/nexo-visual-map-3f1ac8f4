/**
 * LV-12 — Detalhe do quesito.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, Copy, Link2, Trash2, X } from "lucide-react";
import {
  COVERAGE_BAND_LABEL,
  EVIDENCE_RELEVANCE_LABEL,
  EVIDENCE_TYPE_LABEL,
  GAP_KIND_LABEL,
  HISTORY_EVENT_LABEL,
  QUESTION_ORIGIN_LABEL,
  QUESTION_PRIORITY_LABEL,
  QUESTION_STATUS_LABEL,
} from "./question-labels";
import { GAP_KINDS, QUESTION_PRIORITIES, QUESTION_STATUSES } from "./question-types";
import type { GapKind, QuestionPriority, QuestionStatus } from "./question-types";
import { getCaseNumberLabel } from "./question-filters";
import { computeCoverage } from "./question-coverage";
import {
  addGapItem,
  analyzeDivergence,
  buildPreparedBlock,
  canMarkAnswered,
  changeStatus,
  getQuestion,
  linkEvidence,
  markReadyForReport,
  removeEvidence,
  reopenGap,
  resolveGap,
  unmarkReadyForReport,
  updateAnswer,
} from "./question-mock-store";
import { EvidenceLinkDialog } from "./EvidenceLinkDialog";

export function QuestionDetailDialog({
  questionId,
  onClose,
}: {
  questionId: string;
  onClose: () => void;
}) {
  const q = getQuestion(questionId);
  const [tab, setTab] = useState("resposta");
  const [showLink, setShowLink] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState(q?.technicalAnalysis ?? "");
  const [answer, setAnswer] = useState(q?.technicalAnswer ?? "");
  const [conclusion, setConclusion] = useState(q?.conclusion ?? "");
  const [observations, setObservations] = useState(q?.observations ?? "");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [prepared, setPrepared] = useState(false);

  // gap form
  const [gapKind, setGapKind] = useState<GapKind>("documento_ausente");
  const [gapDesc, setGapDesc] = useState("");
  const [gapPriority, setGapPriority] = useState<QuestionPriority>("normal");
  // divergence
  const [divJustification, setDivJustification] = useState(q?.divergenceJustification ?? "");

  const cov = useMemo(() => (q ? computeCoverage(q) : null), [q]);

  if (!q) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quesito não encontrado</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  function saveDraft() {
    updateAnswer(q!.id, {
      technicalAnalysis: analysis,
      technicalAnswer: answer,
      conclusion,
      observations,
    });
    setNotice({ tone: "ok", message: "Rascunho salvo." });
  }

  function transitionStatus(next: QuestionStatus) {
    saveDraft();
    const res = changeStatus(q!.id, next);
    if (!res.ok) setNotice({ tone: "error", message: res.reason });
    else setNotice({ tone: "ok", message: `Situação: ${QUESTION_STATUS_LABEL[next]}` });
  }

  const cur = getQuestion(questionId) ?? q;
  const answerBlock = cur ? buildPreparedBlock(cur) : "";
  const answerCheck = canMarkAnswered(cur);

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Quesito {cur.sequence}</span>
            <Badge variant="outline">{QUESTION_ORIGIN_LABEL[cur.origin]}</Badge>
            <Badge>{QUESTION_STATUS_LABEL[cur.status]}</Badge>
            <Badge variant="outline">Prioridade: {QUESTION_PRIORITY_LABEL[cur.priority]}</Badge>
            {cur.readyForReport && (
              <Badge className="bg-sky-500/15 text-sky-700">Preparado para o laudo</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-wrap break-words">
            {cur.text}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Processo: {getCaseNumberLabel(cur.caseId) || "—"}</span>
          <span>Perícia: {cur.expertiseId ?? "—"}</span>
          <span>Responsável: {cur.responsibleLabel}</span>
          {cur.dueAt && <span>Prazo: {new Date(cur.dueAt).toLocaleDateString("pt-BR")}</span>}
          {cur.originLabel && <span>Origem: {cur.originLabel}</span>}
        </div>
        {cur.objective && (
          <p className="text-sm text-muted-foreground">
            <strong>Objetivo:</strong> {cur.objective}
          </p>
        )}
        {cov && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="text-sm font-semibold">
              Cobertura: {cov.score}% — {COVERAGE_BAND_LABEL[cov.band]}
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
              {cov.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {notice && (
          <Alert variant={notice.tone === "error" ? "destructive" : "default"}>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="resposta">Resposta</TabsTrigger>
            <TabsTrigger value="evidencias">Evidências ({cur.evidenceLinks.length})</TabsTrigger>
            <TabsTrigger value="lacunas">Lacunas ({cur.gapItems.filter((g) => !g.resolved).length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="laudo">Preparação</TabsTrigger>
          </TabsList>

          <TabsContent value="resposta" className="space-y-3">
            <Alert>
              <AlertTitle>Aviso</AlertTitle>
              <AlertDescription>
                Resposta produzida manualmente. Nenhuma IA está ativa nesta etapa.
              </AlertDescription>
            </Alert>
            <Label htmlFor="an">Análise técnica</Label>
            <Textarea id="an" value={analysis} onChange={(e) => setAnalysis(e.target.value)} rows={4} />
            <Label htmlFor="an-ans">Resposta ao quesito</Label>
            <Textarea id="an-ans" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
            <Label htmlFor="an-conc">Conclusão</Label>
            <Textarea id="an-conc" value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={3} />
            <Label htmlFor="an-obs">Observações</Label>
            <Textarea id="an-obs" value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={saveDraft}>Salvar rascunho</Button>
              <Button variant="outline" onClick={() => transitionStatus("em_analise")}>Marcar em análise</Button>
              <Button variant="outline" onClick={() => transitionStatus("parcial")}>Parcialmente respondido</Button>
              <Button
                onClick={() => transitionStatus("respondido")}
                disabled={!answerCheck.ok}
                title={answerCheck.reason}
              >
                Marcar respondido
              </Button>
              <Button variant="outline" onClick={() => transitionStatus("sem_evidencia")}>Sem evidência</Button>
              <Button variant="outline" onClick={() => transitionStatus("nao_aplicavel")}>Não aplicável</Button>
            </div>
            {!answerCheck.ok && (
              <Alert variant="destructive">
                <AlertTitle>Não é possível marcar como respondido</AlertTitle>
                <AlertDescription>{answerCheck.reason}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="evidencias" className="space-y-3">
            <Button onClick={() => setShowLink(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Vincular evidência
            </Button>
            {cur.evidenceLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma evidência vinculada.</p>
            )}
            {cur.evidenceLinks.map((l) => (
              <div key={l.id} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{l.sourceLabel}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      <Badge variant="outline">{EVIDENCE_TYPE_LABEL[l.evidenceType]}</Badge>
                      <Badge>{EVIDENCE_RELEVANCE_LABEL[l.relevance]}</Badge>
                      {l.supportsAnswer && <Badge className="bg-emerald-500/15 text-emerald-700">Sustenta</Badge>}
                      {l.contradictsAnswer && <Badge className="bg-rose-500/15 text-rose-700">Contradiz</Badge>}
                    </div>
                    {l.excerpt && <p className="mt-2 text-xs text-muted-foreground">"{l.excerpt}"</p>}
                    {l.technicalNote && <p className="mt-1 text-xs text-muted-foreground">{l.technicalNote}</p>}
                    {l.contradictionJustification && (
                      <p className="mt-1 text-xs text-amber-700">Justificativa: {l.contradictionJustification}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveId(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {cur.status === "com_divergencia" && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="font-semibold text-amber-700">Análise da divergência</p>
                <Textarea
                  value={divJustification}
                  onChange={(e) => setDivJustification(e.target.value)}
                  rows={3}
                  placeholder="Justifique a interpretação técnica adotada..."
                />
                <Button
                  className="mt-2"
                  onClick={() => {
                    if (!divJustification.trim()) {
                      setNotice({ tone: "error", message: "Informe a justificativa." });
                      return;
                    }
                    analyzeDivergence(cur.id, divJustification);
                    setNotice({ tone: "ok", message: "Divergência analisada." });
                  }}
                >
                  Registrar análise da divergência
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lacunas" className="space-y-3">
            {cur.gapItems.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma lacuna registrada.</p>
            )}
            {cur.gapItems.map((g) => (
              <div key={g.id} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{GAP_KIND_LABEL[g.kind]}</Badge>
                      <Badge>{QUESTION_PRIORITY_LABEL[g.priority]}</Badge>
                      {g.resolved && <Badge className="bg-emerald-500/15 text-emerald-700">Resolvida</Badge>}
                    </div>
                    <p className="mt-2 break-words text-sm">{g.description}</p>
                  </div>
                  {g.resolved ? (
                    <Button size="sm" variant="ghost" onClick={() => reopenGap(cur.id, g.id)}>Reabrir</Button>
                  ) : (
                    <Button size="sm" onClick={() => resolveGap(cur.id, g.id)}>Marcar resolvida</Button>
                  )}
                </div>
              </div>
            ))}
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="mb-2 font-semibold">Adicionar lacuna</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={gapKind} onValueChange={(v) => setGapKind(v as GapKind)}>
                  <SelectTrigger aria-label="Tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAP_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {GAP_KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={gapPriority} onValueChange={(v) => setGapPriority(v as QuestionPriority)}>
                  <SelectTrigger aria-label="Prioridade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {QUESTION_PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                className="mt-2"
                value={gapDesc}
                onChange={(e) => setGapDesc(e.target.value)}
                placeholder="Descreva a lacuna..."
                rows={2}
              />
              <Button
                className="mt-2"
                onClick={() => {
                  if (!gapDesc.trim()) return;
                  addGapItem(cur.id, {
                    kind: gapKind,
                    description: gapDesc.trim(),
                    priority: gapPriority,
                  });
                  setGapDesc("");
                  setNotice({ tone: "ok", message: "Lacuna adicionada." });
                }}
              >
                Adicionar lacuna
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-2">
            {cur.history.map((h) => (
              <div key={h.id} className="rounded-md border border-border/60 p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{HISTORY_EVENT_LABEL[h.kind]}</Badge>
                  <span>{new Date(h.createdAt).toLocaleString("pt-BR")}</span>
                  <span>· {h.authorLabel}</span>
                </div>
                <p className="mt-1 break-words">{h.summary}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="laudo" className="space-y-3">
            <Alert>
              <AlertDescription>
                Preparação mock. O módulo de Laudos será integrado em etapa futura.
              </AlertDescription>
            </Alert>
            <Textarea value={answerBlock} readOnly rows={10} />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    if (navigator.clipboard) await navigator.clipboard.writeText(answerBlock);
                    setNotice({ tone: "ok", message: "Bloco copiado." });
                  } catch {
                    setNotice({ tone: "error", message: "Falha ao copiar." });
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar bloco
              </Button>
              {!cur.readyForReport ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    const res = markReadyForReport(cur.id);
                    if (!res.ok) setNotice({ tone: "error", message: res.reason ?? "" });
                    else setNotice({ tone: "ok", message: "Preparado para o laudo." });
                  }}
                >
                  Marcar como preparado
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    unmarkReadyForReport(cur.id);
                    setNotice({ tone: "ok", message: "Retirado da preparação." });
                  }}
                >
                  Retirar da preparação
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Fechar
          </Button>
        </div>

        {showLink && (
          <EvidenceLinkDialog
            open={showLink}
            questionId={cur.id}
            onClose={() => setShowLink(false)}
          />
        )}

        {confirmRemoveId && (
          <Dialog open onOpenChange={() => setConfirmRemoveId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover vínculo?</DialogTitle>
                <DialogDescription>A fonte original permanece intacta.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmRemoveId(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    removeEvidence(cur.id, confirmRemoveId);
                    setConfirmRemoveId(null);
                  }}
                >
                  Remover
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
