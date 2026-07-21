import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Calendar, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pericias, processos, peritos, clientes } from "@/lib/mock/data";
import type {
  Pericia,
  TipoPericia,
  StatusPericia,
} from "@/lib/mock/types";

const TIPO_LABEL: Record<TipoPericia, string> = {
  engenharia_civil: "Engenharia Civil",
  grafotecnica: "Grafotécnica",
  contabil: "Contábil",
  medica: "Médica",
  ambiental: "Ambiental",
  trabalhista: "Trabalhista",
};

const STATUS_LABEL: Record<StatusPericia, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  laudo_pendente: "Laudo pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TIPOS: TipoPericia[] = [
  "engenharia_civil",
  "grafotecnica",
  "contabil",
  "medica",
  "ambiental",
  "trabalhista",
];

const STATUSES: StatusPericia[] = [
  "agendada",
  "em_andamento",
  "laudo_pendente",
  "concluida",
  "cancelada",
];

const schema = z.object({
  processoId: z.string().trim().min(1, "Selecione o processo vinculado."),
  tipo: z.enum(
    [
      "engenharia_civil",
      "grafotecnica",
      "contabil",
      "medica",
      "ambiental",
      "trabalhista",
    ],
    { required_error: "Selecione o tipo de perícia." },
  ),
  peritoId: z.string().trim().min(1, "Selecione o perito responsável."),
  dataAgendada: z.string().trim().min(1, "Informe a data e hora."),
  status: z.enum(
    ["agendada", "em_andamento", "laudo_pendente", "concluida", "cancelada"],
    { required_error: "Selecione o status." },
  ),
  honorarios: z
    .number({ invalid_type_error: "Informe um valor numérico." })
    .min(0, "Honorários não podem ser negativos.")
    .max(10_000_000, "Valor muito alto."),
  observacoes: z
    .string()
    .trim()
    .max(1000, "Máximo de 1000 caracteres.")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/app/pericias/$id/editar")({
  loader: ({ params }): { pericia: Pericia } => {
    const pericia = pericias.find((p) => p.id === params.id);
    if (!pericia) throw notFound();
    return { pericia };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Editar perícia — Nexo Pericial 360`
          : "Perícia não encontrada — Nexo Pericial 360",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditarPericiaPage,
  errorComponent: EditarPericiaErro,
  notFoundComponent: EditarPericiaNaoEncontrada,
});

function toDateTimeLocal(iso: string): string {
  // Converte "2025-01-15T10:30:00.000Z" para "2025-01-15T10:30"
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditarPericiaPage() {
  const { pericia } = Route.useLoaderData();
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      processoId: pericia.processoId,
      tipo: pericia.tipo,
      peritoId: pericia.peritoId,
      dataAgendada: toDateTimeLocal(pericia.dataAgendada),
      status: pericia.status,
      honorarios: pericia.honorarios,
      observacoes: pericia.observacoes ?? "",
    },
  });

  const onSubmit = (_values: FormValues) => {
    toast.success("Alterações salvas — em breve", {
      description:
        "Ação simulada. A persistência será liberada em etapas futuras.",
    });
    navigate({ to: "/app/pericias/$id", params: { id } });
  };

  const clienteMap = new Map(clientes.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/pericias/$id" params={{ id }}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para a perícia
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Editar perícia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualize os dados da perícia. As alterações são simuladas nesta etapa.
        </p>
      </header>

      <Card className="max-w-3xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Dados da perícia</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              <FormField
                control={form.control}
                name="processoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processo vinculado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um processo…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {processos.map((p) => {
                          const cli = clienteMap.get(p.clienteId);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-mono text-xs">
                                {p.numero}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {cli?.nome ?? "—"}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de perícia</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {TIPO_LABEL[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="peritoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perito responsável</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um perito…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {peritos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {TIPO_LABEL[p.especialidade]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dataAgendada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e hora agendada</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="honorarios"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Honorários (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="0,00"
                          value={Number.isFinite(field.value) ? field.value : 0}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? 0 : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Valor em Reais. Use ponto para casas decimais.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações complementares sobre a perícia (opcional)…"
                        maxLength={1000}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Campo opcional. Até 1000 caracteres.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap justify-end gap-3 border-t border-border/60 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate({ to: "/app/pericias/$id", params: { id } })
                  }
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar alterações
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function EditarPericiaNaoEncontrada() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Perícia não encontrada
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o registro com o identificador{" "}
        <span className="font-mono">{id}</span>.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/app/pericias">
          <ArrowLeft className="h-4 w-4" />
          Voltar para perícias
        </Link>
      </Button>
    </div>
  );
}

function EditarPericiaErro({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">
        Não foi possível carregar a perícia
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ocorreu um erro inesperado ao abrir o formulário de edição.
      </p>
      <Button
        className="mt-6"
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        Tentar novamente
      </Button>
    </div>
  );
}
