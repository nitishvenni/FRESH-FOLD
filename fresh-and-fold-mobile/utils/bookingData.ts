export const itemKeys = [
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
