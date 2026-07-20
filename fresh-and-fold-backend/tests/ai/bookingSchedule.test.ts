import { describe, expect, it } from "vitest";
import { extractExplicitPickupTime, normalizePickupDate, normalizePickupSlot } from "../../src/ai/bookingSchedule";

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
    ["2 p.m.", "12 PM - 3 PM"],
    ["15:00", "3 PM - 6 PM"],
    ["5:59 PM", "3 PM - 6 PM"],
  ])("maps %s using start-inclusive, end-exclusive slot boundaries", (value, expected) => {
    expect(normalizePickupSlot(value)).toBe(expected);
  });

  it.each(["8:59 AM", "6 PM", "around 5", "tomorrow afternoon"]) 
  ("leaves unavailable or ambiguous time %s unresolved", (value) => {
    expect(normalizePickupSlot(value)).toBeNull();
  });

  it.each([
    ["Dry clean two jackets tomorrow at 2 PM", "14:00"],
    ["Tomorrow at 12pm", "12:00"],
    ["Tomorrow at 2:00 PM", "14:00"],
    ["Tomorrow at 14:00", "14:00"],
    ["Tomorrow at 2 p.m.", "14:00"],
  ])("extracts only an explicit clock expression from %s", (requestText, normalizedTime) => {
    expect(extractExplicitPickupTime(requestText)).toEqual({
      hasExplicitTime: true,
      hasConflictingExplicitTimes: false,
      normalizedTime,
    });
  });

  it.each(["Wash 2 shirts", "Dry clean 4 jackets", "Express 2 jackets", "Tomorrow afternoon", "at 5"]) 
  ("does not interpret bare or vague values as a time: %s", (requestText) => {
    expect(extractExplicitPickupTime(requestText)).toEqual({
      hasExplicitTime: false,
      hasConflictingExplicitTimes: false,
      normalizedTime: null,
    });
  });

  it("leaves conflicting explicit times unresolved", () => {
    expect(extractExplicitPickupTime("Pickup tomorrow at 2 PM or 4 PM")).toEqual({
      hasExplicitTime: true,
      hasConflictingExplicitTimes: true,
      normalizedTime: null,
    });
  });
});
