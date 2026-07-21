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
import { ArrowLeft, Save, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { clientes } from "@/lib/mock/data";
import type { Cliente } from "@/lib/mock/types";

export const Route = createFileRoute("/app/clientes/$id/editar")({
  loader: ({ params }): { cliente: Cliente } => {
    const cliente = clientes.find((c) => c.id === params.id);
    if (!cliente) throw notFound();
    return { cliente };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData
      ? `Editar ${loaderData.cliente.nome}`
      : "Editar cliente";
    return {
      meta: [
        { title: `${titulo} — Nexo Pericial 360` },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: EditarClientePage,
  errorComponent: EditarClienteErro,
  notFoundComponent: EditarClienteNaoEncontrado,
});

const somenteDigitos = (s: string) => s.replace(/\D/g, "");

const schema = z
  .object({
    tipoPessoa: z.enum(["PF", "PJ"], {
      required_error: "Selecione o tipo de pessoa.",
    }),
    nome: z
      .string()
      .trim()
      .min(2, "Informe pelo menos 2 caracteres.")
      .max(120, "Máximo de 120 caracteres."),
    documento: z.string().trim().min(1, "Informe o documento."),
    email: z
      .string()
      .trim()
      .email("E-mail inválido.")
      .max(255, "Máximo de 255 caracteres."),
    telefone: z.string().trim().min(1, "Informe o telefone."),
  })
  .superRefine((data, ctx) => {
    const doc = somenteDigitos(data.documento);
    if (data.tipoPessoa === "PF" && doc.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message: "CPF deve ter 11 dígitos.",
      });
    }
    if (data.tipoPessoa === "PJ" && doc.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message: "CNPJ deve ter 14 dígitos.",
      });
    }
    const tel = somenteDigitos(data.telefone);
    if (tel.length < 10 || tel.length > 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telefone"],
        message: "Telefone deve ter 10 ou 11 dígitos.",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function maskCPF(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(v: string) {
  const d = somenteDigitos(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function EditarClientePage() {
  const { cliente } = Route.useLoaderData() as { cliente: Cliente };
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoPessoa: cliente.tipoPessoa,
      nome: cliente.nome,
      documento: cliente.documento,
      email: cliente.email,
      telefone: cliente.telefone,
    },
  });

  const tipoPessoa = form.watch("tipoPessoa");

  const onSubmit = (_values: FormValues) => {
    toast.success("Alterações salvas — em breve", {
      description:
        "Ação simulada. A persistência será liberada em etapas futuras.",
    });
    navigate({ to: "/app/clientes/$id", params: { id: cliente.id } });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/clientes/$id" params={{ id: cliente.id }}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para a ficha
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Editar cliente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualize os dados cadastrais de{" "}
          <span className="font-medium text-foreground">{cliente.nome}</span>.
        </p>
      </header>

      <Card className="max-w-3xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Dados do cliente</CardTitle>
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
                name="tipoPessoa"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo de pessoa</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("documento", "");
                          form.clearErrors("documento");
                        }}
                        value={field.value}
                        className="flex gap-6"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="PF" />
                          Pessoa Física
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="PJ" />
                          Pessoa Jurídica
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {tipoPessoa === "PJ" ? "Razão social" : "Nome completo"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          tipoPessoa === "PJ"
                            ? "Ex.: Construtora Horizonte Ltda."
                            : "Ex.: Maria Eduarda Ferreira"
                        }
                        maxLength={120}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="documento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoPessoa === "PJ" ? "CNPJ" : "CPF"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder={
                            tipoPessoa === "PJ"
                              ? "00.000.000/0000-00"
                              : "000.000.000-00"
                          }
                          value={
                            tipoPessoa === "PJ"
                              ? maskCNPJ(field.value)
                              : maskCPF(field.value)
                          }
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="tel"
                          placeholder="(11) 98765-4321"
                          value={maskPhone(field.value)}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contato@empresa.com.br"
                        maxLength={255}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Usado para envio de comunicações e notificações.
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
                    navigate({
                      to: "/app/clientes/$id",
                      params: { id: cliente.id },
                    })
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

function EditarClienteNaoEncontrado() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <UserIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Cliente não encontrado
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o registro com o identificador{" "}
        <span className="font-mono">{id}</span>.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/app/clientes">
          <ArrowLeft className="h-4 w-4" />
          Voltar para clientes
        </Link>
      </Button>
    </div>
  );
}

function EditarClienteErro({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">
        Não foi possível abrir o formulário de edição
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ocorreu um erro inesperado ao carregar os dados deste cliente.
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
