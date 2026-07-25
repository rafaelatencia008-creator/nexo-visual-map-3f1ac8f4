/**
 * CommunicationService — implementação em memória (LV-09.2A).
 *
 * APPEND-ONLY. Determinístico. Sem Date.now, Math.random, crypto.randomUUID.
 * Leituras devolvem cópias profundas. Coerência semântica (kind × direção
 * × desfecho) é validada em `create` antes de qualquer efeito colateral.
 */

import type {
  Communication,
  CommunicationChannel,
  CommunicationDirection,
  CommunicationKind,
  CommunicationOutcome,
} from "../core/communication";
import {
  COMMUNICATION_NOTE_MAX,
  COMMUNICATION_RECIPIENT_MAX,
  COMMUNICATION_SUBJECT_MAX,
  isCoherentCommunication,
  isCommunication,
  isCommunicationChannel,
  isCommunicationDirection,
  isCommunicationKind,
  isCommunicationOutcome,
  kindRequiresChannel,
} from "../core/communication";
import {
  containsForbiddenKey,
  hasOnlyAllowedKeys,
  isIsoDateTime,
  isoDateTimeToEpoch,
} from "../core/common";
import type {
  AppointmentId,
  CaseId,
  CommunicationId,
} from "../core/ids";
import {
  isAppointmentId,
  isCaseId,
  isCommunicationId,
} from "../core/ids";
import type {
  CommunicationListOptions,
  CommunicationService,
} from "../services/communication-service";
import { COMMUNICATION_LIST_OPTIONS_ALLOWED_KEYS } from "../services/communication-service";
import type { CreateCommunicationInput } from "../services/inputs";
import type { ServiceResult } from "../services/result";
import type { PageResult } from "../services/pagination";
import { deepClone } from "./clone";
import type { MockStore } from "./store";
import type { MockClock } from "./clock";
import type { MockIdGenerator } from "./id-generator";
import { requireContext } from "./context-validation";
import { paginateItems, stableStringify } from "./pagination-mock";
import { computeAgendaAccessibleCaseIds } from "./agenda-case-access";

function invalid<T>(msg: string): ServiceResult<T> {
  return { ok: false, error: { code: "validation_error", message: msg } };
}
function notFound<T>(): ServiceResult<T> {
  return {
    ok: false,
    error: { code: "not_found", message: "communication_not_found" },
  };
}
function forbidden<T>(msg: string = "case_access_denied"): ServiceResult<T> {
  return { ok: false, error: { code: "forbidden", message: msg } };
}

