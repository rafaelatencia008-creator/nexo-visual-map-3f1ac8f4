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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { clientes } from "@/lib/mock/data";

export const Route = createFileRoute("/app/processos/novo")({
  head: () => ({
    meta: [
      { title: "Novo processo — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NovoProcessoPage,
});

const somenteDigitos = (s: string) => s.replace(/\D/g, "");

const schema = z.object({
  numero: z
    .string()
    .trim()
    .min(1, "Informe o número do processo.")
    .refine((v) => somenteDigitos(v).length === 20, {
      message: "Número CNJ deve ter 20 dígitos.",
    }),
  clienteId: z
    .string()
    .trim()
    .min(1, "Selecione o cliente vinculado."),
  vara: z
    .string()
    .trim()
    .min(2, "Informe a vara.")
    .max(120, "Máximo de 120 caracteres."),
  comarca: z
    .string()
    .trim()
    .min(2, "Informe a comarca.")
    .max(120, "Máximo de 120 caracteres."),
  status: z.enum(["ativo", "suspenso", "arquivado"], {
    required_error: "Selecione um status.",
  }),
  observacoes: z
    .string()
    .trim()
    .max(1000, "Máximo de 1000 caracteres.")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

// Máscara CNJ: 0000000-00.0000.0.00.0000 (20 dígitos)
function maskCNJ(v: string) {
  const d = somenteDigitos(v).slice(0, 20);
  return d
    .replace(/^(\d{7})(\d)/, "$1-$2")
    .replace(/^(\d{7}-\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{7}-\d{2}\.\d{4})(\d)/, "$1.$2")
    .replace(/^(\d{7}-\d{2}\.\d{4}\.\d)(\d)/, "$1.$2")
    .replace(/^(\d{7}-\d{2}\.\d{4}\.\d\.\d{2})(\d)/, "$1.$2");
}

function NovoProcessoPage() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      numero: "",
      clienteId: "",
      vara: "",
      comarca: "",
      status: "ativo",
      observacoes: "",
    },
  });

  const onSubmit = (_values: FormValues) => {
    toast.success("Processo cadastrado — em breve", {
      description:
        "Ação simulada. A persistência será liberada em etapas futuras.",
    });
    navigate({ to: "/app/processos" });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/processos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para processos
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Novo processo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre um processo judicial e vincule-o a um cliente do escritório.
        </p>
      </header>

      <Card className="max-w-3xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Dados do processo</CardTitle>
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
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do processo (CNJ)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="0000000-00.0000.0.00.0000"
                        value={maskCNJ(field.value)}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Formato padrão do Conselho Nacional de Justiça (20 dígitos).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente vinculado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {c.tipoPessoa}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vara"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vara</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex.: 3ª Vara Cível"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comarca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comarca</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex.: São Paulo/SP"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-wrap gap-6"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="ativo" />
                          Ativo
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="suspenso" />
                          Suspenso
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="arquivado" />
                          Arquivado
                        </label>
                      </RadioGroup>
                    </FormControl>
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
                        placeholder="Informações complementares sobre o processo (opcional)…"
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
                  onClick={() => navigate({ to: "/app/processos" })}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar processo
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
