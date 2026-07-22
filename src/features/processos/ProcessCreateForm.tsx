import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  CONFIDENTIALITY_LEVELS,
  type ConfidentialityLevel,
} from "@/domain/core/case";
import { CONFIDENTIALITY_LABELS_PT } from "@/features/processos/process-list-model";
import {
  PROCESS_CREATE_INITIAL_VALUES,
  buildCreateCaseInput,
  processCreateSchema,
  type ProcessCreateFieldName,
  type ProcessCreateFormValues,
  type ProcessCreatePublicError,
} from "@/features/processos/process-create-model";
import type { CreateCaseInput } from "@/domain/services/inputs";

export type ProcessCreateFormProps = Readonly<{
  onSubmit: (input: CreateCaseInput) => Promise<ProcessCreatePublicError | null>;
  onCancel: () => void;
}>;

export function ProcessCreateForm({ onSubmit, onCancel }: ProcessCreateFormProps) {
  const form = useForm<ProcessCreateFormValues>({
    resolver: zodResolver(processCreateSchema),
    defaultValues: { ...PROCESS_CREATE_INITIAL_VALUES },
    mode: "onSubmit",
  });

  const [publicError, setPublicError] =
    React.useState<ProcessCreatePublicError | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const submittingRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const referenceRef = React.useRef<HTMLInputElement | null>(null);
  const titleRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFormSubmit = form.handleSubmit(async (values) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setPublicError(null);

    const input = buildCreateCaseInput(values);
    let result: ProcessCreatePublicError | null = null;
    try {
      result = await onSubmit(input);
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
      submittingRef.current = false;
    }

    if (!mountedRef.current) return;
    if (result === null) return;

    setPublicError(result);
    const fe = result.fieldErrors;
    if (fe) {
      const order: ProcessCreateFieldName[] = ["reference", "title", "confidentiality"];
      let firstErrored: ProcessCreateFieldName | null = null;
      for (const name of order) {
        const msg = fe[name];
        if (msg) {
          form.setError(name, { type: "server", message: msg });
          if (firstErrored === null) firstErrored = name;
        }
      }
      if (firstErrored === "reference") referenceRef.current?.focus();
      else if (firstErrored === "title") titleRef.current?.focus();
    }
  });

  const requestCancel = () => {
    if (submitting) return;
    if (form.formState.isDirty) {
      setConfirmOpen(true);
      return;
    }
    onCancel();
  };

  const confirmDiscard = () => {
    setConfirmOpen(false);
    onCancel();
  };

  const disabled = submitting;

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={handleFormSubmit}
          className="space-y-6"
          noValidate
          aria-busy={submitting}
        >
          {publicError && !publicError.fieldErrors && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {publicError.message}
            </div>
          )}
          {publicError?.fieldErrors && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {publicError.message}
            </div>
          )}

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Identificação do processo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referência do processo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: PROC-2026-001"
                        autoComplete="off"
                        disabled={disabled}
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          referenceRef.current = el;
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Use um identificador interno ou a referência judicial
                      utilizada pelo escritório.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do processo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Avaliação técnica do imóvel"
                        autoComplete="off"
                        disabled={disabled}
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          titleRef.current = el;
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Informe um título curto que ajude a identificar o trabalho.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidentiality"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Nível de confidencialidade</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(v) =>
                          field.onChange(v as ConfidentialityLevel)
                        }
                        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6"
                        aria-label="Nível de confidencialidade"
                      >
                        {CONFIDENTIALITY_LEVELS.map((level) => (
                          <label
                            key={level}
                            className="flex items-center gap-2 text-sm"
                          >
                            <RadioGroupItem
                              value={level}
                              disabled={disabled}
                              aria-label={CONFIDENTIALITY_LABELS_PT[level]}
                            />
                            {CONFIDENTIALITY_LABELS_PT[level]}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <section
            aria-label="Configuração inicial"
            className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground"
          >
            <h2 className="text-sm font-semibold text-foreground">
              Configuração inicial
            </h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide">Situação</dt>
                <dd className="text-foreground">Rascunho</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  Objeto do trabalho
                </dt>
                <dd className="text-foreground">A definir</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Prazo</dt>
                <dd className="text-foreground">Não revisado</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  Conflito de interesse
                </dt>
                <dd className="text-foreground">Não revisado</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs">
              Essas informações serão revisadas nas próximas etapas do cadastro.
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={requestCancel}
              disabled={disabled}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={disabled}
              className="w-full gap-2 sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Salvando processo…" : "Salvar processo"}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações preenchidas neste formulário serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar preenchendo</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>
              Descartar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
