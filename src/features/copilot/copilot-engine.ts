import type {
  CopilotEngineInput,
  CopilotEngineOutput,
  CopilotIntent,
  CopilotProposedAction,
  CopilotReference,
  CopilotSourceRecord,
  CopilotSourceType,
} from "./copilot-types";
import { classifyIntent } from "./copilot-intents";
import {
  DRAFT_DISCLAIMER,
  INSUFFICIENT_DATA_MESSAGE,
  REFUSAL_MESSAGE,
  UNKNOWN_INTENT_MESSAGE,
} from "./copilot-labels";
import { computeFingerprint } from "./copilot-action-adapters";

let engineCounter = 0;
function nextId(prefix: string): string {
  engineCounter += 1;
  return `${prefix}-${engineCounter}`;
}
export function resetEngineCounter(seed = 0): void {
  engineCounter = seed;
}

function pickByType(
  sources: readonly CopilotSourceRecord[],
  type: CopilotSourceType,
  limit = 5,
): readonly CopilotSourceRecord[] {
  return sources.filter((s) => s.sourceType === type).slice(0, limit);
}

function refFromSource(
  s: CopilotSourceRecord,
): CopilotReference {
  return {
    id: nextId("ref"),
    sourceType: s.sourceType,
    sourceId: s.id,
    parentId: s.parentId,
    label: s.label,
    excerpt: s.excerpt,
    route: s.route,
    sourceUpdatedAt: s.updatedAt,
  };
}

function bulletize(items: readonly string[]): string {
  return items.map((i) => `• ${i}`).join("\n");
}

