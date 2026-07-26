import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compareReportTemplates } from "../report-template-version-diff";
import type { ReportTemplateVersion } from "../report-template-version-store";
import type { ReportTemplate } from "../report-template-types";

export function ReportTemplateVersionsPanel({
  template,
  versions,
}: {
  template: ReportTemplate;
  versions: readonly ReportTemplateVersion[];
}) {
  const list = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [fromId, setFromId] = useState<string | null>(list[1]?.id ?? null);
  const [toId, setToId] = useState<string | null>(list[0]?.id ?? null);

  const snapshot = useMemo(
    () => list.find((v) => v.id === snapshotId) ?? null,
    [list, snapshotId],
  );

  const canCompare = list.length >= 2;
  const diff = useMemo(() => {
    if (!canCompare || !fromId || !toId || fromId === toId) return null;
    const a = list.find((v) => v.id === fromId);
    const b = list.find((v) => v.id === toId);
    if (!a || !b) return null;
    return compareReportTemplates(a.snapshot, b.snapshot);
  }, [list, fromId, toId, canCompare]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          Versões ({versions.length})
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={!canCompare}
          onClick={() => setCompareOpen(true)}
        >
          Comparar
        </Button>
      </CardHeader>
      <CardContent>
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma versão. Ao publicar o modelo, uma versão será criada automaticamente.
          </p>
        )}
        <ScrollArea className="max-h-72 pr-3">
          <ul className="space-y-2">
            {list.map((v) => (
              <li key={v.id} className="rounded border p-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      v{v.versionNumber}{" "}
                      <Badge variant="outline">{v.statusAtCreation}</Badge>
                    </p>
                    <p className="text-muted-foreground">
                      {v.reason || v.changeSummary || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString("pt-BR")} · {v.author}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSnapshotId(v.id)}>
                    Ver
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>

      <Dialog open={snapshot !== null} onOpenChange={(v) => !v && setSnapshotId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Snapshot v{snapshot?.versionNumber} — {snapshot?.snapshot.name}
            </DialogTitle>
            <DialogDescription>
              Somente leitura. Este snapshot representa o modelo no momento da versão.
            </DialogDescription>
          </DialogHeader>
          {snapshot && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 pr-3 text-sm">
                <p>
                  <strong>Especialidade:</strong> {snapshot.snapshot.specialty} ·{" "}
                  <strong>Status na versão:</strong> {snapshot.statusAtCreation}
                </p>
                <p className="text-muted-foreground">{snapshot.snapshot.description}</p>
                <div>
                  <p className="font-medium">Seções ({snapshot.snapshot.sections.length})</p>
                  <ul className="ml-4 list-disc">
                    {snapshot.snapshot.sections.map((s) => (
                      <li key={s.id}>
                        {s.title} — {s.blocks.length} bloco(s)
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">
                    Variáveis ({snapshot.snapshot.variables.length})
                  </p>
                  <ul className="ml-4 list-disc">
                    {snapshot.snapshot.variables.map((v) => (
                      <li key={v.id}>
                        <code>{v.key}</code> — {v.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotId(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comparar versões — {template.name}</DialogTitle>
            <DialogDescription>
              Selecione a versão base e a versão alvo para ver diferenças estruturais.
            </DialogDescription>
          </DialogHeader>
          {!canCompare ? (
            <p className="text-sm text-muted-foreground">
              É necessário ter pelo menos duas versões.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Base</label>
                  <Select
                    value={fromId ?? undefined}
                    onValueChange={(v) => setFromId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {list.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.versionNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm">Alvo</label>
                  <Select value={toId ?? undefined} onValueChange={(v) => setToId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {list.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.versionNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea className="max-h-[50vh]">
                {!diff ? (
                  <p className="text-sm text-muted-foreground">
                    Selecione duas versões diferentes.
                  </p>
                ) : (
                  <div className="space-y-2 pr-3 text-sm">
                    <p className="font-medium">{diff.summary}</p>
                    <DiffLine label="Seções adicionadas" items={diff.sectionsAdded.map((s) => s.title)} />
                    <DiffLine label="Seções removidas" items={diff.sectionsRemoved.map((s) => s.title)} />
                    <DiffLine label="Seções renomeadas" items={diff.sectionsRenamed.map((s) => `${s.from} → ${s.to}`)} />
                    <DiffLine label="Blocos adicionados" items={diff.blocksAdded.map((b) => b.kind)} />
                    <DiffLine label="Blocos removidos" items={diff.blocksRemoved.map((b) => b.kind)} />
                    <DiffLine label="Blocos alterados" items={diff.blocksChanged.map((b) => `${b.id} (${b.fields.join(", ")})`)} />
                    <DiffLine label="Variáveis adicionadas" items={diff.variablesAdded.map((v) => v.key)} />
                    <DiffLine label="Variáveis removidas" items={diff.variablesRemoved.map((v) => v.key)} />
                    <DiffLine label="Variáveis alteradas" items={diff.variablesChanged.map((v) => `${v.key} (${v.fields.join(", ")})`)} />
                    <DiffLine label="Metadados" items={diff.metadataChanges.map((m) => `${m.field}: ${m.from} → ${m.to}`)} />
                  </div>
                )}
              </ScrollArea>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DiffLine({ label, items }: { label: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="ml-4 list-disc">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
