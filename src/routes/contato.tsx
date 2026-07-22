import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Send, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Envie uma mensagem para a equipe do Nexo Pericial 360. Formulário apresentado como demonstração visual — nenhum dado é enviado ou armazenado.",
      },
      { property: "og:title", content: "Contato — Nexo Pericial 360" },
      {
        property: "og:description",
        content:
          "Formulário de contato do Nexo Pericial 360, apresentado como demonstração visual.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/contato" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Contato — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content:
          "Formulário de contato do Nexo Pericial 360 (demonstração visual).",
      },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const [assunto, setAssunto] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.success("Mensagem visual registrada", {
      description:
        "Demonstração visual: nenhum dado foi enviado, nenhum dado foi armazenado e nenhuma solicitação real foi criada.",
    });
    (event.currentTarget as HTMLFormElement).reset();
    setAssunto("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 50% 40% at 50% 0%, hsl(var(--primary) / 0.06), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--brand-accent)/0.35)] bg-[hsl(var(--brand-accent)/0.08)] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-accent))]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Fale com a equipe
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Contato
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Envie uma mensagem para nos ajudar a evoluir a plataforma —
                dúvidas, sugestões, interesse em demonstração ou parceria.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Card className="border-border/60">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Este formulário é apenas uma demonstração visual. Nenhum
                  dado é enviado, armazenado ou tratado. Não inclua
                  informações sensíveis ou dados de terceiros.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" name="nome" placeholder="Seu nome" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Select value={assunto} onValueChange={setAssunto}>
                    <SelectTrigger id="assunto">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">
                        Solicitar demonstração
                      </SelectItem>
                      <SelectItem value="planos">Conhecer os planos</SelectItem>
                      <SelectItem value="parceria">Parceria</SelectItem>
                      <SelectItem value="suporte">Suporte</SelectItem>
                      <SelectItem value="duvidas">
                        Dúvidas sobre a plataforma
                      </SelectItem>
                      <SelectItem value="outro">Outro assunto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensagem">Mensagem</Label>
                  <Textarea
                    id="mensagem"
                    name="mensagem"
                    placeholder="Escreva sua mensagem..."
                    rows={5}
                    required
                  />
                </div>

                <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-xs text-muted-foreground">
                    Ao enviar, nenhum dado real é transmitido.
                  </p>
                  <Button type="submit" size="lg" className="gap-2">
                    <Send className="h-4 w-4" />
                    Enviar mensagem
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
