import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const PENDING_PAYMENT_INTENT_STORAGE_KEY = "pendingPaymentIntentV1";

export type CreatePaymentOrderResponse = {
  success: boolean;
  keyId: string;
  mock?: boolean;
  paymentOrder: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  pricing: {
    totalAmount: number;
  };
  paymentIntentId: string;
  message?: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  verified: boolean;
  mock?: boolean;
  paymentIntentId: string;
  status: "payment_pending" | "reconciliation_pending" | "reconciled";
  order: { _id: string; totalAmount: number; status?: string; pickupDate?: string; pickupSlot?: string } | null;
  // Retained only for the temporary backend compatibility route; new mobile
  // code reconciles directly through the PaymentIntent response.
  paymentVerificationToken?: string;
  message?: string;
};

export type PaymentIntentStatusResponse = {
  success: boolean;
  paymentIntentId: string;
  status: "created" | "provider_order_created" | "payment_confirmed" | "reconciliation_pending" | "reconciled";
  order: { _id: string; totalAmount: number; status?: string; pickupDate?: string; pickupSlot?: string } | null;
};

export const reportPaymentFailure = async (payload: {
  addressId: string | string[] | undefined;
  items: Array<{ itemName: string; quantity: number }>;
  cleaningService: "wash" | "dry";
  speed: "standard" | "express";
  paymentOrderId?: string;
  paymentId?: string;
  totalAmount?: number;
  reason: string;
  metadata?: Record<string, unknown>;
}) => {
  return api.post<{ success: boolean }>("/payment/failure", payload);
};

export const createPaymentOrder = async (payload: {
  addressId: string | string[] | undefined;
  items: Array<{ itemName: string; quantity: number }>;
  cleaningService: "wash" | "dry";
  speed: "standard" | "express";
  pickupDate: string;
  pickupSlot: "9 AM - 12 PM" | "12 PM - 3 PM" | "3 PM - 6 PM";
}) => {
  return api.post<CreatePaymentOrderResponse>("/payments/create-order", payload);
};

export const verifyPayment = async (payload: {
  paymentIntentId: string;
  payment: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };
}) => {
  return api.post<VerifyPaymentResponse>("/payment/verify", payload);
};

export const getPaymentIntent = async (paymentIntentId: string) =>
  api.get<PaymentIntentStatusResponse>(`/payments/intents/${encodeURIComponent(paymentIntentId)}`);

export const savePendingPaymentIntentId = async (paymentIntentId: string) => {
  await AsyncStorage.setItem(PENDING_PAYMENT_INTENT_STORAGE_KEY, paymentIntentId);
};

export const getPendingPaymentIntentId = async () =>
  String((await AsyncStorage.getItem(PENDING_PAYMENT_INTENT_STORAGE_KEY)) || "").trim() || null;

export const clearPendingPaymentIntentId = async () => {
  await AsyncStorage.removeItem(PENDING_PAYMENT_INTENT_STORAGE_KEY);
};
