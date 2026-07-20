import { mapDetectedGarment } from "./catalog";

const HOMOPHONE_QUANTITIES: Record<string, "two" | "four"> = {
  to: "two",
  too: "two",
  for: "four",
};
const MAX_GARMENT_LABEL_WORDS = 4;

const hasSupportedGarmentImmediatelyAfter = (text: string, start: number): boolean => {
  const words = text.slice(start).match(/[A-Za-z]+/g)?.slice(0, MAX_GARMENT_LABEL_WORDS) ?? [];
  return words.some((_, index) =>
    mapDetectedGarment({
      detectedLabel: words.slice(0, index + 1).join(" "),
      quantity: null,
      confidence: 0,
    }).mappingStatus === "mapped"
  );
};

/**
 * A provider-only parsing aid for common speech-recognition homophones. The
 * visible transcript and request contract remain untouched. A token is changed
 * only when the immediately following words deterministically map to the
 * supported catalog through the existing mapper.
 */
export const normalizeQuantityHomophonesForParsing = (requestText: string): string => {
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  for (const match of requestText.matchAll(/\b(to|too|for)\b/gi)) {
    const spokenToken = match[1].toLocaleLowerCase("en-US");
    const normalizedQuantity = HOMOPHONE_QUANTITIES[spokenToken];
    const start = match.index ?? -1;
    if (!normalizedQuantity || start < 0 || !hasSupportedGarmentImmediatelyAfter(requestText, start + match[0].length)) {
      continue;
    }
    replacements.push({ start, end: start + match[0].length, value: normalizedQuantity });
  }

  return replacements.reverse().reduce(
    (normalized, replacement) =>
      `${normalized.slice(0, replacement.start)}${replacement.value}${normalized.slice(replacement.end)}`,
    requestText
  );
};
