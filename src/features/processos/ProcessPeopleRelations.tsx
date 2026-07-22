/**
 * LV-08.4.1 — Seção "Pessoas e Relações".
 *
 * Correções principais em relação à LV-08.4:
 * - Carga inicial paralela sem `persons.list`; pessoas vinculadas resolvidas
 *   por `persons.getById` a partir dos IDs distintos dos vínculos.
 * - Permissões avaliadas com o escopo correto de cada ação
 *   (person.* sem `caseId`, casePerson.* / relationship.* com `caseId`).
 * - `unresolved` de vínculos e relações não é ignorado.
 * - Catálogo de pessoas existentes é carregado somente ao abrir o fluxo
 *   "Vincular pessoa existente".
 * - Trava síncrona `useRef` impede escritas duplicadas por cliques rápidos.
 * - Ação genérica "Editar" separada em "Editar pessoa" e "Editar vínculo".
 * - Menores mantêm sempre `restrictedByDefault: true`, inclusive na edição.
 * - Conflitos oferecem "Recarregar pessoas e relações".
 * - Estados acessíveis (`role="status"`, `role="alert"`, `aria-live`,
 *   `aria-busy`).
 */

import * as React from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { toast } from "sonner";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import type { Case } from "@/domain/core/case";
import type { Person } from "@/domain/core/person";
import type { CasePerson, Relationship } from "@/domain/core/assignment";
import type { CaseId, PersonId } from "@/domain/core/ids";
import type { ServiceError, ServiceResult } from "@/domain/services/result";
import {
  AGE_CLASSIFICATION_LABELS_PT,
  CASE_PERSON_ROLE_LABELS_PT,
  PEOPLE_CASE_ACTIONS,
  PEOPLE_PERSON_ACTIONS,
  RELATIONSHIP_TYPE_LABELS_PT,
  buildCasePersonUpdateInput,
  buildCreateCasePersonInput,
  buildCreatePersonInput,
  buildCreateRelationshipInput,
  buildLinkedCasePeopleView,
  buildPeoplePermissions,
  buildPersonUpdateInput,
  buildRelationshipUpdateInput,
  buildRelationshipViews,
  collectDistinctLinkedPersonIds,
  emptyPeoplePermissions,
  mapPeopleError,
  type LinkedCasePersonView,
  type PeoplePermissions,
  type PeoplePublicError,
  type PeopleWriteAction,
  type ProcessRelationshipView,
} from "@/features/processos/process-people-model";
import {
  ProcessPersonDialog,
  type PersonDialogMode,
} from "@/features/processos/ProcessPersonDialog";
import {
  ProcessRelationshipDialog,
  type RelationshipDialogMode,
} from "@/features/processos/ProcessRelationshipDialog";

export type ProcessPeopleRelationsProps = Readonly<{
  case: Case;
}>;

type LoadedData = Readonly<{
  linked: readonly LinkedCasePersonView[];
  relationships: readonly ProcessRelationshipView[];
  permissions: PeoplePermissions;
}>;

type SectionState =
  | { kind: "loading" }
  | { kind: "error"; error: PeoplePublicError }
  | { kind: "ready"; data: LoadedData; refreshing: boolean };

type CatalogState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; persons: readonly Person[] }
  | { kind: "error"; error: PeoplePublicError };

type PersonDialogState =
  | { kind: "closed" }
  | {
      kind: "open";
      mode: PersonDialogMode;
      error: PeoplePublicError | null;
      submitting: boolean;
    };

type RelDialogState =
  | { kind: "closed" }
  | {
      kind: "open";
      mode: RelationshipDialogMode;
      error: PeoplePublicError | null;
      submitting: boolean;
    };

type ConfirmState =
  | { kind: "closed" }
  | {
      kind: "remove-link";
      link: CasePerson;
      label: string;
      error: PeoplePublicError | null;
    }
  | {
      kind: "remove-relationship";
      relationship: Relationship;
      label: string;
      error: PeoplePublicError | null;
    };

