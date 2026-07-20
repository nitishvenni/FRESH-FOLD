export const BOOKING_TIME_ZONE = process.env.BOOKING_TIME_ZONE?.trim() || "Asia/Kolkata";
export const PICKUP_SLOTS = ["9 AM - 12 PM", "12 PM - 3 PM", "3 PM - 6 PM"] as const;
export type PickupSlot = (typeof PICKUP_SLOTS)[number];

const parts = (now: Date, timeZone = BOOKING_TIME_ZONE) => {
  try {
    const value = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) => value.find((part) => part.type === type)?.value;
    return { year: get("year")!, month: get("month")!, day: get("day")! };
  } catch { return parts(now, "Asia/Kolkata"); }
};

export const getBusinessTodayIsoDate = (now = new Date()) => { const value = parts(now); return `${value.year}-${value.month}-${value.day}`; };
export const addCalendarDays = (isoDate: string, days: number) => { const date = new Date(`${isoDate}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
export const isCanonicalPickupSlot = (value: unknown): value is PickupSlot => typeof value === "string" && (PICKUP_SLOTS as readonly string[]).includes(value);
export const isCanonicalBusinessDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export const isBookablePickupDate = (value: unknown, now = new Date()) => isCanonicalBusinessDate(value) && [0, 1, 2, 3].some((offset) => addCalendarDays(getBusinessTodayIsoDate(now), offset) === value);
