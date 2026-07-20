/**
 * Server-side scheduling facts for Natural-Language Booking. The booking UI is
 * currently available for today and the following three calendar days in the
 * Fresh & Fold business timezone.
 */
export const BOOKING_TIME_ZONE = process.env.BOOKING_TIME_ZONE?.trim() || "Asia/Kolkata";

export const PICKUP_SLOTS = [
  "9 AM - 12 PM",
  "12 PM - 3 PM",
  "3 PM - 6 PM",
] as const;

export type PickupSlot = (typeof PICKUP_SLOTS)[number];

const getDateParts = (date: Date, timeZone = BOOKING_TIME_ZONE) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const year = value("year");
    const month = value("month");
    const day = value("day");
    if (!year || !month || !day) throw new Error("Missing calendar date parts.");
    return { year, month, day };
  } catch {
    // A bad deployment setting must not make a provider response unsafe. The
    // product's approved default remains the deterministic fallback.
    return getDateParts(date, "Asia/Kolkata");
  }
};

export const getBusinessTodayIsoDate = (now = new Date()): string => {
  const { year, month, day } = getDateParts(now);
  return `${year}-${month}-${day}`;
};

export const addCalendarDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const isBookablePickupDate = (isoDate: string, now = new Date()): boolean => {
  const today = getBusinessTodayIsoDate(now);
  return [0, 1, 2, 3].some((offset) => addCalendarDays(today, offset) === isoDate);
};

export const normalizePickupDate = (
  value: string | null,
  now = new Date()
): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const today = getBusinessTodayIsoDate(now);
  const candidate = normalized === "today"
    ? today
    : normalized === "tomorrow"
      ? addCalendarDays(today, 1)
      : /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
        ? value.trim()
        : null;
  return candidate && isBookablePickupDate(candidate, now) ? candidate : null;
};

/** Maps an explicit clock time only when it falls inside one current slot. */
export const normalizePickupSlot = (value: string | null): PickupSlot | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if ((PICKUP_SLOTS as readonly string[]).includes(trimmed)) return trimmed as PickupSlot;

  const compact = trimmed.toLowerCase().replace(/\s+/g, "");
  let minutes: number | null = null;
  const twelveHour = compact.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?(am|pm)$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] ?? "0");
    minutes = ((hour % 12) + (twelveHour[3] === "pm" ? 12 : 0)) * 60 + minute;
  } else {
    // Require a colon for 24-hour time so phrases such as "around 5" remain
    // unresolved instead of being turned into a booking slot.
    const twentyFourHour = compact.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (twentyFourHour) minutes = Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }

  if (minutes === null) return null;
  if (minutes >= 9 * 60 && minutes < 12 * 60) return PICKUP_SLOTS[0];
  if (minutes >= 12 * 60 && minutes < 15 * 60) return PICKUP_SLOTS[1];
  if (minutes >= 15 * 60 && minutes < 18 * 60) return PICKUP_SLOTS[2];
  return null;
};
