declare module "razorpay" {
  type RazorpayConfig = {
    key_id: string;
    key_secret: string;
  };

  type RazorpayCreateOrderPayload = {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  };

  type RazorpayOrder = {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status?: string;
    notes?: Record<string, string>;
  };

  class Razorpay {
    constructor(config: RazorpayConfig);
    orders: {
      create(payload: RazorpayCreateOrderPayload): Promise<RazorpayOrder>;
      fetch(orderId: string): Promise<RazorpayOrder>;
    };
  }

  export default Razorpay;
}
