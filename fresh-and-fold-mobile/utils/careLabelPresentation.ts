import type { CareLabelCategory, CareSymbol } from "../types/ai";

export const careLabelCategoryLabel = (category: CareLabelCategory): string => {
  switch (category) {
    case "washing": return "Washing";
    case "bleaching": return "Bleaching";
    case "drying": return "Drying";
    case "ironing": return "Ironing";
    case "dry_cleaning": return "Dry cleaning";
  }
};

export const careSymbolLabel = (symbol: CareSymbol): string => {
  switch (symbol) {
    case "wash": return "Wash symbol";
    case "do_not_wash": return "Do not wash";
    case "hand_wash": return "Hand wash";
    case "bleach_allowed": return "Bleach allowed";
    case "non_chlorine_bleach_only": return "Non-chlorine bleach only";
    case "do_not_bleach": return "Do not bleach";
    case "tumble_dry": return "Tumble dry";
    case "do_not_tumble_dry": return "Do not tumble dry";
    case "line_dry": return "Line dry";
    case "dry_flat": return "Dry flat";
    case "iron": return "Iron";
    case "do_not_iron": return "Do not iron";
    case "dry_clean": return "Dry clean";
    case "do_not_dry_clean": return "Do not dry clean";
  }
};
