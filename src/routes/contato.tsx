import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Clock, Send, ShieldCheck } from "lucide-react";
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
          "Fale com o Nexo Pericial 360: canais de atendimento, endereço e formulário para solicitações periciais.",
      },
      { property: "og:title", content: "Contato — Nexo Pericial 360" },
      {
        property: "og:description",
        content: "Canais de atendimento e formulário de contato do Nexo Pericial 360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nexo-visual-map.lovable.app/contato" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Contato — Nexo Pericial 360" },
      {
        name: "twitter:description",
        content: "Fale com nossa equipe pericial.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nexo-visual-map.lovable.app/contato" }],
  }),
  component: ContatoPage,
});

const CHANNELS = [
  {
    icon: Mail,
    title: "E-mail",
    lines: ["contato@nexopericial360.com.br"],
  },
  {
    icon: Phone,
    title: "Telefone / WhatsApp",
    lines: ["(11) 4000-0000", "(11) 90000-0000"],
  },
  {
    icon: MapPin,
    title: "Endereço",
    lines: ["Av. Paulista, 1000 — 10º andar", "São Paulo — SP, 01310-100"],
  },
  {
    icon: Clock,
    title: "Horário de atendimento",
    lines: ["Segunda a sexta, 9h às 18h"],
  },
];

function ContatoPage() {
  const [assunto, setAssunto] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.success("Mensagem registrada", {
      description: "Simulação visual — nenhum envio real foi realizado.",
    });
    (event.currentTarget as HTMLFormElement).reset();
    setAssunto("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
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
                Atendimento
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Fale com o Nexo Pericial 360
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Nossa equipe está pronta para orientar sobre modalidades periciais,
                prazos e documentação. Escolha o canal de sua preferência.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            {/* Left — Channels */}
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Canais de contato
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Utilize o canal mais conveniente. Respondemos em até um dia útil.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <Card key={channel.title} className="border-border/60">
                      <CardContent className="flex gap-4 p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-sm font-semibold text-foreground">
                            {channel.title}
                          </h3>
                          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                            {channel.lines.map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right — Form */}
            <div>
              <Card className="border-border/60">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    Envie sua mensagem
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Preencha os campos abaixo e retornaremos em breve.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome completo</Label>
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

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          name="telefone"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assunto">Assunto</Label>
                        <Select value={assunto} onValueChange={setAssunto}>
                          <SelectTrigger id="assunto">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="judicial">Perícia Judicial</SelectItem>
                            <SelectItem value="extrajudicial">
                              Perícia Extrajudicial
                            </SelectItem>
                            <SelectItem value="assistencia">
                              Assistência Técnica
                            </SelectItem>
                            <SelectItem value="parecer">Parecer Especializado</SelectItem>
                            <SelectItem value="outro">Outro assunto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mensagem">Mensagem</Label>
                      <Textarea
                        id="mensagem"
                        name="mensagem"
                        placeholder="Descreva brevemente sua demanda..."
                        rows={5}
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground">
                        Simulação visual — nenhum dado é enviado.
                      </p>
                      <Button type="submit" size="lg" className="gap-2">
                        <Send className="h-4 w-4" />
                        Enviar mensagem
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
