import { describe, expect, it } from "vitest";
import { addCalendarDays, getBusinessTodayIsoDate, isBookablePickupDate, isCanonicalBusinessDate, isCanonicalPickupSlot } from "../../src/booking/schedule";
describe("canonical booking schedule", () => {
  const now = new Date("2026-07-21T18:45:00.000Z");
  it("keeps Asia/Kolkata business dates date-only and validates the four-day window", () => { const today=getBusinessTodayIsoDate(now); expect(today).toBe("2026-07-22"); expect(isBookablePickupDate(today,now)).toBe(true); expect(isBookablePickupDate(addCalendarDays(today,3),now)).toBe(true); expect(isBookablePickupDate(addCalendarDays(today,4),now)).toBe(false); });
  it("rejects malformed and impossible dates", () => { expect(isCanonicalBusinessDate("2026-02-29")).toBe(false); expect(isCanonicalBusinessDate("2026/07/22")).toBe(false); });
  it("accepts only canonical slots", () => { for(const slot of ["9 AM - 12 PM","12 PM - 3 PM","3 PM - 6 PM"]) expect(isCanonicalPickupSlot(slot)).toBe(true); expect(isCanonicalPickupSlot("2 PM")).toBe(false); });
});
