import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@/domain/core/assignment";
import type { PersonId } from "@/domain/core/ids";
import type { Relationship } from "@/domain/core/assignment";
import type { Person } from "@/domain/core/person";
import {
  RELATIONSHIP_TYPE_LABELS_PT,
  type PeoplePublicError,
} from "@/features/processos/process-people-model";

export type RelationshipDialogMode =
  | Readonly<{ kind: "create" }>
  | Readonly<{
      kind: "edit";
      relationship: Relationship;
      fromPerson: Person;
      toPerson: Person;
    }>;

export type ProcessRelationshipDialogProps = Readonly<{
  open: boolean;
  mode: RelationshipDialogMode;
  linkedPeople: readonly Person[];
  submitting: boolean;
  error: PeoplePublicError | null;
  onSubmit: (values: {
    fromPersonId: PersonId;
    toPersonId: PersonId;
    type: RelationshipType;
  }) => void;
  onReloadFromConflict: () => void;
  onCancel: () => void;
}>;

export function ProcessRelationshipDialog({
  open,
  mode,
  linkedPeople,
  submitting,
  error,
  onSubmit,
  onReloadFromConflict,
  onCancel,
}: ProcessRelationshipDialogProps) {
  const initialFrom: PersonId | "" =
    mode.kind === "edit"
      ? mode.fromPerson.id
      : linkedPeople[0]?.id ?? "";
  const initialTo: PersonId | "" =
    mode.kind === "edit"
      ? mode.toPerson.id
      : linkedPeople[1]?.id ?? linkedPeople[0]?.id ?? "";
  const initialType: RelationshipType =
    mode.kind === "edit" ? mode.relationship.type : "parent_child";

  const [from, setFrom] = React.useState<PersonId | "">(initialFrom);
  const [to, setTo] = React.useState<PersonId | "">(initialTo);
  const [type, setType] = React.useState<RelationshipType>(initialType);

  React.useEffect(() => {
    if (!open) return;
    setFrom(initialFrom);
    setTo(initialTo);
    setType(initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const editing = mode.kind === "edit";
  const canSubmit =
    !submitting && from !== "" && to !== "" && from !== to;

  const submit = () => {
    if (!canSubmit || from === "" || to === "") return;
    onSubmit({ fromPersonId: from, toPersonId: to, type });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar relação" : "Nova relação"}
          </DialogTitle>
          <DialogDescription>
            As relações só podem envolver pessoas já vinculadas a este processo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="from">De</Label>
            <Select
              value={from}
              onValueChange={(v) => setFrom(v as PersonId)}
              disabled={editing || submitting}
            >
              <SelectTrigger id="from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkedPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">Para</Label>
            <Select
              value={to}
              onValueChange={(v) => setTo(v as PersonId)}
              disabled={editing || submitting}
            >
              <SelectTrigger id="to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkedPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {from !== "" && to !== "" && from === to && (
              <p className="text-xs text-destructive">
                Escolha duas pessoas diferentes.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de relação</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as RelationshipType)}
              disabled={submitting}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {RELATIONSHIP_TYPE_LABELS_PT[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          {error?.kind === "conflict" ? (
            <Button onClick={onReloadFromConflict}>
              Recarregar pessoas e relações
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canSubmit}>
              {submitting && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
