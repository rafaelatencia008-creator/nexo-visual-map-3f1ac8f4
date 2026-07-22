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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AGE_CLASSIFICATIONS, type AgeClassification } from "@/domain/core/person";
import {
  CASE_PERSON_ROLES,
  type CasePersonRole,
} from "@/domain/core/assignment";
import type { Person } from "@/domain/core/person";
import type { CasePerson } from "@/domain/core/assignment";
import type { PersonId } from "@/domain/core/ids";
import {
  AGE_CLASSIFICATION_LABELS_PT,
  CASE_PERSON_ROLE_LABELS_PT,
  isMinorAge,
  normalizePersonLabel,
  type PeoplePublicError,
} from "@/features/processos/process-people-model";

export type PersonDialogMode =
  | Readonly<{ kind: "create-and-link" }>
  | Readonly<{ kind: "link-existing"; availablePersons: readonly Person[] }>
  | Readonly<{ kind: "edit"; person: Person; link: CasePerson }>;

export type ProcessPersonDialogProps = Readonly<{
  open: boolean;
  mode: PersonDialogMode;
  submitting: boolean;
  error: PeoplePublicError | null;
  onSubmit: (values: {
    displayLabel: string;
    ageClassification: AgeClassification;
    personId?: PersonId;
    role: CasePersonRole;
    restrictedByDefault: boolean;
  }) => void;
  onCancel: () => void;
}>;

export function ProcessPersonDialog({
  open,
  mode,
  submitting,
  error,
  onSubmit,
  onCancel,
}: ProcessPersonDialogProps) {
  const initialLabel = mode.kind === "edit" ? mode.person.displayLabel : "";
  const initialAge: AgeClassification =
    mode.kind === "edit" ? mode.person.ageClassification : "adult";
  const initialRole: CasePersonRole =
    mode.kind === "edit" ? mode.link.role : "applicant";
  const initialRestricted =
    mode.kind === "edit" ? mode.link.restrictedByDefault : false;
  const initialPersonId: PersonId | "" =
    mode.kind === "link-existing" && mode.availablePersons.length > 0
      ? mode.availablePersons[0].id
      : "";

  const [displayLabel, setDisplayLabel] = React.useState(initialLabel);
  const [age, setAge] = React.useState<AgeClassification>(initialAge);
  const [role, setRole] = React.useState<CasePersonRole>(initialRole);
  const [restricted, setRestricted] = React.useState(initialRestricted);
  const [personId, setPersonId] = React.useState<PersonId | "">(initialPersonId);

  React.useEffect(() => {
    if (!open) return;
    setDisplayLabel(initialLabel);
    setAge(initialAge);
    setRole(initialRole);
    setRestricted(initialRestricted);
    setPersonId(initialPersonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Menor força restrito na criação/vínculo. Na edição, o vínculo em si é
  // independente da idade — a restrição pode ser alternada manualmente.
  React.useEffect(() => {
    if (mode.kind !== "edit" && isMinorAge(age)) {
      setRestricted(true);
    }
  }, [age, mode.kind]);

  const title =
    mode.kind === "create-and-link"
      ? "Cadastrar e vincular pessoa"
      : mode.kind === "link-existing"
      ? "Vincular pessoa existente"
      : "Editar pessoa vinculada";

  const canSubmit =
    !submitting &&
    (mode.kind === "link-existing"
      ? personId !== ""
      : normalizePersonLabel(displayLabel).length > 0);

  const submit = () => {
    if (!canSubmit) return;
    if (mode.kind === "link-existing" && personId !== "") {
      const chosen = (mode as Extract<PersonDialogMode, { kind: "link-existing" }>)
        .availablePersons.find((p) => p.id === personId);
      onSubmit({
        displayLabel: chosen?.displayLabel ?? "",
        ageClassification: chosen?.ageClassification ?? "adult",
        personId,
        role,
        restrictedByDefault:
          chosen && isMinorAge(chosen.ageClassification) ? true : restricted,
      });
      return;
    }
    onSubmit({
      displayLabel: normalizePersonLabel(displayLabel),
      ageClassification: age,
      personId: mode.kind === "edit" ? mode.person.id : undefined,
      role,
      restrictedByDefault: isMinorAge(age) ? true : restricted,
    });
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Estas informações são simuladas e ficam apenas nesta sessão do
            navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {mode.kind === "link-existing" ? (
            <div className="space-y-2">
              <Label htmlFor="personId">Pessoa</Label>
              {mode.availablePersons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há pessoas disponíveis na organização para vincular.
                </p>
              ) : (
                <Select
                  value={personId}
                  onValueChange={(v) => setPersonId(v as PersonId)}
                  disabled={submitting}
                >
                  <SelectTrigger id="personId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mode.availablePersons.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayLabel} — {AGE_CLASSIFICATION_LABELS_PT[p.ageClassification]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayLabel">Nome ou identificação pública</Label>
                <Input
                  id="displayLabel"
                  value={displayLabel}
                  onChange={(e) => setDisplayLabel(e.target.value)}
                  maxLength={120}
                  disabled={submitting}
                  placeholder="Ex.: Requerente A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Classificação etária</Label>
                <Select
                  value={age}
                  onValueChange={(v) => setAge(v as AgeClassification)}
                  disabled={submitting}
                >
                  <SelectTrigger id="age">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_CLASSIFICATIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {AGE_CLASSIFICATION_LABELS_PT[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {mode.kind !== "edit" ? null : (
            <p className="text-xs text-muted-foreground">
              Estas alterações atualizam somente esta pessoa e este vínculo.
              Menores permanecem sempre com vínculo restrito.
            </p>
          )}

          {mode.kind !== "link-existing" || mode.availablePersons.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Papel no processo</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as CasePersonRole)}
                  disabled={submitting}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_PERSON_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {CASE_PERSON_ROLE_LABELS_PT[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Vínculo restrito</p>
                  <p className="text-xs text-muted-foreground">
                    Menores são sempre restritos.
                  </p>
                </div>
                <Switch
                  checked={restricted}
                  onCheckedChange={setRestricted}
                  disabled={submitting || (mode.kind !== "edit" && isMinorAge(age))}
                />
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