const CREATE_ALLOWED: ReadonlySet<string> = new Set([
  "caseId",
  "appointmentId",
  "kind",
  "channel",
  "outcome",
  "direction",
  "subject",
  "note",
  "recipientLabel",
  "occurredAt",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function validateEnvelope<T>(
  input: unknown,
  allowed: ReadonlySet<string>,
): ServiceResult<T> | null {
  if (!isPlainObject(input)) return invalid<T>("invalid_input_shape");
  if (containsForbiddenKey(input)) return invalid<T>("forbidden_key");
  if (!hasOnlyAllowedKeys(input, allowed)) return invalid<T>("unknown_key");
  return null;
}

function validateOptionalTrimmed(v: unknown, max: number): string | null | "absent" {
  if (v === undefined) return "absent";
  if (typeof v !== "string") return null;
  if (v.length > max) return null;
  const t = v.trim();
  if (t.length === 0) return null;
  return t;
}

function compareCommunications(a: Communication, b: Communication): number {
  const t = isoDateTimeToEpoch(a.occurredAt) - isoDateTimeToEpoch(b.occurredAt);
  if (t !== 0) return t;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function validateEnumArray<T extends string>(
  v: unknown,
  guard: (x: unknown) => x is T,
): readonly T[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length === 0) return null;
  for (const x of v) if (!guard(x)) return null;
  return v as readonly T[];
}

export function createCommunicationServiceMock(
  store: MockStore,
  clock: MockClock,
  ids: MockIdGenerator,
): CommunicationService {
  return {
    async getById(context, caseId, appointmentId, communicationId) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId)) return invalid<Communication>("invalid_case_id");
      if (!isAppointmentId(appointmentId))
        return invalid<Communication>("invalid_appointment_id");
      if (!isCommunicationId(communicationId))
        return invalid<Communication>("invalid_communication_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId) return notFound<Communication>();
      const ap = store.appointments.get(appointmentId);
      if (!ap || ap.organizationId !== orgId || ap.caseId !== caseId) {
        return notFound<Communication>();
      }
      const accessible = computeAgendaAccessibleCaseIds(store, v.data.context);
      if (!accessible.has(caseId)) return forbidden<Communication>();
      const comm = store.communications.get(communicationId);
      if (
        !comm ||
        comm.organizationId !== orgId ||
        comm.caseId !== caseId ||
        comm.appointmentId !== appointmentId
      ) {
        return notFound<Communication>();
      }
      return { ok: true, data: deepClone(comm) };
    },

    async listByAppointment(context, caseId, appointmentId, options) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      if (!isCaseId(caseId))
        return invalid<PageResult<Communication>>("invalid_case_id");
      if (!isAppointmentId(appointmentId))
        return invalid<PageResult<Communication>>("invalid_appointment_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(caseId);
      if (!c || c.organizationId !== orgId)
        return notFound<PageResult<Communication>>();
      const ap = store.appointments.get(appointmentId);
      if (!ap || ap.organizationId !== orgId || ap.caseId !== caseId) {
        return notFound<PageResult<Communication>>();
      }
      const accessible = computeAgendaAccessibleCaseIds(store, v.data.context);
      if (!accessible.has(caseId))
        return forbidden<PageResult<Communication>>();

      let opts: CommunicationListOptions = {};
      if (options !== undefined) {
        const envelope = validateEnvelope<PageResult<Communication>>(
          options,
          COMMUNICATION_LIST_OPTIONS_ALLOWED_KEYS,
        );
        if (envelope) return envelope;
        opts = options;
      }
      let kindsArr: readonly CommunicationKind[] | null = null;
      if (opts.kinds !== undefined) {
        kindsArr = validateEnumArray(opts.kinds, isCommunicationKind);
        if (!kindsArr)
          return invalid<PageResult<Communication>>("invalid_kinds");
      }
      let channelsArr: readonly CommunicationChannel[] | null = null;
      if (opts.channels !== undefined) {
        channelsArr = validateEnumArray(opts.channels, isCommunicationChannel);
        if (!channelsArr)
          return invalid<PageResult<Communication>>("invalid_channels");
      }
      let outcomesArr: readonly CommunicationOutcome[] | null = null;
      if (opts.outcomes !== undefined) {
        outcomesArr = validateEnumArray(opts.outcomes, isCommunicationOutcome);
        if (!outcomesArr)
          return invalid<PageResult<Communication>>("invalid_outcomes");
      }
      let directionsArr: readonly CommunicationDirection[] | null = null;
      if (opts.directions !== undefined) {
        directionsArr = validateEnumArray(
          opts.directions,
          isCommunicationDirection,
        );
        if (!directionsArr)
          return invalid<PageResult<Communication>>("invalid_directions");
      }

      let items = Array.from(store.communications.values()).filter((m) => {
        if (m.organizationId !== orgId) return false;
        if (m.caseId !== caseId) return false;
        if (m.appointmentId !== appointmentId) return false;
        if (kindsArr && !kindsArr.includes(m.kind)) return false;
        if (channelsArr && !channelsArr.includes(m.channel)) return false;
        if (outcomesArr && !outcomesArr.includes(m.outcome)) return false;
        if (directionsArr && !directionsArr.includes(m.direction)) return false;
        return true;
      });
      items = items.sort(compareCommunications);
      const queryKey =
        `communication-list|org=${orgId}|case=${caseId}|appt=${appointmentId}|` +
        stableStringify({
          kinds: kindsArr,
          channels: channelsArr,
          outcomes: outcomesArr,
          directions: directionsArr,
        });
      const page = opts.page ?? { limit: 100 };
      return paginateItems(items, page, queryKey);
    },

    async create(context, input: CreateCommunicationInput) {
      const v = requireContext(store, context);
      if (!v.ok) return v;
      const envelope = validateEnvelope<Communication>(input, CREATE_ALLOWED);
      if (envelope) return envelope;
      const raw = input as unknown as Record<string, unknown>;
      if (!isCaseId(raw.caseId))
        return invalid<Communication>("invalid_case_id");
      if (!isAppointmentId(raw.appointmentId))
        return invalid<Communication>("invalid_appointment_id");
      const orgId = v.data.context.organizationId;
      const c = store.cases.get(raw.caseId);
      if (!c || c.organizationId !== orgId) return notFound<Communication>();
      const ap = store.appointments.get(raw.appointmentId);
      if (!ap || ap.organizationId !== orgId || ap.caseId !== raw.caseId) {
        return notFound<Communication>();
      }
      const accessible = computeAgendaAccessibleCaseIds(store, v.data.context);
      if (!accessible.has(raw.caseId)) return forbidden<Communication>();

      if (!isCommunicationKind(raw.kind))
        return invalid<Communication>("invalid_kind");
      if (!isCommunicationChannel(raw.channel))
        return invalid<Communication>("invalid_channel");
      if (!isCommunicationOutcome(raw.outcome))
        return invalid<Communication>("invalid_outcome");
      if (!isCommunicationDirection(raw.direction))
        return invalid<Communication>("invalid_direction");
      if (!isCoherentCommunication(raw.kind, raw.direction, raw.outcome)) {
        return invalid<Communication>("incoherent_kind_direction_outcome");
      }
      if (!isIsoDateTime(raw.occurredAt))
        return invalid<Communication>("invalid_occurred_at");

      let subject: string | undefined;
      if (raw.subject !== undefined) {
        const r = validateOptionalTrimmed(raw.subject, COMMUNICATION_SUBJECT_MAX);
        if (r === null) return invalid<Communication>("invalid_subject");
        if (r !== "absent") subject = r;
      }
      let note: string | undefined;
      if (raw.note !== undefined) {
        const r = validateOptionalTrimmed(raw.note, COMMUNICATION_NOTE_MAX);
        if (r === null) return invalid<Communication>("invalid_note");
        if (r !== "absent") note = r;
      }
      let recipientLabel: string | undefined;
      if (raw.recipientLabel !== undefined) {
        const r = validateOptionalTrimmed(
          raw.recipientLabel,
          COMMUNICATION_RECIPIENT_MAX,
        );
        if (r === null) return invalid<Communication>("invalid_recipient_label");
        if (r !== "absent") recipientLabel = r;
      }

      const previewId = ids.previewNext("communication");
      const previewTime = clock.previewNext();
      const preview: Communication = {
        id: previewId,
        organizationId: orgId,
        caseId: raw.caseId,
        appointmentId: raw.appointmentId,
        kind: raw.kind,
        channel: raw.channel,
        outcome: raw.outcome,
        direction: raw.direction,
        ...(subject !== undefined ? { subject } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(recipientLabel !== undefined ? { recipientLabel } : {}),
        occurredAt: raw.occurredAt,
        authorMembershipId: v.data.context.membershipId,
        metadata: {
          createdAt: previewTime,
          updatedAt: previewTime,
          version: 1,
        },
      };
      if (!isCommunication(preview))
        return invalid<Communication>("invalid_communication");
      ids.next("communication");
      clock.next();
      store.communications.set(preview.id, preview);
      return { ok: true, data: deepClone(preview) };
    },
  };
}