export function runCopilot(input: CopilotEngineInput): CopilotEngineOutput {
  const intent = classifyIntent(input.text, input.context);
  const ctx = input.context;
  const sources = input.availableSources;

  if (intent === "recusar_acao") {
    return {
      intent,
      responseText: REFUSAL_MESSAGE,
      references: [],
      suggestedPrompts: [],
      proposedActions: [],
    };
  }

  if (intent === "desconhecido") {
    return {
      intent,
      responseText: UNKNOWN_INTENT_MESSAGE,
      references: [],
      suggestedPrompts: [
        "Resuma o contexto desta página.",
        "Quais pendências exigem atenção?",
      ],
      proposedActions: [],
    };
  }

  if (intent === "ajuda_sistema") {
    return {
      intent,
      responseText:
        "O Copiloto Nexo é uma simulação local. Ele reconhece o módulo aberto, mostra fontes internas e propõe ações que exigem sua confirmação antes de aplicar.",
      references: [],
      suggestedPrompts: [
        "Resuma o contexto desta página.",
        "Quais pendências exigem atenção?",
        "Quais prazos estão próximos?",
      ],
      proposedActions: [],
    };
  }

  if (intent === "abrir_modulo") {
    return {
      intent,
      responseText: `Você pode navegar diretamente para ${ctx.moduleLabel} usando o menu lateral.`,
      references: [],
      suggestedPrompts: [],
      proposedActions: [],
    };
  }

  if (intent === "listar_pendencias") {
    const items = pickByType(sources, "pendencia", 6);
    if (items.length === 0) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    const refs = items.map(refFromSource);
    return {
      intent,
      responseText: `Encontrei ${items.length} pendências no sistema:\n${bulletize(
        items.map((i) => `${i.label}${i.excerpt ? ` — ${i.excerpt}` : ""}`),
      )}`,
      references: refs,
      suggestedPrompts: ["Identifique prazos vencidos.", "Quais prazos estão próximos?"],
      proposedActions: [],
    };
  }

  if (intent === "identificar_prazos") {
    const docs = pickByType(sources, "documento", 20).filter(
      (d) => d.metadata && (d.metadata as Record<string, unknown>).deadlineAt,
    );
    if (docs.length === 0) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    return {
      intent,
      responseText: `Documentos com prazo cadastrado:\n${bulletize(docs.map((d) => d.label))}`,
      references: docs.map(refFromSource),
      suggestedPrompts: ["Quais pendências exigem atenção?"],
      proposedActions: [],
    };
  }

  if (intent === "localizar_documentos" || intent === "resumir_documentos") {
    const docs = pickByType(sources, "documento", 6);
    if (docs.length === 0) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    return {
      intent,
      responseText: `Localizei ${docs.length} documentos no contexto atual:\n${bulletize(
        docs.map((d) => `${d.label}${d.excerpt ? ` — ${d.excerpt}` : ""}`),
      )}`,
      references: docs.map(refFromSource),
      suggestedPrompts: ["Quais documentos têm prazo próximo?"],
      proposedActions: [],
    };
  }

  if (intent === "sugerir_perguntas_entrevista" || intent === "preparar_roteiro_entrevista") {
    const ent = pickByType(sources, "entrevista", 4);
    return {
      intent,
      responseText:
        "Perguntas sugeridas (rascunho manual):\n" +
        bulletize([
          "Descreva com suas palavras os fatos ocorridos.",
          "Existem testemunhas ou pessoas que possam confirmar sua versão?",
          "Há documentos que respaldem a sua declaração?",
          "Você tem informações complementares relevantes?",
        ]) +
        "\n\n" +
        DRAFT_DISCLAIMER,
      references: ent.map(refFromSource),
      suggestedPrompts: ["Resuma as notas registradas na entrevista."],
      proposedActions: ent[0]
        ? [
            makeAction({
              kind: "add_interview_note",
              label: "Adicionar nota à entrevista",
              description: `Adiciona nota manual demonstrativa em ${ent[0].label}.`,
              targetType: "entrevista",
              targetId: ent[0].id,
              payload: {
                text: "Nota gerada por rascunho do copiloto — revisar antes de manter.",
                kind: "observacao",
              },
              risk: "medium",
              fingerprint: computeFingerprint(ent[0]),
            }),
          ]
        : [],
    };
  }

  if (intent === "preparar_checklist_diligencia") {
    const dil = pickByType(sources, "diligencia", 3);
    return {
      intent,
      responseText:
        "Checklist sugerido (rascunho manual):\n" +
        bulletize([
          "Confirmar local, data e horário.",
          "Levar equipamentos e formulários.",
          "Registrar fotografias com legenda.",
          "Colher localização geográfica.",
          "Anotar pessoas presentes e testemunhas.",
        ]) +
        "\n\n" +
        DRAFT_DISCLAIMER,
      references: dil.map(refFromSource),
      suggestedPrompts: ["Liste as pendências da diligência."],
      proposedActions: dil[0]
        ? [
            makeAction({
              kind: "add_diligence_pending",
              label: "Adicionar pendência à diligência",
              description: `Registra pendência demonstrativa em ${dil[0].label}.`,
              targetType: "diligencia",
              targetId: dil[0].id,
              payload: { text: "Confirmar equipamentos antes de sair." },
              risk: "low",
              fingerprint: computeFingerprint(dil[0]),
            }),
          ]
        : [],
    };
  }

  if (
    intent === "localizar_evidencias" ||
    intent === "identificar_divergencias"
  ) {
    let evs = pickByType(sources, "evidencia", 8);
    if (intent === "identificar_divergencias") {
      evs = evs.filter((e) => (e.metadata as Record<string, unknown>).contradicts);
    }
    if (evs.length === 0) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    return {
      intent,
      responseText: `Evidências no contexto atual:\n${bulletize(evs.map((e) => e.label))}`,
      references: evs.map(refFromSource),
      suggestedPrompts: ["Quais lacunas impedem este quesito de ser concluído?"],
      proposedActions: [],
    };
  }

  if (intent === "identificar_lacunas") {
    const qs = pickByType(sources, "quesito", 20).filter(
      (q) => Number((q.metadata as Record<string, unknown>).gapCount ?? 0) > 0,
    );
    const target = ctx.entityType === "quesito" && ctx.entityId
      ? sources.find((s) => s.sourceType === "quesito" && s.id === ctx.entityId)
      : undefined;
    const refs = (target ? [target, ...qs.filter((q) => q.id !== target.id)] : qs)
      .slice(0, 6)
      .map(refFromSource);
    return {
      intent,
      responseText:
        qs.length === 0 && !target
          ? INSUFFICIENT_DATA_MESSAGE
          : `Identifiquei quesitos com lacunas abertas:\n${bulletize(
              refs.map((r) => r.label),
            )}`,
      references: refs,
      suggestedPrompts: ["Localize evidências relevantes no contexto atual."],
      proposedActions: target
        ? [
            makeAction({
              kind: "create_question_gap",
              label: "Registrar lacuna no quesito",
              description: `Adiciona lacuna demonstrativa em ${target.label}.`,
              targetType: "quesito",
              targetId: target.id,
              payload: { text: "Falta documento comprobatório." },
              risk: "medium",
              fingerprint: computeFingerprint(target),
            }),
          ]
        : [],
    };
  }

  if (intent === "explicar_cobertura_quesito") {
    const target = ctx.entityType === "quesito" && ctx.entityId
      ? sources.find((s) => s.sourceType === "quesito" && s.id === ctx.entityId)
      : pickByType(sources, "quesito", 1)[0];
    if (!target) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    const evCount = Number((target.metadata as Record<string, unknown>).evidenceCount ?? 0);
    const gapCount = Number((target.metadata as Record<string, unknown>).gapCount ?? 0);
    return {
      intent,
      responseText: `Cobertura do quesito "${target.label}":\n• Evidências vinculadas: ${evCount}\n• Lacunas abertas: ${gapCount}\n• Status: ${(target.metadata as Record<string, unknown>).status}`,
      references: [refFromSource(target)],
      suggestedPrompts: ["Crie um rascunho manual de resposta com base nas evidências."],
      proposedActions: [],
    };
  }

  if (intent === "rascunhar_resposta_quesito") {
    const target = ctx.entityType === "quesito" && ctx.entityId
      ? sources.find((s) => s.sourceType === "quesito" && s.id === ctx.entityId)
      : pickByType(sources, "quesito", 1)[0];
    if (!target) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    const draft =
      `Síntese\nO quesito "${target.label}" foi analisado com base nos dados disponíveis.\n\n` +
      `Elementos analisados\n${target.excerpt ?? "(sem trecho)"}\n\n` +
      `Resposta proposta\nCom base nas evidências disponíveis, o profissional deve elaborar a resposta técnica revisando cada fonte listada.\n\n` +
      `Limitações\nRascunho automático — não substitui análise técnica.\n\n` +
      `Fontes consideradas\n${target.label}\n\n${DRAFT_DISCLAIMER}`;
    return {
      intent,
      responseText: draft,
      references: [refFromSource(target)],
      suggestedPrompts: ["Explique a cobertura deste quesito."],
      proposedActions: [
        makeAction({
          kind: "save_question_draft",
          label: "Salvar rascunho de resposta",
          description: `Salva o rascunho manual em ${target.label}.`,
          targetType: "quesito",
          targetId: target.id,
          payload: { draft },
          risk: "high",
          fingerprint: computeFingerprint(target),
        }),
      ],
    };
  }

  if (intent === "preparar_para_laudo") {
    const qs = pickByType(sources, "quesito", 20).filter(
      (q) => (q.metadata as Record<string, unknown>).readyForReport,
    );
    if (qs.length === 0) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    return {
      intent,
      responseText: `Quesitos preparados para o laudo:\n${bulletize(qs.map((q) => q.label))}`,
      references: qs.map(refFromSource),
      suggestedPrompts: ["Liste itens ainda pendentes para o laudo."],
      proposedActions: [],
    };
  }

  if (intent === "explicar_situacao_processo") {
    const proc = pickByType(sources, "processo", 1)[0];
    if (!proc) {
      return {
        intent,
        responseText: INSUFFICIENT_DATA_MESSAGE,
        references: [],
        suggestedPrompts: [],
        proposedActions: [],
      };
    }
    return {
      intent,
      responseText: `${proc.label} — ${proc.excerpt ?? ""}\nStatus: ${(proc.metadata as Record<string, unknown>).status}`,
      references: [refFromSource(proc)],
      suggestedPrompts: ["Sugira próximos passos para esta perícia."],
      proposedActions: [],
    };
  }

  if (intent === "sugerir_proximos_passos") {
    return {
      intent,
      responseText:
        "Sugestões (rascunho manual):\n" +
        bulletize([
          "Revisar pendências abertas.",
          "Confirmar prazos próximos.",
          "Consolidar quesitos preparados para o laudo.",
        ]) +
        "\n\n" +
        DRAFT_DISCLAIMER,
      references: [],
      suggestedPrompts: ["Quais prazos estão próximos?"],
      proposedActions: [],
    };
  }

  // resumo_contexto default
  const totalDocs = sources.filter((s) => s.sourceType === "documento").length;
  const totalEnt = sources.filter((s) => s.sourceType === "entrevista").length;
  const totalQ = sources.filter((s) => s.sourceType === "quesito").length;
  const totalPend = sources.filter((s) => s.sourceType === "pendencia").length;
  return {
    intent: "resumo_contexto",
    responseText:
      `Você está em ${ctx.moduleLabel}${ctx.entityLabel ? ` — ${ctx.entityLabel}` : ""}.\n` +
      `• Documentos: ${totalDocs}\n• Entrevistas: ${totalEnt}\n• Quesitos: ${totalQ}\n• Pendências: ${totalPend}`,
    references: pickByType(sources, "processo", 2).map(refFromSource),
    suggestedPrompts: [
      "Quais pendências exigem atenção?",
      "Quais prazos estão próximos?",
    ],
    proposedActions: [],
  };
}

