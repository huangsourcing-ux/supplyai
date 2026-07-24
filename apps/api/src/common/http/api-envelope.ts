export type {
  ApiErrorDetail,
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
} from "@chinasupply/schemas";

const RESPONSE_WITH_META = Symbol("RESPONSE_WITH_META");

export interface ResponseWithMeta<Data, Meta> {
  readonly [RESPONSE_WITH_META]: true;
  readonly data: Data;
  readonly meta: Meta;
}

export function responseWithMeta<Data, Meta>(
  data: Data,
  meta: Meta,
): ResponseWithMeta<Data, Meta> {
  return {
    [RESPONSE_WITH_META]: true,
    data,
    meta,
  };
}

export function isResponseWithMeta(
  value: unknown,
): value is ResponseWithMeta<unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    RESPONSE_WITH_META in value &&
    value[RESPONSE_WITH_META] === true
  );
}
