import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhone } from "@/lib/format";
import type { TipoPericia } from "@/lib/mock/types";

const ESPECIALIDADE_OPTIONS: { value: TipoPericia; label: string }[] = [
  { value: "engenharia_civil", label: "Engenharia Civil" },
  { value: "grafotecnica", label: "Grafotécnica" },
  { value: "contabil", label: "Contábil" },
  { value: "medica", label: "Médica" },
  { value: "ambiental", label: "Ambiental" },
  { value: "trabalhista", label: "Trabalhista" },
];

const schema = z.object({
  nome: z.string().min(3, "Informe o nome completo do perito."),
  especialidade: z.enum([
    "engenharia_civil",
    "grafotecnica",
    "contabil",
    "medica",
    "ambiental",
    "trabalhista",
  ]),
  registroProfissional: z
    .string()
    .min(3, "Informe o registro profissional (CREA, CRC, CRM, etc.)."),
  email: z.string().email("Informe um e-mail válido."),
  telefone: z
    .string()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um telefone válido."),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/app/peritos/novo")({
  head: () => ({
    meta: [
      { title: "Novo Perito — Nexo Pericial 360" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NovoPeritoPage,
});

function NovoPeritoPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      especialidade: undefined,
      registroProfissional: "",
      email: "",
      telefone: "",
    },
  });

  const especialidade = watch("especialidade");
  const telefone = watch("telefone");

  const onSubmit = (_values: FormValues) => {
    toast.success("Perito cadastrado (simulação visual).");
    navigate({ to: "/app/peritos" });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/app/peritos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Peritos
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Novo perito
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre um profissional responsável por executar perícias.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Dados do perito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" {...register("nome")} placeholder="Ex.: Dra. Ana Beatriz Salgado" />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade</Label>
                <Select
                  value={especialidade ?? ""}
                  onValueChange={(v) =>
                    setValue("especialidade", v as TipoPericia, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="especialidade">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.especialidade && (
                  <p className="text-xs text-destructive">
                    {errors.especialidade.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registroProfissional">Registro profissional</Label>
                <Input
                  id="registroProfissional"
                  {...register("registroProfissional")}
                  placeholder="Ex.: CREA-SP 5069123"
                />
                {errors.registroProfissional && (
                  <p className="text-xs text-destructive">
                    {errors.registroProfissional.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="nome@nexopericial.com.br"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone ? formatPhone(telefone) : ""}
                  onChange={(e) =>
                    setValue("telefone", e.target.value.replace(/\D/g, "").slice(0, 11), {
                      shouldValidate: true,
                    })
                  }
                  placeholder="(11) 98765-4321"
                  inputMode="numeric"
                />
                {errors.telefone && (
                  <p className="text-xs text-destructive">{errors.telefone.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button asChild variant="outline" type="button">
            <Link to="/app/peritos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar perito
          </Button>
        </div>
      </form>
    </div>
  );
}