function makeAction(opts: {
  kind: CopilotProposedAction["kind"];
  label: string;
  description: string;
  targetType: string;
  targetId?: string;
  payload: Record<string, unknown>;
  risk: CopilotProposedAction["risk"];
  fingerprint?: string;
}): CopilotProposedAction {
  return {
    id: nextId("act"),
    kind: opts.kind,
    label: opts.label,
    description: opts.description,
    targetType: opts.targetType,
    targetId: opts.targetId,
    payload: opts.payload,
    risk: opts.risk,
    status: "proposed",
    sourceFingerprint: opts.fingerprint,
  };
}

export function suggestionsForContext(
  ctx: CopilotEngineInput["context"],
): readonly string[] {
  switch (ctx.moduleKey) {
    case "documentos":
      return [
        "Resumir arquivos disponíveis",
        "Localizar documentos sem classificação",
        "Listar documentos relacionados ao processo atual",
      ];
    case "entrevistas":
      return [
        "Listar perguntas pendentes",
        "Sugerir perguntas complementares",
        "Preparar roteiro",
        "Resumir notas registradas",
      ];
    case "diligencias":
      return [
        "Preparar checklist",
        "Listar pendências da diligência",
        "Resumir fotos e localização",
      ];
    case "quesitos":
      return [
        "Identificar lacunas",
        "Explicar cobertura",
        "Localizar evidências",
        "Rascunhar resposta técnica",
        "Preparar para o laudo",
      ];
    case "agenda":
    case "pendencias":
      return [
        "Listar próximos compromissos",
        "Priorizar pendências",
        "Identificar prazos próximos",
      ];
    case "processos":
      return [
        "Explique a situação deste processo.",
        "Quais perícias estão em andamento?",
        "Quais pendências exigem atenção?",
      ];
    case "pericias":
      return [
        "Sugira próximos passos para esta perícia.",
        "Quais quesitos estão preparados para o laudo?",
      ];
    default:
      return [
        "Resuma o contexto desta página.",
        "Quais pendências exigem atenção?",
        "Quais prazos estão próximos?",
      ];
  }
}

