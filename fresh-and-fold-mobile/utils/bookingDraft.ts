import AsyncStorage from "@react-native-async-storage/async-storage";
import { isItemKey, type ItemKey } from "./bookingData";
import { getBookingDateOptions, isPickupSlot, type PickupSlot } from "./bookingSchedule";
import { isCleaningService, isFulfillmentSpeed, type CleaningService, type FulfillmentSpeed } from "./pricing";

export const BOOKING_DRAFT_STORAGE_KEY = "bookingDraftV1";
export const BOOKING_DRAFT_VERSION = 1;
export const BOOKING_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

export type BookingDraftStep = "select_service" | "schedule_basic" | "select_address" | "order_summary";
export type BookingDraft = {
  version: typeof BOOKING_DRAFT_VERSION;
  createdAt: number;
  updatedAt: number;
  items: Partial<Record<ItemKey, number>>;
  cleaningService?: CleaningService;
  speed?: FulfillmentSpeed;
  pickupDate?: string;
  pickupSlot?: PickupSlot;
  addressId?: string;
  lastStep: BookingDraftStep;
};

export type BookingDraftInput = Omit<BookingDraft, "version" | "createdAt" | "updatedAt">;
export type BookingDraftResumeTarget = {
  pathname: "/select-service" | "/schedule-basic" | "/select-address" | "/order-summary";
  params: Record<string, string>;
};

type DraftValidationOptions = { now?: number; validAddressIds?: readonly string[] };

const DRAFT_STEPS: readonly BookingDraftStep[] = ["select_service", "schedule_basic", "select_address", "order_summary"];
const MAX_DRAFT_AGE_MS = BOOKING_DRAFT_TTL_MS;

const firstRouteValue = (value: unknown) => Array.isArray(value) ? value[0] : value;

const normalizeItems = (value: unknown): Partial<Record<ItemKey, number>> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const items: Partial<Record<ItemKey, number>> = {};
  for (const [key, quantity] of Object.entries(value)) {
    if (!isItemKey(key)) continue;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) continue;
    items[key] = quantity;
  }
  return Object.keys(items).length > 0 ? items : null;
};

export const normalizeBookingDraftPickupDate = (value: unknown): string | undefined => {
  const candidate = firstRouteValue(value);
  if (typeof candidate !== "string") return undefined;
  const option = getBookingDateOptions().find((date) => date.isoDate === candidate || date.value === candidate);
  return option?.isoDate;
};

const routeDateForDraft = (pickupDate: string) =>
  getBookingDateOptions().find((date) => date.isoDate === pickupDate)?.value;

const hasValidAddressId = (value: unknown, validAddressIds: readonly string[]) =>
  typeof value === "string" && validAddressIds.includes(value);

/** Parses only the bounded, canonical local draft format. Invalid lower-step data is dropped safely. */
export const normalizeBookingDraft = (value: unknown, options: DraftValidationOptions = {}): BookingDraft | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const allowedKeys = new Set(["version", "createdAt", "updatedAt", "items", "cleaningService", "speed", "pickupDate", "pickupSlot", "addressId", "lastStep"]);
  if (Object.keys(raw).some((key) => !allowedKeys.has(key))) return null;
  if (raw.version !== BOOKING_DRAFT_VERSION || !Number.isFinite(raw.createdAt) || !Number.isFinite(raw.updatedAt)) return null;
  const now = options.now ?? Date.now();
  if ((raw.updatedAt as number) + MAX_DRAFT_AGE_MS <= now || (raw.updatedAt as number) > now + 5 * 60 * 1000) return null;
  const items = normalizeItems(raw.items);
  if (!items || !DRAFT_STEPS.includes(raw.lastStep as BookingDraftStep)) return null;

  const cleaningService = isCleaningService(raw.cleaningService) ? raw.cleaningService : undefined;
  const speed = isFulfillmentSpeed(raw.speed) ? raw.speed : undefined;
  const pickupDate = normalizeBookingDraftPickupDate(raw.pickupDate);
  const pickupSlot = isPickupSlot(raw.pickupSlot) ? raw.pickupSlot : undefined;
  const hasCompleteSchedule = Boolean(cleaningService && speed && pickupDate && pickupSlot);
  const addressId = hasCompleteSchedule && hasValidAddressId(raw.addressId, options.validAddressIds ?? [])
    ? raw.addressId as string
    : undefined;

  return {
    version: BOOKING_DRAFT_VERSION,
    createdAt: raw.createdAt as number,
    updatedAt: raw.updatedAt as number,
    items,
    ...(cleaningService ? { cleaningService } : {}),
    ...(speed ? { speed } : {}),
    ...(hasCompleteSchedule ? { pickupDate, pickupSlot } : {}),
    ...(addressId ? { addressId } : {}),
    lastStep: raw.lastStep as BookingDraftStep,
  };
};

export const loadBookingDraft = async (validAddressIds: readonly string[] = []): Promise<BookingDraft | null> => {
  try {
    const stored = await AsyncStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!stored) return null;
    const draft = normalizeBookingDraft(JSON.parse(stored), { validAddressIds });
    if (draft) return draft;
  } catch {
    // Corrupt local storage is discarded below; it must never block a booking.
  }
  await AsyncStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY).catch(() => undefined);
  return null;
};

export const clearBookingDraft = async (): Promise<void> => {
  await AsyncStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY).catch(() => undefined);
};

/** Saves only reviewed, canonical booking selections. It deliberately never receives payment or AI payload data. */
export const saveBookingDraft = async (input: BookingDraftInput, validAddressIds: readonly string[] = []): Promise<BookingDraft | null> => {
  const now = Date.now();
  const previous = await loadBookingDraft(validAddressIds);
  const draft = normalizeBookingDraft({
    version: BOOKING_DRAFT_VERSION,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    ...input,
  }, { now, validAddressIds });
  if (!draft) {
    await clearBookingDraft();
    return null;
  }
  await AsyncStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch(() => undefined);
  return draft;
};

/** Resolves from validated state, never from the stored lastStep alone and never into payment. */
export const getBookingDraftResumeTarget = (draft: BookingDraft): BookingDraftResumeTarget => {
  const items = JSON.stringify(draft.items);
  if (!draft.cleaningService || !draft.speed) {
    return { pathname: "/select-service", params: { resumeDraft: "1" } };
  }
  const base = { cleaningService: draft.cleaningService, speed: draft.speed, items };
  if (!draft.pickupDate || !draft.pickupSlot) {
    return { pathname: "/schedule-basic", params: base };
  }
  const date = routeDateForDraft(draft.pickupDate);
  if (!date) return { pathname: "/schedule-basic", params: base };
  const scheduled = { ...base, date, slot: draft.pickupSlot };
  if (!draft.addressId) {
    return { pathname: "/select-address", params: scheduled };
  }
  return { pathname: "/order-summary", params: { ...scheduled, addressId: draft.addressId } };
};
