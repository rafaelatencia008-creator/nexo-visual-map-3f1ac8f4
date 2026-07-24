/**
 * LV-09.1A.4 — provas de tipo estáticas: EntityMetadata é profundamente readonly.
 */

import type { EntityMetadata } from "../src/domain/core/common";
import { isoDateTimeToEpoch, compareIsoDateTime } from "../src/domain/core/common";
import type { Deadline, Appointment } from "../src/domain/core/agenda";

declare const meta: EntityMetadata;
// @ts-expect-error version é readonly
meta.version = 10;
// @ts-expect-error createdAt é readonly
meta.createdAt = meta.createdAt;
// @ts-expect-error updatedAt é readonly
meta.updatedAt = meta.updatedAt;

declare const dl: Deadline;
// @ts-expect-error metadata do Deadline é readonly
dl.metadata = dl.metadata;
// @ts-expect-error campo interno da metadata é readonly
dl.metadata.version = 99;
// @ts-expect-error campo interno da metadata é readonly
dl.metadata.createdAt = dl.metadata.createdAt;
// @ts-expect-error campo interno da metadata é readonly
dl.metadata.updatedAt = dl.metadata.updatedAt;

declare const ap: Appointment;
// @ts-expect-error campo interno da metadata é readonly
ap.metadata.version = 99;

// Helpers puros retornam number
const _epoch: number = isoDateTimeToEpoch(dl.metadata.createdAt);
const _cmp: number = compareIsoDateTime(dl.metadata.createdAt, dl.metadata.updatedAt);
void _epoch;
void _cmp;

export {};
