import * as React from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AGE_CLASSIFICATIONS,
  type AgeClassification,
  type Person,
} from "@/domain/core/person";
import {
  CASE_PERSON_ROLES,
  type CasePerson,
  type CasePersonRole,
} from "@/domain/core/assignment";
import type { PersonId } from "@/domain/core/ids";
import {
  AGE_CLASSIFICATION_LABELS_PT,
  CASE_PERSON_ROLE_LABELS_PT,
  filterPersonsByDisplayLabel,
  isMinorAge,
  normalizePersonLabel,
  type PeoplePublicError,
} from "@/features/processos/process-people-model";

export type PersonDialogMode =
  | Readonly<{ kind: "create-and-link" }>
  | Readonly<{ kind: "link-existing"; availablePersons: readonly Person[] }>
  | Readonly<{
      kind: "retry-created-link";
      person: Person;
      role: CasePersonRole;
      restrictedByDefault: boolean;
    }>
  | Readonly<{ kind: "edit-person"; person: Person }>
  | Readonly<{ kind: "edit-link"; person: Person; link: CasePerson }>;

export type PersonDialogCatalogState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; persons: readonly Person[] }
  | { kind: "error"; error: PeoplePublicError };

export type ProcessPersonDialogProps = Readonly<{
  open: boolean;
  mode: PersonDialogMode;
  catalog: PersonDialogCatalogState;
  submitting: boolean;
  error: PeoplePublicError | null;
  onRetryCatalog: () => void;
  onCreateAndLink: (values: {
    displayLabel: string;
    ageClassification: AgeClassification;
    role: CasePersonRole;
    restrictedByDefault: boolean;
  }) => void;
  onRetryCreatedLink: () => void;
  onLinkExisting: (values: {
    personId: PersonId;
    role: CasePersonRole;
    restrictedByDefault: boolean;
    ageClassification: AgeClassification;
  }) => void;
  onEditPerson: (
    person: Person,
    values: {
      displayLabel: string;
      ageClassification: AgeClassification;
    },
  ) => void;
  onEditLink: (
    link: CasePerson,
    values: {
      role: CasePersonRole;
      restrictedByDefault: boolean;
    },
  ) => void;
  onReloadFromConflict: () => void;
  onCancel: () => void;
}>;

