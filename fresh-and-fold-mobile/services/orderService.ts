import api from "./api";

export type OrderRecord = {
  _id: string;
  status: string;
  totalAmount?: number;
  createdAt?: string;
  cleaningService?: "wash" | "dry";
  speed?: "standard" | "express";
  service?: string;
  items?: OrderItemPayload[];
  addressId?:
    | string
    | {
        _id: string;
        fullName?: string;
        street?: string;
        city?: string;
        pincode?: string;
      };
};

export type OrderItemPayload = {
  itemName: string;
  quantity: number;
};

export type OrdersResponse = {
  success: boolean;
  orders: OrderRecord[];
};

export type OrderPreviewResponse = {
  success: boolean;
  totalAmount: number;
  deliveryCharge: number;
};

export type CreateOrderResponse = {
  success: boolean;
  order: { _id: string; totalAmount: number; status?: string };
};

export const getOrders = async () => {
  const res = await api.get<OrdersResponse>("/orders");
  return res.orders || [];
};

export const getOrderPreview = async (payload: {
  items: OrderItemPayload[];
  cleaningService: "wash" | "dry";
  speed: "standard" | "express";
}) => {
  return api.post<OrderPreviewResponse>("/orders/preview", payload);
};

export const createOrder = async (payload: {
  addressId: string | string[] | undefined;
  items: OrderItemPayload[];
  cleaningService: "wash" | "dry";
  speed: "standard" | "express";
  paymentVerificationToken: string;
}) => {
  return api.post<CreateOrderResponse>("/orders", payload);
};
