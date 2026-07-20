import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: storage }));

import {
  BOOKING_DRAFT_STORAGE_KEY,
  BOOKING_DRAFT_TTL_MS,
  clearBookingDraft,
  getBookingDraftResumeTarget,
  loadBookingDraft,
  normalizeBookingDraft,
} from "./bookingDraft";
import { getBusinessTodayIsoDate } from "./bookingSchedule";

const now = new Date().getTime();
const base = {
  version: 1,
  createdAt: now - 100,
  updatedAt: now - 50,
  items: { shirt: 2 },
  cleaningService: "dry",
  speed: "express",
  pickupDate: getBusinessTodayIsoDate(),
  pickupSlot: "9 AM - 12 PM",
  lastStep: "order_summary",
};

describe("canonical booking draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.removeItem.mockResolvedValue(undefined);
    storage.setItem.mockResolvedValue(undefined);
  });

  it("resumes each incomplete booking at the earliest safe step", () => {
    const itemsOnly = normalizeBookingDraft({ ...base, cleaningService: undefined, speed: undefined });
    const serviceOnly = normalizeBookingDraft({ ...base, pickupDate: undefined, pickupSlot: undefined });
    const scheduled = normalizeBookingDraft({ ...base });
    const complete = normalizeBookingDraft({ ...base, addressId: "address-1" }, { validAddressIds: ["address-1"] });

    expect(itemsOnly && getBookingDraftResumeTarget(itemsOnly).pathname).toBe("/select-service");
    expect(serviceOnly && getBookingDraftResumeTarget(serviceOnly).pathname).toBe("/schedule-basic");
    expect(scheduled && getBookingDraftResumeTarget(scheduled).pathname).toBe("/select-address");
    expect(complete && getBookingDraftResumeTarget(complete).pathname).toBe("/order-summary");
  });

  it("drops invalid catalog entries and invalid quantities without trusting them", () => {
    const draft = normalizeBookingDraft({ ...base, items: { shirt: 2, unknown: 1, jeans: 0, jacket: 1.5 } });
    expect(draft?.items).toEqual({ shirt: 2 });
    expect(normalizeBookingDraft({ ...base, items: { unknown: 1 } })).toBeNull();
  });

  it("requires current scheduler values and a locally validated address before summary", () => {
    const staleSchedule = normalizeBookingDraft({ ...base, pickupDate: "2000-01-01" });
    const unvalidatedAddress = normalizeBookingDraft({ ...base, addressId: "address-1" });
    expect(staleSchedule && getBookingDraftResumeTarget(staleSchedule).pathname).toBe("/schedule-basic");
    expect(unvalidatedAddress && getBookingDraftResumeTarget(unvalidatedAddress).pathname).toBe("/select-address");
  });

  it("clears expired and corrupt drafts instead of resuming them", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ ...base, updatedAt: now - BOOKING_DRAFT_TTL_MS - 1 }));
    await expect(loadBookingDraft()).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(BOOKING_DRAFT_STORAGE_KEY);

    storage.getItem.mockResolvedValue("not-json");
    await expect(loadBookingDraft()).resolves.toBeNull();
  });

  it("never includes payment, AI, or customer-content fields in a valid draft", () => {
    expect(normalizeBookingDraft({ ...base, paymentToken: "secret" })).toBeNull();
    expect(normalizeBookingDraft({ ...base, requestText: "Wash two shirts" })).toBeNull();
    expect(normalizeBookingDraft({ ...base, aiResponse: { private: true } })).toBeNull();
  });

  it("clears only the local canonical draft after a successful order completion", async () => {
    await clearBookingDraft();
    expect(storage.removeItem).toHaveBeenCalledWith(BOOKING_DRAFT_STORAGE_KEY);
  });
});
