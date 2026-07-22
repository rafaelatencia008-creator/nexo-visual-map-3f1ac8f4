/**
 * LV-08.2 — modelo funcional puro da criação de Processo.
 *
 * Somente TypeScript. Nenhum React, storage ou rede. Concentra o schema
 * Zod, os valores iniciais, a construção do `CreateCaseInput` e o
 * mapeamento público dos erros de serviço.
 */

import { z } from "zod";
import {
  CONFIDENTIALITY_LEVELS,
  type ConfidentialityLevel,
} from "@/domain/core/case";
import type { CreateCaseInput } from "@/domain/services/inputs";
import type { ServiceError } from "@/domain/services/result";

// ---- Schema local ---------------------------------------------------------

export const processCreateSchema = z.object({
  reference: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, {
      message: "Informe a referência do processo.",
    }),
  title: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, {
      message: "Informe o título do processo.",
    }),
  confidentiality: z.enum(
    CONFIDENTIALITY_LEVELS as unknown as readonly [
      ConfidentialityLevel,
      ...ConfidentialityLevel[],
    ],
  ),
});

/** Valores brutos do formulário — antes das transformações do Zod. */
export type ProcessCreateFormValues = Readonly<{
  reference: string;
  title: string;
  confidentiality: ConfidentialityLevel;
}>;

export const PROCESS_CREATE_INITIAL_VALUES: ProcessCreateFormValues = Object.freeze({
  reference: "",
  title: "",
  confidentiality: "standard",
});

// ---- Construção do input oficial ------------------------------------------

export function buildCreateCaseInput(
  values: ProcessCreateFormValues,
): CreateCaseInput {
  return {
    reference: values.reference.trim(),
    title: values.title.trim(),
    confidentiality: values.confidentiality,
  };
}

// ---- Erros públicos --------------------------------------------------------

export type ProcessCreateFieldName = "reference" | "title" | "confidentiality";

export type ProcessCreatePublicError = Readonly<{
  message: string;
  fieldErrors?: Readonly<Partial<Record<ProcessCreateFieldName, string>>>;
}>;

const GENERIC_MESSAGE = "Não foi possível criar o processo. Tente novamente.";

export function mapCreateCaseError(error: ServiceError): ProcessCreatePublicError {
  switch (error.code) {
    case "conflict":
      if (error.message === "duplicate_case_reference") {
        const msg =
          "Já existe um processo com esta referência no escopo atual.";
        return { message: msg, fieldErrors: { reference: msg } };
      }
      return { message: GENERIC_MESSAGE };

    case "validation_error": {
      if (error.message === "invalid_case_input") {
        const fieldErrors: Partial<Record<ProcessCreateFieldName, string>> = {};
        const raw = "fieldErrors" in error ? error.fieldErrors : undefined;
        if (raw && "reference" in raw) {
          fieldErrors.reference = "Informe a referência do processo.";
        }
        if (raw && "title" in raw) {
          fieldErrors.title = "Informe o título do processo.";
        }
        const message =
          Object.keys(fieldErrors).length > 0
            ? "Revise os campos destacados abaixo."
            : GENERIC_MESSAGE;
        return Object.keys(fieldErrors).length > 0
          ? { message, fieldErrors }
          : { message };
      }
      return { message: GENERIC_MESSAGE };
    }

    case "unauthorized":
      return {
        message:
          "Sua sessão não está disponível. Entre novamente para continuar.",
      };

    case "forbidden":
      return { message: "Você não tem permissão para criar processos." };

    case "offline":
      return {
        message:
          "Você está sem conexão no momento. Tente novamente quando a conexão for restabelecida.",
      };

    case "unavailable":
      return {
        message: "O serviço está temporariamente indisponível. Tente novamente.",
      };

    case "not_found":
    case "internal_error":
    default:
      return { message: GENERIC_MESSAGE };
  }
}
