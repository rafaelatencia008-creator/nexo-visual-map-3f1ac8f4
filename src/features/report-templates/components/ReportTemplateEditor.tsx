import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  addBlock,
  addSection,
  moveBlock,
  moveSection,
  removeBlock,
  removeSection,
  updateBlock,
  updateSection,
  updateTemplateMetadata,
} from "../report-template-store";
import {
  REPORT_TEMPLATE_BLOCK_KINDS,
  REPORT_TEMPLATE_BLOCK_KIND_LABEL,
  REPORT_TEMPLATE_SPECIALTIES,
  REPORT_TEMPLATE_SPECIALTY_LABEL,
  type ReportTemplate,
  type ReportTemplateBlockId,
  type ReportTemplateBlockKind,
  type ReportTemplateSectionId,
  type ReportTemplateSpecialty,
} from "../report-template-types";
import { friendlyReportTemplateError } from "../report-template-error-labels";
import { toast } from "sonner";

function useDomainAction() {
  return function run<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch (e) {
      toast.error(friendlyReportTemplateError(e));
      return undefined;
    }
  };
}

interface Props {
  readonly template: ReportTemplate;
  readonly readOnly: boolean;
}

export function ReportTemplateEditor({ template, readOnly }: Props) {
  const run = useDomainAction();

  // Metadata form (deferred save)
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [specialty, setSpecialty] = useState<ReportTemplateSpecialty>(template.specialty);

  // Reset local state when the selected template id changes.
  useMemo(() => {
    setName(template.name);
    setDescription(template.description);
    setSpecialty(template.specialty);
  }, [template.id, template.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const metaDirty =
    name.trim() !== template.name ||
    description.trim() !== template.description ||
    specialty !== template.specialty;

  function saveMeta() {
    if (readOnly || !metaDirty) return;
    run(() =>
      updateTemplateMetadata(template.id, {
        name: name.trim(),
        description: description.trim(),
        specialty,
      }),
    );
    toast.success("Metadados atualizados.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="tpl-name">Nome</Label>
            <Input
              id="tpl-name"
              value={name}
              disabled={readOnly}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tpl-desc">Descrição</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              disabled={readOnly}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Label htmlFor="tpl-spec">Especialidade</Label>
              <Select
                value={specialty}
                disabled={readOnly}
                onValueChange={(v) => setSpecialty(v as ReportTemplateSpecialty)}
              >
                <SelectTrigger id="tpl-spec">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TEMPLATE_SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {REPORT_TEMPLATE_SPECIALTY_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={saveMeta}
              disabled={readOnly || !metaDirty}
              aria-label="Salvar metadados"
            >
              Salvar
            </Button>
            {metaDirty && !readOnly && (
              <Button
                variant="ghost"
                onClick={() => {
                  setName(template.name);
                  setDescription(template.description);
                  setSpecialty(template.specialty);
                }}
              >
                Descartar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Seções</h3>
        <Button
          size="sm"
          disabled={readOnly}
          onClick={() => run(() => addSection(template.id, { title: "Nova seção" }))}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Adicionar seção
        </Button>
      </div>

      {template.sections.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma seção. Adicione ao menos uma para publicar.
        </p>
      )}

      <div className="space-y-4">
        {template.sections.map((s, sIdx) => (
          <SectionEditor
            key={s.id}
            template={template}
            sectionIndex={sIdx}
            section={s}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

function SectionEditor({
  template,
  section,
  sectionIndex,
  readOnly,
}: {
  template: ReportTemplate;
  section: ReportTemplate["sections"][number];
  sectionIndex: number;
  readOnly: boolean;
}) {
  const run = useDomainAction();
  const [title, setTitle] = useState(section.title);
  const [desc, setDesc] = useState(section.description);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useMemo(() => {
    setTitle(section.title);
    setDesc(section.description);
  }, [section.id, template.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = title.trim() !== section.title || desc.trim() !== section.description;
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === template.sections.length - 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline">#{sectionIndex + 1}</Badge>
          <CardTitle className="text-sm">Seção</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mover seção para cima"
            disabled={readOnly || isFirst}
            onClick={() => run(() => moveSection(template.id, section.id, "up"))}
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mover seção para baixo"
            disabled={readOnly || isLast}
            onClick={() => run(() => moveSection(template.id, section.id, "down"))}
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remover seção"
            disabled={readOnly}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor={`sec-title-${section.id}`}>Título</Label>
          <Input
            id={`sec-title-${section.id}`}
            value={title}
            disabled={readOnly}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`sec-desc-${section.id}`}>Descrição</Label>
          <Textarea
            id={`sec-desc-${section.id}`}
            value={desc}
            disabled={readOnly}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
          />
        </div>
        {dirty && !readOnly && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTitle(section.title);
                setDesc(section.description);
              }}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                run(() =>
                  updateSection(template.id, section.id, {
                    title: title.trim(),
                    description: desc.trim(),
                  }),
                )
              }
            >
              Salvar seção
            </Button>
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Blocos ({section.blocks.length})</span>
            <Button
              size="sm"
              variant="outline"
              disabled={readOnly}
              onClick={() =>
                run(() => addBlock(template.id, section.id, { kind: "paragrafo" }))
              }
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Novo bloco
            </Button>
          </div>

          {section.blocks.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum bloco.</p>
          )}

          {section.blocks.map((b, bIdx) => (
            <BlockEditor
              key={b.id}
              templateId={template.id}
              sectionId={section.id}
              block={b}
              blockIndex={bIdx}
              totalBlocks={section.blocks.length}
              variables={template.variables}
              readOnly={readOnly}
            />
          ))}
        </div>
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover seção?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os blocos desta seção serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => removeSection(template.id, section.id))}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function BlockEditor({
  templateId,
  sectionId,
  block,
  blockIndex,
  totalBlocks,
  variables,
  readOnly,
}: {
  templateId: ReportTemplate["id"];
  sectionId: ReportTemplateSectionId;
  block: ReportTemplate["sections"][number]["blocks"][number];
  blockIndex: number;
  totalBlocks: number;
  variables: ReportTemplate["variables"];
  readOnly: boolean;
}) {
  const run = useDomainAction();
  const [kind, setKind] = useState<ReportTemplateBlockKind>(block.kind);
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  const [refs, setRefs] = useState<string[]>([...block.variableRefs]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  useMemo(() => {
    setKind(block.kind);
    setTitle(block.title);
    setContent(block.content);
    setRefs([...block.variableRefs]);
  }, [block.id, block.title, block.content, block.kind, block.variableRefs]); // eslint-disable-line

  const dirty =
    kind !== block.kind ||
    title.trim() !== block.title ||
    content !== block.content ||
    refs.length !== block.variableRefs.length ||
    refs.some((r, i) => r !== block.variableRefs[i]);

  const knownKeys = new Set(variables.map((v) => v.key));
  const orphanRefs = refs.filter((r) => !knownKeys.has(r));

  return (
    <div className="rounded border bg-muted/20 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">#{blockIndex + 1}</Badge>
          <Select
            value={kind}
            disabled={readOnly}
            onValueChange={(v) => setKind(v as ReportTemplateBlockKind)}
          >
            <SelectTrigger className="h-8 w-40" aria-label="Tipo do bloco">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TEMPLATE_BLOCK_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {REPORT_TEMPLATE_BLOCK_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mover bloco para cima"
            disabled={readOnly || blockIndex === 0}
            onClick={() => run(() => moveBlock(templateId, sectionId, block.id as ReportTemplateBlockId, "up"))}
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mover bloco para baixo"
            disabled={readOnly || blockIndex === totalBlocks - 1}
            onClick={() => run(() => moveBlock(templateId, sectionId, block.id as ReportTemplateBlockId, "down"))}
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remover bloco"
            disabled={readOnly}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Input
          value={title}
          disabled={readOnly}
          placeholder="Título do bloco (opcional)"
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título do bloco"
        />
        <Textarea
          value={content}
          disabled={readOnly}
          placeholder="Conteúdo em texto puro. Use {{chave}} para referenciar variáveis."
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          aria-label="Conteúdo do bloco"
        />

        <div>
          <button
            type="button"
            className="text-xs text-primary underline underline-offset-2 disabled:no-underline"
            disabled={readOnly && variables.length === 0}
            onClick={() => setShowRefs((v) => !v)}
          >
            {showRefs ? "Ocultar referências" : `Referências (${refs.length})`}
          </button>
          {showRefs && (
            <div className="mt-2 space-y-1 rounded border bg-background p-2">
              {variables.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma variável definida no modelo.
                </p>
              )}
              {variables.map((v) => {
                const checked = refs.includes(v.key);
                return (
                  <label key={v.id} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={checked}
                      disabled={readOnly}
                      onCheckedChange={(c) => {
                        if (c) setRefs([...new Set([...refs, v.key])]);
                        else setRefs(refs.filter((r) => r !== v.key));
                      }}
                      aria-label={`Referenciar variável ${v.key}`}
                    />
                    <code>{v.key}</code>
                    <span className="text-muted-foreground">— {v.label}</span>
                  </label>
                );
              })}
              {orphanRefs.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Referências órfãs: {orphanRefs.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        {dirty && !readOnly && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKind(block.kind);
                setTitle(block.title);
                setContent(block.content);
                setRefs([...block.variableRefs]);
              }}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                run(() =>
                  updateBlock(templateId, sectionId, block.id as ReportTemplateBlockId, {
                    kind,
                    title: title.trim(),
                    content,
                    variableRefs: refs,
                  }),
                )
              }
            >
              Salvar bloco
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run(() =>
                  removeBlock(templateId, sectionId, block.id as ReportTemplateBlockId),
                )
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
