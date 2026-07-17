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
  sweater: ["sweater", "jumper", "cardigan", "pullover"],
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
 * The only AI-layer function that assigns catalogItemId. It uses exact,
 * normalized aliases and keeps an unsupported model label intact for review.
 */
export const mapDetectedGarment = (detection: DetectedGarment): MappedGarmentDetection => {
  const normalizedLabel = normalizeGarmentLabel(detection.detectedLabel);
  const catalogItemId = aliasIndex.get(normalizedLabel) ?? null;

  return MappedGarmentDetectionSchema.parse({
    ...detection,
    normalizedLabel,
    catalogItemId,
    mappingStatus: catalogItemId ? "mapped" : "unmapped",
  });
};
