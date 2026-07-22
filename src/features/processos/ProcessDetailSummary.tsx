import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { Case } from "@/domain/core/case";
import {
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
} from "@/features/processos/process-detail-model";

export type ProcessDetailSummaryProps = Readonly<{
  case: Case;
}>;

export function ProcessDetailSummary({ case: c }: ProcessDetailSummaryProps) {
  const navigate = useNavigate();
  const goBack = () => {
    void navigate({ to: "/app/processos" });
  };
  return (
    <div className="space-y-6">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para processos
        </Button>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg text-foreground sm:text-xl">
            {c.reference}
          </span>
          <Badge variant="secondary">{CASE_STATUS_LABELS_PT[c.status]}</Badge>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {c.title}
        </h1>
      </header>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Resumo do processo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="Referência" value={c.reference} mono />
          <Info label="Título" value={c.title} />
          <Info label="Situação" value={CASE_STATUS_LABELS_PT[c.status]} />
          <Info
            label="Confidencialidade"
            value={CONFIDENTIALITY_LABELS_PT[c.confidentiality]}
          />
          <Info label="Criado em" value={formatDateTime(c.metadata.createdAt)} />
          <Info
            label="Atualizado em"
            value={formatDateTime(c.metadata.updatedAt)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 break-words text-sm text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