export function ProcessPersonDialog(props: ProcessPersonDialogProps) {
  const {
    open,
    mode,
    catalog,
    submitting,
    error,
    onRetryCatalog,
    onCreateAndLink,
    onRetryCreatedLink,
    onLinkExisting,
    onEditPerson,
    onEditLink,
    onReloadFromConflict,
    onCancel,
  } = props;

  // Estado local por campo.
  const initialLabel =
    mode.kind === "edit-person" || mode.kind === "edit-link"
      ? mode.person.displayLabel
      : "";
  const initialAge: AgeClassification =
    mode.kind === "edit-person" || mode.kind === "edit-link"
      ? mode.person.ageClassification
      : "adult";
  const initialRole: CasePersonRole =
    mode.kind === "edit-link"
      ? mode.link.role
      : mode.kind === "retry-created-link"
      ? mode.role
      : "applicant";
  const initialRestricted =
    mode.kind === "edit-link"
      ? mode.link.restrictedByDefault
      : mode.kind === "retry-created-link"
      ? mode.restrictedByDefault
      : false;
  const initialPersonId: PersonId | "" = "";

  const [displayLabel, setDisplayLabel] = React.useState(initialLabel);
  const [age, setAge] = React.useState<AgeClassification>(initialAge);
  const [role, setRole] = React.useState<CasePersonRole>(initialRole);
  const [restricted, setRestricted] = React.useState(initialRestricted);
  const [personId, setPersonId] = React.useState<PersonId | "">(initialPersonId);
  const [search, setSearch] = React.useState("");

  const modeKind = mode.kind;
  React.useEffect(() => {
    if (!open) return;
    setDisplayLabel(initialLabel);
    setAge(initialAge);
    setRole(initialRole);
    setRestricted(initialRestricted);
    setPersonId(initialPersonId);
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modeKind]);

  // Menores forçam vínculo restrito, inclusive na edição do vínculo.
  React.useEffect(() => {
    if (isMinorAge(age)) setRestricted(true);
  }, [age]);

  // Ao entrar em edit-link, se a pessoa vinculada é menor, força restrito.
  React.useEffect(() => {
    if (mode.kind === "edit-link" && isMinorAge(mode.person.ageClassification)) {
      setRestricted(true);
    }
  }, [mode]);

  // Ao selecionar pessoa existente, força restrito se for menor.
  React.useEffect(() => {
    if (mode.kind !== "link-existing") return;
    if (personId === "") return;
    const p = mode.availablePersons.find((x) => x.id === personId);
    if (p && isMinorAge(p.ageClassification)) setRestricted(true);
  }, [personId, mode]);

  const title =
    mode.kind === "create-and-link"
      ? "Cadastrar e vincular pessoa"
      : mode.kind === "link-existing"
      ? "Vincular pessoa existente"
      : mode.kind === "retry-created-link"
      ? "Concluir vínculo da pessoa cadastrada"
      : mode.kind === "edit-person"
      ? "Editar pessoa"
      : "Editar vínculo com o processo";

  const isConflict = error?.kind === "conflict";

  // Lista disponível para vincular (já sem pessoas atualmente vinculadas ao processo).
  const availablePersons: readonly Person[] =
    mode.kind === "link-existing" ? mode.availablePersons : [];
  // Resultado local da pesquisa por displayLabel (preserva ordem recebida).
  const filteredPersons: readonly Person[] = React.useMemo(
    () => filterPersonsByDisplayLabel(availablePersons, search),
    [availablePersons, search],
  );

  const canSubmit = (() => {
    if (submitting) return false;
    if (isConflict) return false;
    if (mode.kind === "create-and-link") {
      return normalizePersonLabel(displayLabel).length > 0;
    }
    if (mode.kind === "link-existing") {
      return catalog.kind === "ready" && personId !== "";
    }
    if (mode.kind === "retry-created-link") {
      return true;
    }
    if (mode.kind === "edit-person") {
      return normalizePersonLabel(displayLabel).length > 0;
    }
    return true; // edit-link
  })();

  const submit = () => {
    if (!canSubmit) return;
    if (mode.kind === "create-and-link") {
      onCreateAndLink({
        displayLabel: normalizePersonLabel(displayLabel),
        ageClassification: age,
        role,
        restrictedByDefault: isMinorAge(age) ? true : restricted,
      });
      return;
    }
    if (mode.kind === "link-existing") {
      const chosen = mode.availablePersons.find((p) => p.id === personId);
      if (!chosen) return;
      onLinkExisting({
        personId: chosen.id,
        role,
        restrictedByDefault: isMinorAge(chosen.ageClassification)
          ? true
          : restricted,
        ageClassification: chosen.ageClassification,
      });
      return;
    }
    if (mode.kind === "retry-created-link") {
      onRetryCreatedLink();
      return;
    }
    if (mode.kind === "edit-person") {
      onEditPerson(mode.person, {
        displayLabel: normalizePersonLabel(displayLabel),
        ageClassification: age,
      });
      return;
    }
    // edit-link
    onEditLink(mode.link, {
      role,
      restrictedByDefault: isMinorAge(mode.person.ageClassification)
        ? true
        : restricted,
    });
  };

  const showPersonFields =
    mode.kind === "create-and-link" || mode.kind === "edit-person";
  const showLinkFields =
    mode.kind === "create-and-link" ||
    mode.kind === "link-existing" ||
    mode.kind === "edit-link";
  const showRetrySummary = mode.kind === "retry-created-link";
  const restrictedLocked =
    (showPersonFields && isMinorAge(age)) ||
    (mode.kind === "edit-link" && isMinorAge(mode.person.ageClassification)) ||
    (mode.kind === "link-existing" &&
      personId !== "" &&
      isMinorAge(
        availablePersons.find((p) => p.id === personId)?.ageClassification ??
          "adult",
      ));


  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onCancel();
      }}
    >
      <DialogContent className="max-w-lg" aria-busy={submitting}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Estas informações são simuladas e ficam apenas nesta sessão do
            navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {mode.kind === "link-existing" && (
            <div className="space-y-2">
              <Label htmlFor="personId">Pessoa</Label>
              {catalog.kind === "loading" && (
                <p
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Carregando pessoas disponíveis.
                </p>
              )}
              {catalog.kind === "error" && (
                <div className="space-y-2">
                  <Alert variant="destructive" role="alert">
                    <AlertTitle>
                      Não foi possível carregar as pessoas
                    </AlertTitle>
                    <AlertDescription>{catalog.error.message}</AlertDescription>
                  </Alert>
                  <Button size="sm" variant="outline" onClick={onRetryCatalog}>
                    <RefreshCw
                      className="mr-2 h-4 w-4"
                      aria-hidden="true"
                    />
                    Tentar novamente
                  </Button>
                </div>
              )}
              {catalog.kind === "ready" &&
                (availablePersons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Não há pessoas disponíveis para vincular.
                  </p>
                ) : (
                  <>
                    <Input
                      id="personSearch"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por identificação"
                      aria-label="Buscar pessoa"
                      disabled={submitting}
                    />
                    {filteredPersons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma pessoa encontrada.
                      </p>
                    ) : (
                      <Select
                        value={personId}
                        onValueChange={(v) => setPersonId(v as PersonId)}
                        disabled={submitting}
                      >
                        <SelectTrigger id="personId">
                          <SelectValue placeholder="Selecione uma pessoa" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPersons.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.displayLabel} —{" "}
                              {AGE_CLASSIFICATION_LABELS_PT[p.ageClassification]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                ))}
            </div>
          )}

          {showPersonFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayLabel">
                  Nome ou identificação pública
                </Label>
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

          {showRetrySummary && mode.kind === "retry-created-link" && (
            <div className="rounded-md border border-border p-3 text-sm">
              <p>
                A pessoa <strong>{mode.person.displayLabel}</strong> já foi
                cadastrada. Tente vincular novamente ao processo.
              </p>
            </div>
          )}

          {showLinkFields && (
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
                  disabled={submitting || restrictedLocked}
                  aria-label="Vínculo restrito"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          {isConflict ? (
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
              {mode.kind === "retry-created-link"
                ? "Tentar vincular novamente"
                : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
