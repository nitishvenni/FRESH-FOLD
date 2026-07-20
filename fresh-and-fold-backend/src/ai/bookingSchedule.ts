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

export type ExplicitPickupTimeExtraction = {
  hasExplicitTime: boolean;
  hasConflictingExplicitTimes: boolean;
  /** Canonical 24-hour time; it is never logged or sent to analytics. */
  normalizedTime: string | null;
};

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

const toClockMinutes = (value: string): number | null => {
  const compact = value.trim().toLowerCase().replace(/[.\s]/g, "");
  const twelveHour = compact.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?(am|pm)$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] ?? "0");
    return ((hour % 12) + (twelveHour[3] === "pm" ? 12 : 0)) * 60 + minute;
  }
  // Require a colon for 24-hour time so phrases such as "around 5" remain
  // unresolved instead of being turned into a booking slot.
  const twentyFourHour = compact.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return twentyFourHour ? Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]) : null;
};

const toCanonicalTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Extracts only explicit AM/PM or 24-hour clock syntax from original request
 * text. Bare quantities and vague time language are deliberately excluded.
 */
export const extractExplicitPickupTime = (requestText: string | undefined): ExplicitPickupTimeExtraction => {
  if (!requestText) return { hasExplicitTime: false, hasConflictingExplicitTimes: false, normalizedTime: null };
  const values = new Set<number>();
  const masked = requestText.split("");
  const meridiemPattern = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)(?![a-z])/gi;

  for (const match of requestText.matchAll(meridiemPattern)) {
    const minutes = toClockMinutes(match[0]);
    if (minutes !== null) values.add(minutes);
    const start = match.index ?? 0;
    for (let index = start; index < start + match[0].length; index += 1) masked[index] = " ";
  }

  for (const match of masked.join("").matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)) {
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    values.add(minutes);
  }

  if (values.size !== 1) {
    return {
      hasExplicitTime: values.size > 0,
      hasConflictingExplicitTimes: values.size > 1,
      normalizedTime: null,
    };
  }
  return { hasExplicitTime: true, hasConflictingExplicitTimes: false, normalizedTime: toCanonicalTime([...values][0]) };
};

/** Maps an explicit clock time only when it falls inside one current slot. */
export const normalizePickupSlot = (value: string | null): PickupSlot | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if ((PICKUP_SLOTS as readonly string[]).includes(trimmed)) return trimmed as PickupSlot;
  const minutes = toClockMinutes(trimmed);

  if (minutes === null) return null;
  if (minutes >= 9 * 60 && minutes < 12 * 60) return PICKUP_SLOTS[0];
  if (minutes >= 12 * 60 && minutes < 15 * 60) return PICKUP_SLOTS[1];
  if (minutes >= 15 * 60 && minutes < 18 * 60) return PICKUP_SLOTS[2];
  return null;
};
