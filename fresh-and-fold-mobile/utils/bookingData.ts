export const itemKeys = [
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

export type ItemKey = (typeof itemKeys)[number];

export const isItemKey = (value: unknown): value is ItemKey =>
  typeof value === "string" && (itemKeys as readonly string[]).includes(value);

export type ItemState = Record<ItemKey, number>;

export const clothingItems: Array<{ key: ItemKey; name: string }> = [
  { key: "shirt", name: "Shirt" },
  { key: "tshirt", name: "T-Shirt" },
  { key: "jeans", name: "Jeans" },
  { key: "trousers", name: "Trousers" },
  { key: "dress", name: "Dress" },
  { key: "jacket", name: "Jacket" },
  { key: "sweater", name: "Sweater" },
  { key: "shorts", name: "Shorts" },
  { key: "leggings", name: "Leggings" },
  { key: "skirt", name: "Skirt" },
  { key: "kurta", name: "Kurta" },
  { key: "saree", name: "Saree" },
  { key: "hoodie", name: "Hoodie" },
];

export const homeItems: Array<{ key: ItemKey; name: string }> = [
  { key: "bedsheet", name: "Bedsheet" },
  { key: "pillowcover", name: "Pillow Cover" },
  { key: "towel", name: "Towel" },
  { key: "curtain", name: "Curtain" },
  { key: "blanket", name: "Blanket" },
];

export const allItems = [...clothingItems, ...homeItems];

export const initialItems = allItems.reduce((acc, item) => {
  acc[item.key] = 0;
  return acc;
}, {} as ItemState);
