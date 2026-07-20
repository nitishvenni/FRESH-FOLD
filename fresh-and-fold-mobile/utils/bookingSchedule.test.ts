import { describe, expect, it } from "vitest";
import { getBookingDateOptions, getCanonicalBookingDate, getRelativeBookingDateLabel, isPickupSlot } from "./bookingSchedule";

describe("mobile scheduling suggestions", () => {
  const now = new Date("2026-07-20T06:00:00.000Z");

  it("uses the India business calendar for the four scheduler dates", () => {
    expect(getBookingDateOptions(now).map((date) => date.isoDate)).toEqual([
      "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23",
    ]);
    expect(getRelativeBookingDateLabel("2026-07-21", now)).toBe("Tomorrow");
  });

  it("accepts only existing canonical scheduler slots", () => {
    expect(isPickupSlot("12 PM - 3 PM")).toBe(true);
    expect(isPickupSlot("12pm")).toBe(false);
  });

  it("converts a route display date to the canonical order API date", () => {
    const option = getBookingDateOptions(now)[1];
    expect(getCanonicalBookingDate(option.value, now)).toBe(option.isoDate);
    expect(getCanonicalBookingDate(option.isoDate, now)).toBe(option.isoDate);
    expect(getCanonicalBookingDate("Tomorrow", now)).toBeNull();
    expect(getCanonicalBookingDate("2026-08-01", now)).toBeNull();
  });
});
