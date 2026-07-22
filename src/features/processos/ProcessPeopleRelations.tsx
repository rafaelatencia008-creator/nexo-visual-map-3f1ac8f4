import * as React from "react";
import { AlertCircle, Loader2, Plus, RefreshCw, Trash2, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { CaseId } from "@/domain/core/ids";
import type { PermissionAction } from "@/domain/services/permissions";
import type { ServiceError } from "@/domain/services/result";
import {
  AGE_CLASSIFICATION_LABELS_PT,
  CASE_PERSON_ROLE_LABELS_PT,
  PEOPLE_WRITE_ACTIONS,
  RELATIONSHIP_TYPE_LABELS_PT,
  buildCasePersonUpdateInput,
  buildCreateCasePersonInput,
  buildCreatePersonInput,
  buildCreateRelationshipInput,
  buildLinkedCasePeopleView,
  buildPersonUpdateInput,
  buildRelationshipUpdateInput,
  buildRelationshipViews,
  emptyPeoplePermissions,
  mapPeopleError,
  type LinkedCasePersonView,
  type PeoplePermissions,
  type PeoplePublicError,
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
  organizationPersons: readonly Person[];
  relationships: readonly ProcessRelationshipView[];
  permissions: PeoplePermissions;
}>;

type SectionState =
  | { kind: "loading" }
  | { kind: "error"; error: PeoplePublicError }
  | { kind: "ready"; data: LoadedData; refreshing: boolean };

type PersonDialogState =
  | { kind: "closed" }
  | { kind: "open"; mode: PersonDialogMode; error: PeoplePublicError | null; submitting: boolean };

type RelDialogState =
  | { kind: "closed" }
  | { kind: "open"; mode: RelationshipDialogMode; error: PeoplePublicError | null; submitting: boolean };

type ConfirmState =
  | { kind: "closed" }
  | { kind: "remove-link"; link: CasePerson; label: string }
  | { kind: "remove-relationship"; relationship: Relationship; label: string };

export function ProcessPeopleRelations({ case: c }: ProcessPeopleRelationsProps) {
  const { environment, context } = useMockDomain();
  const caseId: CaseId = c.id;
  const [state, setState] = React.useState<SectionState>({ kind: "loading" });
  const [personDialog, setPersonDialog] = React.useState<PersonDialogState>({ kind: "closed" });
  const [relDialog, setRelDialog] = React.useState<RelDialogState>({ kind: "closed" });
  const [confirm, setConfirm] = React.useState<ConfirmState>({ kind: "closed" });
  const [removing, setRemoving] = React.useState(false);
  const requestIdRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

      // LV-08.4 — todas as consultas iniciais em paralelo.
      const permissionPromises = PEOPLE_WRITE_ACTIONS.map((action) =>
        environment.services.permissions.evaluate(context, {
          action: action as PermissionAction,
          caseId,
        }),
      );
      const [casePeopleRes, relsRes, personsRes, ...permResults] = await Promise.all([
        environment.services.casePersons.listByCase(context, caseId, { limit: 100 }),
        environment.services.relationships.listByCase(context, caseId, { limit: 100 }),
        environment.services.persons.list(context, { page: { limit: 100 } }),
        ...permissionPromises,
      ]);

      if (!mountedRef.current || reqId !== requestIdRef.current) return;

      if (!casePeopleRes.ok) {
        setState({ kind: "error", error: mapPeopleError(casePeopleRes.error as ServiceError) });
        return;
      }
      if (!relsRes.ok) {
        setState({ kind: "error", error: mapPeopleError(relsRes.error as ServiceError) });
        return;
      }
      if (!personsRes.ok) {
        setState({ kind: "error", error: mapPeopleError(personsRes.error as ServiceError) });
        return;
      }

      const perms = emptyPeoplePermissions();
      const permsWritable: Record<string, boolean> = { ...perms };
      let permError: PeoplePublicError | null = null;
      for (let i = 0; i < PEOPLE_WRITE_ACTIONS.length; i++) {
        const action = PEOPLE_WRITE_ACTIONS[i];
        const r = permResults[i];
        if (!r.ok) {
          permError = mapPeopleError(r.error as ServiceError);
          break;
        }
        permsWritable[action] = r.data.allowed === true;
      }
      if (permError) {
        setState({ kind: "error", error: permError });
        return;
      }

      const linked = buildLinkedCasePeopleView(
        casePeopleRes.data.items,
        personsRes.data.items,
      ).views;
      const rels = buildRelationshipViews(relsRes.data.items, linked).views;

      setState({
        kind: "ready",
        data: {
          linked,
          organizationPersons: personsRes.data.items,
          relationships: rels,
          permissions: permsWritable as PeoplePermissions,
        },
        refreshing: false,
      });
    },
    [environment, context, caseId],
  );

  React.useEffect(() => {
    void loadAll("initial");
  }, [loadAll]);

  const availableToLink = React.useMemo<readonly Person[]>(() => {
    if (state.kind !== "ready") return [];
    const linkedIds = new Set(state.data.linked.map((v) => v.person.id));
    return state.data.organizationPersons.filter((p) => !linkedIds.has(p.id));
  }, [state]);

  const linkedPeople = React.useMemo<readonly Person[]>(() => {
    if (state.kind !== "ready") return [];
    return state.data.linked.map((v) => v.person);
  }, [state]);

  // ---- submit handlers ----------------------------------------------------

  const handlePersonSubmit = async (values: {
    displayLabel: string;
    ageClassification: Person["ageClassification"];
    personId?: Person["id"];
    role: CasePerson["role"];
    restrictedByDefault: boolean;
  }) => {
    if (personDialog.kind !== "open") return;
    setPersonDialog({ ...personDialog, submitting: true, error: null });

    const mode = personDialog.mode;
    try {
      if (mode.kind === "edit") {
        // atualiza pessoa (se necessário)
        const personPatch = buildPersonUpdateInput(mode.person, {
          displayLabel: values.displayLabel,
          ageClassification: values.ageClassification,
        });
        if (personPatch) {
          const r = await environment.services.persons.update(
            context,
            mode.person.id,
            personPatch,
          );
          if (!r.ok) {
            setPersonDialog({
              kind: "open",
              mode,
              submitting: false,
              error: mapPeopleError(r.error as ServiceError),
            });
            return;
          }
        }
        // atualiza vínculo (se necessário)
        const linkPatch = buildCasePersonUpdateInput(mode.link, {
          role: values.role,
          restrictedByDefault: values.restrictedByDefault,
        });
        if (linkPatch) {
          const r = await environment.services.casePersons.update(
            context,
            caseId,
            linkPatch,
          );
          if (!r.ok) {
            setPersonDialog({
              kind: "open",
              mode,
              submitting: false,
              error: mapPeopleError(r.error as ServiceError),
            });
            return;
          }
        }
        toast.success("Vínculo atualizado.");
      } else if (mode.kind === "link-existing") {
        if (!values.personId) return;
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
          setPersonDialog({
            kind: "open",
            mode,
            submitting: false,
            error: mapPeopleError(r.error as ServiceError),
          });
          return;
        }
        toast.success("Pessoa vinculada ao processo.");
      } else {
        // create-and-link
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
          setPersonDialog({
            kind: "open",
            mode,
            submitting: false,
            error: mapPeopleError(created.error as ServiceError),
          });
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
          setPersonDialog({
            kind: "open",
            mode,
            submitting: false,
            error: mapPeopleError(link.error as ServiceError),
          });
          return;
        }
        toast.success("Pessoa cadastrada e vinculada.");
      }
      setPersonDialog({ kind: "closed" });
      void loadAll("refresh");
    } catch {
      setPersonDialog({
        kind: "open",
        mode,
        submitting: false,
        error: { kind: "generic", message: "Falha inesperada." },
      });
    }
  };

  const handleRelationshipSubmit = async (values: {
    fromPersonId: Person["id"];
    toPersonId: Person["id"];
    type: Relationship["type"];
  }) => {
    if (relDialog.kind !== "open") return;
    setRelDialog({ ...relDialog, submitting: true, error: null });
    const mode = relDialog.mode;
    if (mode.kind === "edit") {
      const patch = buildRelationshipUpdateInput(mode.relationship, values.type);
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
          error: mapPeopleError(r.error as ServiceError),
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
          error: mapPeopleError(r.error as ServiceError),
        });
        return;
      }
      toast.success("Relação registrada.");
    }
    setRelDialog({ kind: "closed" });
    void loadAll("refresh");
  };

  const doRemove = async () => {
    if (confirm.kind === "closed") return;
    setRemoving(true);
    let error: PeoplePublicError | null = null;
    if (confirm.kind === "remove-link") {
      const r = await environment.services.casePersons.remove(
        context,
        caseId,
        confirm.link.id,
        confirm.link.metadata.version,
      );
      if (!r.ok) error = mapPeopleError(r.error as ServiceError);
    } else {
      const r = await environment.services.relationships.remove(
        context,
        caseId,
        confirm.relationship.id,
        confirm.relationship.metadata.version,
      );
      if (!r.ok) error = mapPeopleError(r.error as ServiceError);
    }
    setRemoving(false);
    if (error) {
      toast.error("Não foi possível remover", { description: error.message });
      setConfirm({ kind: "closed" });
      return;
    }
    toast.success("Removido com sucesso.");
    setConfirm({ kind: "closed" });
    void loadAll("refresh");
  };

  // ---- render helpers ----------------------------------------------------

  if (state.kind === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pessoas e relações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-3/4" />
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => void loadAll("initial")}>
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { linked, relationships, permissions } = state.data;
  const canCreatePerson = permissions["person.create"] && permissions["casePerson.create"];
  const canLinkExisting = permissions["casePerson.create"];
  const canEditLink = permissions["casePerson.update"] || permissions["person.update"];
  const canRemoveLink = permissions["casePerson.remove"];
  const canCreateRel = permissions["relationship.create"];
  const canEditRel = permissions["relationship.update"];
  const canRemoveRel = permissions["relationship.remove"];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Pessoas vinculadas
            {state.refreshing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <div className="flex gap-2">
            {canLinkExisting && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPersonDialog({
                    kind: "open",
                    submitting: false,
                    error: null,
                    mode: { kind: "link-existing", availablePersons: availableToLink },
                  })
                }
              >
                <UserPlus className="mr-2 h-4 w-4" /> Vincular existente
              </Button>
            )}
            {canCreatePerson && (
              <Button
                size="sm"
                onClick={() =>
                  setPersonDialog({
                    kind: "open",
                    submitting: false,
                    error: null,
                    mode: { kind: "create-and-link" },
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Cadastrar e vincular
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este processo ainda não possui pessoas vinculadas.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {linked.map((v) => (
                <li key={v.link.id} className="flex items-center justify-between py-3">
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
                  <div className="flex gap-2">
                    {canEditLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPersonDialog({
                            kind: "open",
                            submitting: false,
                            error: null,
                            mode: { kind: "edit", person: v.person, link: v.link },
                          })
                        }
                      >
                        Editar
                      </Button>
                    )}
                    {canRemoveLink && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setConfirm({
                            kind: "remove-link",
                            link: v.link,
                            label: v.person.displayLabel,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Relações entre pessoas</CardTitle>
          {canCreateRel && linked.length >= 2 && (
            <Button
              size="sm"
              onClick={() =>
                setRelDialog({
                  kind: "open",
                  submitting: false,
                  error: null,
                  mode: { kind: "create" },
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Nova relação
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
                <li key={r.relationship.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{r.fromPerson.displayLabel}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{r.toPerson.displayLabel}</span>
                    </p>
                    <Badge variant="secondary">
                      {RELATIONSHIP_TYPE_LABELS_PT[r.relationship.type]}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
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
                        onClick={() =>
                          setConfirm({
                            kind: "remove-relationship",
                            relationship: r.relationship,
                            label: `${r.fromPerson.displayLabel} → ${r.toPerson.displayLabel}`,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
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
          submitting={personDialog.submitting}
          error={personDialog.error}
          onSubmit={handlePersonSubmit}
          onCancel={() => setPersonDialog({ kind: "closed" })}
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
          onCancel={() => setRelDialog({ kind: "closed" })}
        />
      )}

      <AlertDialog
        open={confirm.kind !== "closed"}
        onOpenChange={(v) => {
          if (!v && !removing) setConfirm({ kind: "closed" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.kind === "remove-link"
                ? `Remover o vínculo de "${confirm.label}" deste processo? Esta ação é simulada e desfaz apenas nesta sessão.`
                : confirm.kind === "remove-relationship"
                ? `Remover a relação "${confirm.label}"?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={removing} onClick={doRemove}>
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
