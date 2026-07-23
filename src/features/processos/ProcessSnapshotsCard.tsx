/**
 * LV-08.6B / LV-08.6B.1 — card de Snapshots do processo.
 */

import * as React from "react";
import { Camera, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CaseSnapshot } from "@/domain/core/case-audit";
import type { CaseSnapshotId, UserId } from "@/domain/core/ids";
import {
  computeSnapshotPayloadCounters,
  formatIsoDateTimePtBr,
  getPublicAuthorLabel,
} from "@/features/processos/process-audit-snapshot-model";

export const SNAPSHOTS_TITLE_ID = "audit-snapshots-title";

export type ProcessSnapshotsCardProps = Readonly<{
  snapshots: readonly CaseSnapshot[];
  canCreate: boolean;
  onCreateClick: () => void;
  onViewSnapshot: (snapshotId: CaseSnapshotId) => void;
  currentUserId: UserId;
}>;

export function ProcessSnapshotsCard({
  snapshots,
  canCreate,
  onCreateClick,
  onViewSnapshot,
  currentUserId,
}: ProcessSnapshotsCardProps) {
  return (
    <Card aria-labelledby={SNAPSHOTS_TITLE_ID}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle id={SNAPSHOTS_TITLE_ID} className="text-base">
          Snapshots do processo
        </CardTitle>
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={onCreateClick}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Criar snapshot
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshots.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhum snapshot criado
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie uma fotografia do processo para preservar o estado atual como
              um marco histórico.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {snapshots.map((s) => {
              const c = computeSnapshotPayloadCounters(s.payload);
              const author = getPublicAuthorLabel(
                { actorUserId: s.createdByUserId },
                currentUserId,
              );
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    {s.reason !== undefined && s.reason.length > 0 ? (
                      <p className="text-xs italic text-muted-foreground">
                        Motivo: {s.reason}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={s.createdAt}>
                        {formatIsoDateTimePtBr(s.createdAt)}
                      </time>{" "}
                      · Por {author}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">Pessoas: {c.persons}</Badge>
                      <Badge variant="outline">
                        Relações: {c.relationships}
                      </Badge>
                      <Badge variant="outline">
                        Profissionais: {c.professionals}
                      </Badge>
                      <Badge variant="outline">Plano: {c.planItems}</Badge>
                      <Badge variant="outline">
                        Cronologia: {c.timelineEntries}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => onViewSnapshot(s.id)}
                    aria-label={`Visualizar snapshot ${s.label}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Visualizar snapshot
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
