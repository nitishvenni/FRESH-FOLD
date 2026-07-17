import {
  DetectedGarment,
  MappedGarmentDetection,
  MappedGarmentDetectionSchema,
} from "./contracts";

/** Existing backend/mobile catalog IDs only. This list intentionally has no prices. */
export const catalogItemIds = [
  "shirt",
  "tshirt",
  "jeans",
  "trousers",
  "dress",
  "jacket",
  "sweater",
  "shorts",
  "leggings",
  "skirt",
  "kurta",
  "saree",
  "hoodie",
  "bedsheet",
  "pillowcover",
  "towel",
  "curtain",
  "blanket",
] as const;

export type CatalogItemId = (typeof catalogItemIds)[number];

const catalogAliases: Record<CatalogItemId, readonly string[]> = {
  shirt: ["shirt", "formal shirt", "button down shirt"],
  tshirt: ["t shirt", "tee shirt", "tee", "tshirt"],
  jeans: ["jeans", "denim jeans", "denim pants"],
  trousers: ["trousers", "trouser", "pants", "slacks", "formal pants"],
  dress: ["dress", "gown"],
  jacket: ["jacket", "blazer", "coat"],
  sweater: ["sweater", "jumper", "cardigan", "pullover", "sweatshirt", "sweat shirt"],
  shorts: ["shorts", "short"],
  leggings: ["leggings", "legging"],
  skirt: ["skirt", "skirts"],
  kurta: ["kurta", "kurtas"],
  saree: ["saree", "sari", "sarees", "saris"],
  hoodie: ["hoodie", "hoodies"],
  bedsheet: ["bedsheet", "bed sheet"],
  pillowcover: ["pillow cover", "pillowcase", "pillow case"],
  towel: ["towel", "bath towel", "hand towel"],
  curtain: ["curtain", "drape", "drapes"],
  blanket: ["blanket", "quilt", "comforter"],
};

export const normalizeGarmentLabel = (label: string): string =>
  label
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const aliasIndex = new Map<string, CatalogItemId>(
  catalogItemIds.flatMap((catalogItemId) =>
    catalogAliases[catalogItemId].map((alias) => [
      normalizeGarmentLabel(alias),
      catalogItemId,
    ] as const)
  )
);

/**
 * Cosmetic/presentation prefixes that do not change a garment's catalog type.
 * This allow-list is deliberately narrow: material and garment terms are never
 * removed, and the remaining candidate must still exactly match a catalog alias.
 */
const leadingNonSemanticModifierPhrases = [
  ["short", "sleeve"],
  ["long", "sleeve"],
  ["folded"],
  ["formal"],
  ["printed"],
  ["patterned"],
  ["black"],
  ["white"],
  ["blue"],
  ["red"],
  ["green"],
  ["yellow"],
  ["grey"],
  ["gray"],
  ["brown"],
  ["beige"],
  ["navy"],
  ["maroon"],
  ["pink"],
  ["purple"],
  ["orange"],
] as const;

const withoutLeadingNonSemanticModifiers = (normalizedLabel: string): string => {
  const tokens = normalizedLabel.split(" ");
  let firstGarmentToken = 0;

  while (firstGarmentToken < tokens.length) {
    const nextModifier = leadingNonSemanticModifierPhrases.find((phrase) =>
      phrase.every((token, index) => tokens[firstGarmentToken + index] === token)
    );
    if (!nextModifier) break;
    firstGarmentToken += nextModifier.length;
  }

  return tokens.slice(firstGarmentToken).join(" ");
};

/**
 * The only AI-layer function that assigns catalogItemId. It first uses an
 * exact normalized alias, then retries only after repeatedly removing approved
 * leading cosmetic/style descriptors. Materials and garment terms are never
 * removed, and it never uses fuzzy or semantic matching.
 */
export const mapDetectedGarment = (detection: DetectedGarment): MappedGarmentDetection => {
  const normalizedLabel = normalizeGarmentLabel(detection.detectedLabel);
  const exactCatalogItemId = aliasIndex.get(normalizedLabel);
  const modifierStrippedCandidate = withoutLeadingNonSemanticModifiers(normalizedLabel);
  const catalogItemId =
    exactCatalogItemId ??
    (modifierStrippedCandidate ? aliasIndex.get(modifierStrippedCandidate) : undefined) ??
    null;

  return MappedGarmentDetectionSchema.parse({
    ...detection,
    normalizedLabel,
    catalogItemId,
    mappingStatus: catalogItemId ? "mapped" : "unmapped",
  });
};