export function moduleFromRoute(route: string): {
  moduleKey: string;
  moduleLabel: string;
} {
  if (route.startsWith("/app/processos")) return { moduleKey: "processos", moduleLabel: "Processos" };
  if (route.startsWith("/app/pericias")) return { moduleKey: "pericias", moduleLabel: "Perícias" };
  if (route.startsWith("/app/clientes")) return { moduleKey: "clientes", moduleLabel: "Clientes" };
  if (route.startsWith("/app/agenda")) return { moduleKey: "agenda", moduleLabel: "Agenda" };
  if (route.startsWith("/app/peritos")) return { moduleKey: "peritos", moduleLabel: "Peritos" };
  if (route.startsWith("/app/pendencias")) return { moduleKey: "pendencias", moduleLabel: "Pendências" };
  if (route.startsWith("/app/documentos")) return { moduleKey: "documentos", moduleLabel: "Documentos" };
  if (route.startsWith("/app/entrevistas")) return { moduleKey: "entrevistas", moduleLabel: "Entrevistas e diligências" };
  if (route.startsWith("/app/quesitos")) return { moduleKey: "quesitos", moduleLabel: "Quesitos e evidências" };
  if (route === "/app" || route.startsWith("/app")) return { moduleKey: "inicio", moduleLabel: "Painel" };
  return { moduleKey: "outro", moduleLabel: "Área do aplicativo" };
}
