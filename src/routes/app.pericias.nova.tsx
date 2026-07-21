import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
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
import { processos, peritos, clientes } from "@/lib/mock/data";
import type { TipoPericia, StatusPericia } from "@/lib/mock/types";

export const Route = createFileRoute("/app/pericias/nova")({
  head: () => ({
    meta: [
      { title: "Nova perícia — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NovaPericiaPage,
});

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
  dataAgendada: z
    .string()
    .trim()
    .min(1, "Informe a data e hora."),
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

function NovaPericiaPage() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      processoId: "",
      tipo: undefined as unknown as TipoPericia,
      peritoId: "",
      dataAgendada: "",
      status: "agendada",
      honorarios: 0,
      observacoes: "",
    },
  });

  const onSubmit = (_values: FormValues) => {
    toast.success("Perícia cadastrada — em breve", {
      description:
        "Ação simulada. A persistência será liberada em etapas futuras.",
    });
    navigate({ to: "/app/pericias" });
  };

  const clienteMap = new Map(clientes.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/pericias">
            <ArrowLeft className="h-4 w-4" />
            Voltar para perícias
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Nova perícia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agende uma nova perícia vinculada a um processo do escritório.
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
                  onClick={() => navigate({ to: "/app/pericias" })}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar perícia
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
