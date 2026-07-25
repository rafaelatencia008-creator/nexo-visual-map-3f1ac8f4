/**
 * LV-12 — Cobertura determinística de quesito.
 *
 * Sem IA, sem randomness. Pontuação puramente derivada
 * do estado do quesito e de suas evidências.
 */
import type { CoverageBand } from "./question-labels";
import type { EvidenceRelevance, ExpertQuestion } from "./question-types";

const RELEVANCE_WEIGHT: Record<EvidenceRelevance, number> = {
  baixa: 5,
  media: 10,
  alta: 18,
  determinante: 30,
};

export type CoverageResult = Readonly<{
  score: number; // 0..100
  band: CoverageBand;
  reasons: readonly string[];
}>;

export function coverageBandFromScore(score: number): CoverageBand {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s === 100) return "completa";
  if (s >= 75) return "boa";
  if (s >= 50) return "parcial";
  if (s >= 25) return "baixa";
  return "insuficiente";
}

function isOverdue(dueAt?: string, referenceIso?: string): boolean {
  if (!dueAt) return false;
  const now = referenceIso
    ? new Date(referenceIso).getTime()
    : Date.UTC(2026, 6, 25, 12, 0, 0);
  const t = new Date(dueAt).getTime();
  if (Number.isNaN(t)) return false;
  return t < now;
}

export function computeCoverage(
  q: ExpertQuestion,
  referenceIso?: string,
): CoverageResult {
  const reasons: string[] = [];
  let score = 0;

  if (q.status === "nao_aplicavel") {
    return { score: 100, band: "completa", reasons: ["Quesito não aplicável"] };
  }

  const answered =
    (q.technicalAnswer ?? "").trim().length > 0 ||
    (q.conclusion ?? "").trim().length > 0;
  if (answered) {
    score += 25;
    reasons.push("Resposta técnica registrada (+25)");
  } else {
    reasons.push("Sem resposta técnica");
  }

  // Evidence contributions
  let evidenceScore = 0;
  let determinantCount = 0;
  for (const link of q.evidenceLinks) {
    evidenceScore += RELEVANCE_WEIGHT[link.relevance];
    if (link.relevance === "determinante") determinantCount += 1;
    if (link.contradictsAnswer && !q.divergenceAnalyzed) {
      score -= 5;
      reasons.push(`Contradição sem análise: ${link.sourceLabel} (-5)`);
    }
  }
  evidenceScore = Math.min(evidenceScore, 50);
  if (evidenceScore > 0) {
    score += evidenceScore;
    reasons.push(`Evidências vinculadas (+${evidenceScore})`);
  }
  if (determinantCount > 0) {
    const bonus = Math.min(10, determinantCount * 5);
    score += bonus;
    reasons.push(`Evidência determinante (+${bonus})`);
  }

  // Gaps
  const openGaps = q.gapItems.filter((g) => !g.resolved);
  if (openGaps.length > 0) {
    const penalty = Math.min(30, openGaps.length * 10);
    score -= penalty;
    reasons.push(`Lacunas abertas: ${openGaps.length} (-${penalty})`);
  }

  // Divergence
  if (q.status === "com_divergencia" && !q.divergenceAnalyzed) {
    score -= 10;
    reasons.push("Divergência não analisada (-10)");
  }

  // Overdue
  if (isOverdue(q.dueAt, referenceIso) && q.status !== "respondido") {
    score -= 10;
    reasons.push("Prazo vencido (-10)");
  }

  // Fully answered status boosts
  if (q.status === "respondido" && answered && openGaps.length === 0) {
    score += 15;
    reasons.push("Situação: respondido (+15)");
  } else if (q.status === "parcial") {
    reasons.push("Situação: parcial");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, band: coverageBandFromScore(score), reasons };
}

export type GlobalCoverage = Readonly<{
  averageScore: number;
  totals: Readonly<Record<CoverageBand, number>>;
  completeCount: number;
  partialCount: number;
  withoutEvidenceCount: number;
  divergentCount: number;
  overdueCount: number;
  caseGaps: readonly { caseId: string; openGaps: number }[];
  evidenceTypeUsage: readonly { type: string; count: number }[];
  priorityIssues: readonly { questionId: string; sequence: number; reason: string }[];
}>;

export function computeGlobalCoverage(
  questions: readonly ExpertQuestion[],
  referenceIso?: string,
): GlobalCoverage {
  const perQ = questions.map((q) => ({ q, cov: computeCoverage(q, referenceIso) }));
  const totals: Record<CoverageBand, number> = {
    insuficiente: 0,
    baixa: 0,
    parcial: 0,
    boa: 0,
    completa: 0,
  };
  let sum = 0;
  let complete = 0;
  let partial = 0;
  let noEv = 0;
  let divergent = 0;
  let overdue = 0;
  const caseMap = new Map<string, number>();
  const evUsage = new Map<string, number>();
  const priority: { questionId: string; sequence: number; reason: string }[] = [];

  for (const { q, cov } of perQ) {
    totals[cov.band] += 1;
    sum += cov.score;
    if (cov.band === "completa") complete += 1;
    if (q.status === "parcial") partial += 1;
    if (q.evidenceLinks.length === 0 && q.status !== "nao_aplicavel") noEv += 1;
    if (q.status === "com_divergencia") divergent += 1;
    if (isOverdue(q.dueAt, referenceIso) && q.status !== "respondido") overdue += 1;

    if (q.caseId) {
      const open = q.gapItems.filter((g) => !g.resolved).length;
      caseMap.set(q.caseId, (caseMap.get(q.caseId) ?? 0) + open);
    }
    for (const l of q.evidenceLinks) {
      evUsage.set(l.evidenceType, (evUsage.get(l.evidenceType) ?? 0) + 1);
    }

    if (cov.band === "insuficiente" || q.status === "com_divergencia") {
      priority.push({
        questionId: q.id,
        sequence: q.sequence,
        reason: cov.reasons[0] ?? "Necessita atenção",
      });
    }
  }

  const caseGaps = Array.from(caseMap.entries())
    .map(([caseId, openGaps]) => ({ caseId, openGaps }))
    .sort((a, b) => b.openGaps - a.openGaps);

  const evidenceTypeUsage = Array.from(evUsage.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  priority.sort((a, b) => a.sequence - b.sequence);

  return {
    averageScore: perQ.length === 0 ? 0 : Math.round(sum / perQ.length),
    totals,
    completeCount: complete,
    partialCount: partial,
    withoutEvidenceCount: noEv,
    divergentCount: divergent,
    overdueCount: overdue,
    caseGaps,
    evidenceTypeUsage,
    priorityIssues: priority,
  };
}
