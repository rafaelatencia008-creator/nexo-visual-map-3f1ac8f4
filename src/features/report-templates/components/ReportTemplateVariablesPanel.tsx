import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  addVariable,
  isVariableInUse,
  removeVariable,
  updateVariable,
} from "../report-template-store";
import {
  REPORT_TEMPLATE_VARIABLE_KINDS,
  REPORT_TEMPLATE_VARIABLE_KIND_LABEL,
  ReportTemplateError,
  type ReportTemplate,
  type ReportTemplateVariableId,
  type ReportTemplateVariableKind,
} from "../report-template-types";
import { friendlyReportTemplateError } from "../report-template-error-labels";
import { toast } from "sonner";

interface Props {
  readonly template: ReportTemplate;
  readonly readOnly: boolean;
}

export function ReportTemplateVariablesPanel({ template, readOnly }: Props) {
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newKind, setNewKind] = useState<ReportTemplateVariableKind>("texto");
  const [newRequired, setNewRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{
    id: ReportTemplateVariableId;
    key: string;
    inUse: boolean;
  } | null>(null);

  function addNew() {
    if (readOnly) return;
    setError(null);
    try {
      addVariable(template.id, {
        key: newKey,
        label: newLabel || newKey,
        kind: newKind,
        required: newRequired,
      });
      setNewKey("");
      setNewLabel("");
      setNewKind("texto");
      setNewRequired(false);
      toast.success("Variável adicionada.");
    } catch (e) {
      setError(friendlyReportTemplateError(e));
    }
  }

  function askRemove(id: ReportTemplateVariableId, key: string) {
    // First safe attempt: no force.
    try {
      removeVariable(template.id, id);
      toast.success("Variável removida.");
    } catch (e) {
      if (e instanceof ReportTemplateError && e.code === "variable_in_use") {
        setPendingRemove({ id, key, inUse: true });
      } else {
        toast.error(friendlyReportTemplateError(e));
      }
    }
  }

  function confirmForceRemove() {
    if (!pendingRemove) return;
    try {
      removeVariable(template.id, pendingRemove.id, { force: true });
      toast.success("Variável removida (forçado).");
    } catch (e) {
      toast.error(friendlyReportTemplateError(e));
    } finally {
      setPendingRemove(null);
    }
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova variável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="var-key">Chave</Label>
                <Input
                  id="var-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="ex: cliente_nome"
                  aria-invalid={error !== null}
                />
              </div>
              <div>
                <Label htmlFor="var-label">Rótulo</Label>
                <Input
                  id="var-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="var-kind">Tipo</Label>
                <Select
                  value={newKind}
                  onValueChange={(v) => setNewKind(v as ReportTemplateVariableKind)}
                >
                  <SelectTrigger id="var-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TEMPLATE_VARIABLE_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {REPORT_TEMPLATE_VARIABLE_KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newRequired}
                    onCheckedChange={(v) => setNewRequired(v === true)}
                    aria-label="Variável obrigatória"
                  />
                  Obrigatória
                </label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={addNew}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variáveis ({template.variables.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {template.variables.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma variável.</p>
          )}
          {template.variables.map((v) => (
            <VariableRow
              key={v.id}
              template={template}
              variable={v}
              readOnly={readOnly}
              onAskRemove={askRemove}
            />
          ))}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(v) => {
          if (!v) setPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Variável em uso</AlertDialogTitle>
            <AlertDialogDescription>
              A variável <code>{pendingRemove?.key}</code> está referenciada por blocos deste
              modelo. Remover mesmo assim manterá o texto dos blocos, mas as referências
              ficarão órfãs até serem corrigidas manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmForceRemove}>
              Remover mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VariableRow({
  template,
  variable,
  readOnly,
  onAskRemove,
}: {
  template: ReportTemplate;
  variable: ReportTemplate["variables"][number];
  readOnly: boolean;
  onAskRemove: (id: ReportTemplateVariableId, key: string) => void;
}) {
  const [label, setLabel] = useState(variable.label);
  const [kind, setKind] = useState<ReportTemplateVariableKind>(variable.kind);
  const [required, setRequired] = useState(variable.required);
  const [defaultValue, setDefaultValue] = useState(variable.defaultValue);

  useMemo(() => {
    setLabel(variable.label);
    setKind(variable.kind);
    setRequired(variable.required);
    setDefaultValue(variable.defaultValue);
  }, [variable.id, variable.label, variable.kind, variable.required, variable.defaultValue]);

  const dirty =
    label !== variable.label ||
    kind !== variable.kind ||
    required !== variable.required ||
    defaultValue !== variable.defaultValue;

  const inUse = isVariableInUse(template.id, variable.id);

  return (
    <div className="grid gap-2 rounded border p-3 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <div className="flex items-center gap-1">
          <code className="text-xs">{variable.key}</code>
          {inUse && (
            <Badge variant="secondary" className="text-[10px]">
              em uso
            </Badge>
          )}
        </div>
        <Input
          value={label}
          disabled={readOnly}
          onChange={(e) => setLabel(e.target.value)}
          aria-label={`Rótulo da variável ${variable.key}`}
          className="mt-1"
        />
      </div>
      <Select
        value={kind}
        disabled={readOnly}
        onValueChange={(v) => setKind(v as ReportTemplateVariableKind)}
      >
        <SelectTrigger aria-label={`Tipo da variável ${variable.key}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REPORT_TEMPLATE_VARIABLE_KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {REPORT_TEMPLATE_VARIABLE_KIND_LABEL[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={defaultValue}
        disabled={readOnly}
        onChange={(e) => setDefaultValue(e.target.value)}
        placeholder="Valor padrão"
        aria-label={`Valor padrão da variável ${variable.key}`}
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={required}
          disabled={readOnly}
          onCheckedChange={(v) => setRequired(v === true)}
          aria-label={`Variável ${variable.key} obrigatória`}
        />
        Obrigatória
      </label>
      <div className="flex justify-end gap-1">
        {dirty && !readOnly && (
          <Button
            size="sm"
            onClick={() => {
              try {
                updateVariable(template.id, variable.id, {
                  label,
                  kind,
                  required,
                  defaultValue,
                });
                toast.success("Variável atualizada.");
              } catch (e) {
                toast.error(friendlyReportTemplateError(e));
              }
            }}
          >
            Salvar
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          disabled={readOnly}
          aria-label={`Remover variável ${variable.key}`}
          onClick={() => onAskRemove(variable.id, variable.key)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
