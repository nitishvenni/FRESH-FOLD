import api from "./api";

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
  message?: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  verified: boolean;
  mock?: boolean;
  paymentVerificationToken: string;
  message?: string;
};

export const reportPaymentFailure = async (payload: {
  addressId: string | string[] | undefined;
  items: Array<{ itemName: string; quantity: number }>;
  service: string | string[] | undefined;
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
  service: string | string[] | undefined;
}) => {
  return api.post<CreatePaymentOrderResponse>("/payments/create-order", payload);
};

export const verifyPayment = async (payload: {
  addressId: string | string[] | undefined;
  items: Array<{ itemName: string; quantity: number }>;
  service: string | string[] | undefined;
  payment: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };
}) => {
  return api.post<VerifyPaymentResponse>("/payment/verify", payload);
};
