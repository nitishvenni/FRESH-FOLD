import { describe, expect, it } from "vitest";
import { normalizePickupDate, normalizePickupSlot } from "../../src/ai/bookingSchedule";

const now = new Date("2026-07-20T06:00:00.000Z");

describe("Natural-Language Booking schedule normalization", () => {
  it("resolves today and tomorrow in the business calendar", () => {
    expect(normalizePickupDate("today", now)).toBe("2026-07-20");
    expect(normalizePickupDate("tomorrow", now)).toBe("2026-07-21");
  });

  it("rejects past, too-distant, and vague date expressions", () => {
    expect(normalizePickupDate("2026-07-19", now)).toBeNull();
    expect(normalizePickupDate("2026-07-25", now)).toBeNull();
    expect(normalizePickupDate("tomorrow afternoon", now)).toBeNull();
  });

  it.each([
    ["9 AM", "9 AM - 12 PM"],
    ["11:59 AM", "9 AM - 12 PM"],
    ["12pm", "12 PM - 3 PM"],
    ["15:00", "3 PM - 6 PM"],
    ["5:59 PM", "3 PM - 6 PM"],
  ])("maps %s using start-inclusive, end-exclusive slot boundaries", (value, expected) => {
    expect(normalizePickupSlot(value)).toBe(expected);
  });

  it.each(["8:59 AM", "6 PM", "around 5", "tomorrow afternoon"]) 
  ("leaves unavailable or ambiguous time %s unresolved", (value) => {
    expect(normalizePickupSlot(value)).toBeNull();
  });
});
