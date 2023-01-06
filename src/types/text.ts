import type { Brand } from "./brand";

export type ShortText = Brand<string, "SHORT_TEXT">;
export type LongText = Brand<string, "LONG_TEXT">;

export function assertIsShortText(text: string): asserts text is ShortText {
  if (text.length > 255) throw new TypeError("text exceeded 255 characters");
}

export function assertIsLongText(text: string): asserts text is LongText {
  if (text.length > 1_000) throw new TypeError("text exceeded 1000 characters");
}