export function ProcessPeopleRelations({ case: c }: ProcessPeopleRelationsProps) {
  const { environment, context } = useMockDomain();
  const caseId: CaseId = c.id;
  const [state, setState] = React.useState<SectionState>({ kind: "loading" });
  const [personDialog, setPersonDialog] = React.useState<PersonDialogState>({
    kind: "closed",
  });
  const [catalog, setCatalog] = React.useState<CatalogState>({ kind: "idle" });
  const [relDialog, setRelDialog] = React.useState<RelDialogState>({
    kind: "closed",
  });
  const [confirm, setConfirm] = React.useState<ConfirmState>({ kind: "closed" });
  const [removing, setRemoving] = React.useState(false);
  const requestIdRef = React.useRef(0);
  const catalogRequestIdRef = React.useRef(0);
  const mountedRef = React.useRef(true);
  // Trava síncrona: bloqueia qualquer escrita concorrente.
  const writeOperationRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const tryAcquireWrite = React.useCallback((label: string): boolean => {
    if (writeOperationRef.current !== null) return false;
    writeOperationRef.current = label;
    return true;
  }, []);
  const releaseWrite = React.useCallback(() => {
    writeOperationRef.current = null;
  }, []);

  // ---- Carga completa (initial / refresh) -------------------------------

  const loadAll = React.useCallback(
    async (mode: "initial" | "refresh") => {
      const reqId = ++requestIdRef.current;
      if (mode === "initial") {
        setState({ kind: "loading" });
      } else {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, refreshing: true } : prev,
        );
      }

      // Permissões: person.* sem caseId; casePerson.* / relationship.* com caseId.
      const personPermPromises = PEOPLE_PERSON_ACTIONS.map((action) =>
        environment.services.permissions.evaluate(context, { action }),
      );
      const casePermPromises = PEOPLE_CASE_ACTIONS.map((action) =>
        environment.services.permissions.evaluate(context, { action, caseId }),
      );

      const [casePeopleRes, relsRes, ...permResults] = await Promise.all([
        environment.services.casePersons.listByCase(context, caseId, {
          limit: 100,
        }),
        environment.services.relationships.listByCase(context, caseId, {
          limit: 100,
        }),
        ...personPermPromises,
        ...casePermPromises,
      ]);

      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      if (!casePeopleRes.ok) {
        setState({
          kind: "error",
          error: mapPeopleError(casePeopleRes.error),
        });
        return;
      }
      if (!relsRes.ok) {
        setState({ kind: "error", error: mapPeopleError(relsRes.error) });
        return;
      }

      // Monta o mapa de permissões sem cast.
      const entries: [PeopleWriteAction, boolean][] = [];
      let permError: ServiceError | null = null;
      const allActions: readonly PeopleWriteAction[] = [
        ...PEOPLE_PERSON_ACTIONS,
        ...PEOPLE_CASE_ACTIONS,
      ];
      for (let i = 0; i < allActions.length; i++) {
        const r = permResults[i];
        if (!r.ok) {
          permError = r.error;
          break;
        }
        entries.push([allActions[i], r.data.allowed === true]);
      }
      if (permError) {
        setState({ kind: "error", error: mapPeopleError(permError) });
        return;
      }
      const permissions = buildPeoplePermissions(entries);

      // Resolve pessoas vinculadas via getById em paralelo (deduplicado).
      const distinctIds = collectDistinctLinkedPersonIds(
        casePeopleRes.data.items,
      );
      const personResults: ServiceResult<Person>[] = await Promise.all(
        distinctIds.map((id) =>
          environment.services.persons.getById(context, id),
        ),
      );
      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      const resolved: Person[] = [];
      for (const r of personResults) {
        if (!r.ok) {
          setState({ kind: "error", error: mapPeopleError(r.error) });
          return;
        }
        resolved.push(r.data);
      }

      const linkedBuild = buildLinkedCasePeopleView(
        casePeopleRes.data.items,
        resolved,
      );
      if (linkedBuild.unresolved.length > 0) {
        setState({
          kind: "error",
          error: {
            kind: "generic",
            message:
              "Não foi possível resolver todas as pessoas vinculadas ao processo.",
          },
        });
        return;
      }

      const relationshipBuild = buildRelationshipViews(
        relsRes.data.items,
        linkedBuild.views,
      );
      if (relationshipBuild.unresolved.length > 0) {
        setState({
          kind: "error",
          error: {
            kind: "generic",
            message:
              "Não foi possível resolver todas as relações do processo.",
          },
        });
        return;
      }

      setState({
        kind: "ready",
        data: {
          linked: linkedBuild.views,
          relationships: relationshipBuild.views,
          permissions,
        },
        refreshing: false,
      });
    },
    [environment, context, caseId],
  );

  React.useEffect(() => {
    void loadAll("initial");
  }, [loadAll]);

  // ---- Catálogo de pessoas existentes (lazy) ----------------------------

  const loadCatalog = React.useCallback(async () => {
    const reqId = ++catalogRequestIdRef.current;
    setCatalog({ kind: "loading" });
    const res = await environment.services.persons.list(context, {
      page: { limit: 100 },
      sortBy: "displayLabel",
      sortDir: "asc",
    });
    if (!mountedRef.current || reqId !== catalogRequestIdRef.current) return;
    if (!res.ok) {
      setCatalog({ kind: "error", error: mapPeopleError(res.error) });
      return;
    }
    setCatalog({ kind: "ready", persons: res.data.items });
  }, [environment, context]);

  const openLinkExisting = React.useCallback(() => {
    setPersonDialog({
      kind: "open",
      submitting: false,
      error: null,
      mode: { kind: "link-existing", availablePersons: [] },
    });
    void loadCatalog();
  }, [loadCatalog]);

  // Sincroniza o modo do diálogo "link-existing" com o catálogo carregado,
  // excluindo pessoas já vinculadas.
  React.useEffect(() => {
    if (personDialog.kind !== "open") return;
    if (personDialog.mode.kind !== "link-existing") return;
    if (catalog.kind !== "ready") return;
    if (state.kind !== "ready") return;
    const linkedIds = new Set(state.data.linked.map((v) => v.person.id));
    const availablePersons = catalog.persons.filter(
      (p) => !linkedIds.has(p.id),
    );
    setPersonDialog({
      kind: "open",
      submitting: false,
      error: personDialog.error,
      mode: { kind: "link-existing", availablePersons },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, state.kind]);

  // ---- Handlers de escrita ----------------------------------------------

  const finishAndReload = () => {
    setPersonDialog({ kind: "closed" });
    setCatalog({ kind: "idle" });
    void loadAll("refresh");
  };

  const setPersonDialogError = (
    mode: PersonDialogMode,
    error: PeoplePublicError,
  ) => {
    setPersonDialog({ kind: "open", mode, submitting: false, error });
  };

  const handleCreateAndLink = async (values: {
    displayLabel: string;
    ageClassification: Person["ageClassification"];
    role: CasePerson["role"];
    restrictedByDefault: boolean;
  }) => {
    if (personDialog.kind !== "open") return;
    if (!tryAcquireWrite("create-and-link")) return;
    const currentMode = personDialog.mode;
    setPersonDialog({
      kind: "open",
      mode: currentMode,
      submitting: true,
      error: null,
    });
    try {
      const created = await environment.services.persons.create(
        context,
        buildCreatePersonInput({
          displayLabel: values.displayLabel,
          ageClassification: values.ageClassification,
          role: values.role,
          restrictedByDefault: values.restrictedByDefault,
        }),
      );
      if (!created.ok) {
        setPersonDialogError(currentMode, mapPeopleError(created.error));
        return;
      }
      const link = await environment.services.casePersons.create(
        context,
        buildCreateCasePersonInput(
          caseId,
          created.data.id,
          values.role,
          values.restrictedByDefault,
          values.ageClassification,
        ),
      );
      if (!link.ok) {
        // Pessoa foi criada; vínculo falhou. Preservamos a pessoa e o papel.
        setPersonDialog({
          kind: "open",
          submitting: false,
          error: {
            kind: mapPeopleError(link.error).kind,
            message:
              "A pessoa foi cadastrada, mas não pôde ser vinculada ao processo.",
          },
          mode: {
            kind: "retry-created-link",
            person: created.data,
            role: values.role,
            restrictedByDefault: values.restrictedByDefault,
          },
        });
        return;
      }
      toast.success("Pessoa cadastrada e vinculada.");
      finishAndReload();
    } finally {
      releaseWrite();
    }
  };

  const handleRetryCreatedLink = async () => {
    if (personDialog.kind !== "open") return;
    if (personDialog.mode.kind !== "retry-created-link") return;
    if (!tryAcquireWrite("retry-created-link")) return;
    const mode = personDialog.mode;
    setPersonDialog({
      kind: "open",
      mode,
      submitting: true,
      error: null,
    });
    try {
      const link = await environment.services.casePersons.create(
        context,
        buildCreateCasePersonInput(
          caseId,
          mode.person.id,
          mode.role,
          mode.restrictedByDefault,
          mode.person.ageClassification,
        ),
      );
      if (!link.ok) {
        setPersonDialogError(mode, mapPeopleError(link.error));
        return;
      }
      toast.success("Pessoa vinculada ao processo.");
      finishAndReload();
    } finally {
      releaseWrite();
    }
  };

  const handleLinkExisting = async (values: {
    personId: PersonId;
    role: CasePerson["role"];
    restrictedByDefault: boolean;
    ageClassification: Person["ageClassification"];
  }) => {
    if (personDialog.kind !== "open") return;
    if (!tryAcquireWrite("link-existing")) return;
    const currentMode = personDialog.mode;
    setPersonDialog({
      kind: "open",
      mode: currentMode,
      submitting: true,
      error: null,
    });
    try {
      const r = await environment.services.casePersons.create(
        context,
        buildCreateCasePersonInput(
          caseId,
          values.personId,
          values.role,
          values.restrictedByDefault,
          values.ageClassification,
        ),
      );
      if (!r.ok) {
        setPersonDialogError(currentMode, mapPeopleError(r.error));
        return;
      }
      toast.success("Pessoa vinculada ao processo.");
      finishAndReload();
    } finally {
      releaseWrite();
    }
  };

  const handleEditPerson = async (
    person: Person,
    values: {
      displayLabel: string;
      ageClassification: Person["ageClassification"];
    },
  ) => {
    if (personDialog.kind !== "open") return;
    if (!tryAcquireWrite("edit-person")) return;
    const currentMode = personDialog.mode;
    setPersonDialog({
      kind: "open",
      mode: currentMode,
      submitting: true,
      error: null,
    });
    try {
      const patch = buildPersonUpdateInput(person, values);
      if (!patch) {
        setPersonDialog({ kind: "closed" });
        return;
      }
      const r = await environment.services.persons.update(
        context,
        person.id,
        patch,
      );
      if (!r.ok) {
        setPersonDialogError(currentMode, mapPeopleError(r.error));
        return;
      }
      toast.success("Pessoa atualizada.");
      finishAndReload();
    } finally {
      releaseWrite();
    }
  };

  const handleEditLink = async (
    link: CasePerson,
    values: {
      role: CasePerson["role"];
      restrictedByDefault: boolean;
    },
  ) => {
    if (personDialog.kind !== "open") return;
    if (!tryAcquireWrite("edit-link")) return;
    const currentMode = personDialog.mode;
    setPersonDialog({
      kind: "open",
      mode: currentMode,
      submitting: true,
      error: null,
    });
    try {
      const patch = buildCasePersonUpdateInput(link, values);
      if (!patch) {
        setPersonDialog({ kind: "closed" });
        return;
      }
      const r = await environment.services.casePersons.update(
        context,
        caseId,
        patch,
      );
      if (!r.ok) {
        setPersonDialogError(currentMode, mapPeopleError(r.error));
        return;
      }
      toast.success("Vínculo atualizado.");
      finishAndReload();
    } finally {
      releaseWrite();
    }
  };

  const handleRelationshipSubmit = async (values: {
    fromPersonId: PersonId;
    toPersonId: PersonId;
    type: Relationship["type"];
  }) => {
    if (relDialog.kind !== "open") return;
    const opLabel =
      relDialog.mode.kind === "edit" ? "edit-relationship" : "create-relationship";
    if (!tryAcquireWrite(opLabel)) return;
    const mode = relDialog.mode;
    setRelDialog({
      kind: "open",
      mode,
      submitting: true,
      error: null,
    });
    try {
      if (mode.kind === "edit") {
        const patch = buildRelationshipUpdateInput(
          mode.relationship,
          values.type,
        );
        if (!patch) {
          setRelDialog({ kind: "closed" });
          return;
        }
        const r = await environment.services.relationships.update(
          context,
          caseId,
          patch,
        );
        if (!r.ok) {
          setRelDialog({
            kind: "open",
            mode,
            submitting: false,
            error: mapPeopleError(r.error),
          });
          return;
        }
        toast.success("Relação atualizada.");
      } else {
        const r = await environment.services.relationships.create(
          context,
          buildCreateRelationshipInput(caseId, values),
        );
        if (!r.ok) {
          setRelDialog({
            kind: "open",
            mode,
            submitting: false,
            error: mapPeopleError(r.error),
          });
          return;
        }
        toast.success("Relação registrada.");
      }
      setRelDialog({ kind: "closed" });
      void loadAll("refresh");
    } finally {
      releaseWrite();
    }
  };

  const doRemove = async () => {
    if (confirm.kind === "closed") return;
    const opLabel =
      confirm.kind === "remove-link" ? "remove-link" : "remove-relationship";
    if (!tryAcquireWrite(opLabel)) return;
    setRemoving(true);
    try {
      let error: PeoplePublicError | null = null;
      if (confirm.kind === "remove-link") {
        const r = await environment.services.casePersons.remove(
          context,
          caseId,
          confirm.link.id,
          confirm.link.metadata.version,
        );
        if (!r.ok) error = mapPeopleError(r.error);
      } else {
        const r = await environment.services.relationships.remove(
          context,
          caseId,
          confirm.relationship.id,
          confirm.relationship.metadata.version,
        );
        if (!r.ok) error = mapPeopleError(r.error);
      }
      setRemoving(false);
      if (error) {
        // Mantém o diálogo aberto exibindo o erro para o próximo passo ficar claro.
        setConfirm({ ...confirm, error });
        return;
      }
      toast.success("Removido com sucesso.");
      setConfirm({ kind: "closed" });
      void loadAll("refresh");
    } finally {
      releaseWrite();
    }
  };

  // ---- Renders auxiliares -----------------------------------------------

  const linkedPeople = React.useMemo<readonly Person[]>(() => {
    if (state.kind !== "ready") return [];
    return state.data.linked.map((v) => v.person);
  }, [state]);

  const reloadFromConflict = () => {
    setPersonDialog({ kind: "closed" });
    setRelDialog({ kind: "closed" });
    setConfirm({ kind: "closed" });
    setCatalog({ kind: "idle" });
    void loadAll("refresh");
  };

  if (state.kind === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pessoas e relações</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Carregando pessoas e relações.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pessoas e relações</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Não foi possível carregar pessoas e relações.</AlertTitle>
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadAll("initial")}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Tentar
              novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { linked, relationships, permissions } = state.data;
  const canCreatePerson =
    permissions["person.create"] && permissions["casePerson.create"];
  const canLinkExisting = permissions["casePerson.create"];
  const canEditPerson = permissions["person.update"];
  const canEditLink = permissions["casePerson.update"];
  const canRemoveLink = permissions["casePerson.remove"];
  const canCreateRel = permissions["relationship.create"];
  const canEditRel = permissions["relationship.update"];
  const canRemoveRel = permissions["relationship.remove"];

  return (
    <>
      <Card aria-busy={state.refreshing}>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" /> Pessoas vinculadas
            {state.refreshing && (
              <span
                role="status"
                aria-live="polite"
                className="flex items-center gap-1 text-xs font-normal text-muted-foreground"
              >
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                <span>Atualizando pessoas e relações.</span>
              </span>
            )}
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            {canLinkExisting && (
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={openLinkExisting}
              >
                <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Vincular
                pessoa existente
              </Button>
            )}
            {canCreatePerson && (
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() =>
                  setPersonDialog({
                    kind: "open",
                    submitting: false,
                    error: null,
                    mode: { kind: "create-and-link" },
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Nova pessoa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {linked.length === 0 ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Nenhuma pessoa vinculada</p>
              <p className="text-muted-foreground">
                Vincule uma pessoa já cadastrada ou crie uma nova pessoa para
                este processo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {linked.map((v) => (
                <li
                  key={v.link.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {v.person.displayLabel}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">
                        {CASE_PERSON_ROLE_LABELS_PT[v.link.role]}
                      </Badge>
                      <span>
                        {AGE_CLASSIFICATION_LABELS_PT[v.person.ageClassification]}
                      </span>
                      {v.link.restrictedByDefault && (
                        <Badge variant="outline">Restrito</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEditPerson && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPersonDialog({
                            kind: "open",
                            submitting: false,
                            error: null,
                            mode: { kind: "edit-person", person: v.person },
                          })
                        }
                      >
                        Editar pessoa
                      </Button>
                    )}
                    {canEditLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPersonDialog({
                            kind: "open",
                            submitting: false,
                            error: null,
                            mode: {
                              kind: "edit-link",
                              person: v.person,
                              link: v.link,
                            },
                          })
                        }
                      >
                        Editar vínculo
                      </Button>
                    )}
                    {canRemoveLink && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Remover pessoa do processo"
                        onClick={() =>
                          setConfirm({
                            kind: "remove-link",
                            link: v.link,
                            label: v.person.displayLabel,
                            error: null,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Relações entre pessoas</CardTitle>
          {canCreateRel && linked.length >= 2 && (
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() =>
                setRelDialog({
                  kind: "open",
                  submitting: false,
                  error: null,
                  mode: { kind: "create" },
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Nova relação
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {linked.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Vincule pelo menos duas pessoas para registrar relações.
            </p>
          ) : relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma relação registrada entre as pessoas vinculadas.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {relationships.map((r) => (
                <li
                  key={r.relationship.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">
                        {r.fromPerson.displayLabel}
                      </span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">
                        {r.toPerson.displayLabel}
                      </span>
                    </p>
                    <Badge variant="secondary">
                      {RELATIONSHIP_TYPE_LABELS_PT[r.relationship.type]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEditRel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRelDialog({
                            kind: "open",
                            submitting: false,
                            error: null,
                            mode: {
                              kind: "edit",
                              relationship: r.relationship,
                              fromPerson: r.fromPerson,
                              toPerson: r.toPerson,
                            },
                          })
                        }
                      >
                        Editar
                      </Button>
                    )}
                    {canRemoveRel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Remover relação"
                        onClick={() =>
                          setConfirm({
                            kind: "remove-relationship",
                            relationship: r.relationship,
                            label: `${r.fromPerson.displayLabel} → ${r.toPerson.displayLabel}`,
                            error: null,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {personDialog.kind === "open" && (
        <ProcessPersonDialog
          open
          mode={personDialog.mode}
          catalog={catalog}
          submitting={personDialog.submitting}
          error={personDialog.error}
          onRetryCatalog={() => void loadCatalog()}
          onCreateAndLink={handleCreateAndLink}
          onRetryCreatedLink={handleRetryCreatedLink}
          onLinkExisting={handleLinkExisting}
          onEditPerson={handleEditPerson}
          onEditLink={handleEditLink}
          onReloadFromConflict={reloadFromConflict}
          onCancel={() => {
            setPersonDialog({ kind: "closed" });
            setCatalog({ kind: "idle" });
          }}
        />
      )}
      {relDialog.kind === "open" && (
        <ProcessRelationshipDialog
          open
          mode={relDialog.mode}
          linkedPeople={linkedPeople}
          submitting={relDialog.submitting}
          error={relDialog.error}
          onSubmit={handleRelationshipSubmit}
          onReloadFromConflict={reloadFromConflict}
          onCancel={() => setRelDialog({ kind: "closed" })}
        />
      )}

      <AlertDialog
        open={confirm.kind !== "closed"}
        onOpenChange={(v) => {
          if (!v && !removing) setConfirm({ kind: "closed" });
        }}
      >
        <AlertDialogContent aria-busy={removing}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.kind === "remove-link"
                ? "Remover pessoa do processo?"
                : "Remover relação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.kind === "remove-link"
                ? "A pessoa deixará de aparecer neste processo. O cadastro geral da pessoa será preservado."
                : "Esta ação remove somente a relação registrada entre as pessoas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm.kind !== "closed" && confirm.error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Não foi possível remover</AlertTitle>
              <AlertDescription>{confirm.error.message}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            {confirm.kind !== "closed" && confirm.error?.kind === "conflict" ? (
              <AlertDialogAction onClick={reloadFromConflict}>
                Recarregar pessoas e relações
              </AlertDialogAction>
            ) : (
              <AlertDialogAction disabled={removing} onClick={doRemove}>
                {removing && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {confirm.kind === "remove-link"
                  ? "Remover vínculo"
                  : "Remover relação"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
