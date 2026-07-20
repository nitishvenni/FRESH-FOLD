/** Shared mobile scheduling facts. The customer-facing picker uses Fresh &
 * Fold's India business calendar rather than the device's timezone. */
export const BOOKING_TIME_ZONE = "Asia/Kolkata";

export const PICKUP_SLOTS = [
  { value: "9 AM - 12 PM", description: "Morning slot" },
  { value: "12 PM - 3 PM", description: "Afternoon slot" },
  { value: "3 PM - 6 PM", description: "Evening slot" },
] as const;

export type PickupSlot = (typeof PICKUP_SLOTS)[number]["value"];

type BusinessDateParts = { year: string; month: string; day: string };

const getBusinessDateParts = (date: Date): BusinessDateParts => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return { year: value("year")!, month: value("month")!, day: value("day")! };
};

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getBusinessTodayIsoDate = (now = new Date()): string => {
  const { year, month, day } = getBusinessDateParts(now);
  return `${year}-${month}-${day}`;
};

export const formatBookingDate = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));

export const getBookingDateOptions = (now = new Date()) => {
  const today = getBusinessTodayIsoDate(now);
  return Array.from({ length: 4 }, (_, index) => {
    const isoDate = addDays(today, index);
    const displayDate = new Date(`${isoDate}T00:00:00.000Z`);
    return {
      isoDate,
      month: new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "short" }).format(displayDate).toUpperCase(),
      date: new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "2-digit" }).format(displayDate),
      day: new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short" }).format(displayDate),
      value: formatBookingDate(isoDate),
    };
  });
};

/**
 * Converts either the picker display value or its canonical ISO value into
 * the canonical business date used by the order API. Route parameters retain
 * the display value for the existing booking UI, but API payloads must never
 * send that presentation string as a pickup date.
 */
export const getCanonicalBookingDate = (value: unknown, now = new Date()): string | null => {
  if (typeof value !== "string") return null;
  const match = getBookingDateOptions(now).find((date) => date.isoDate === value || date.value === value);
  return match?.isoDate ?? null;
};

export const getRelativeBookingDateLabel = (isoDate: string, now = new Date()): string | null => {
  const today = getBusinessTodayIsoDate(now);
  if (isoDate === today) return "Today";
  if (isoDate === addDays(today, 1)) return "Tomorrow";
  return null;
};

export const isPickupSlot = (value: unknown): value is PickupSlot =>
  typeof value === "string" && PICKUP_SLOTS.some((slot) => slot.value === value);
