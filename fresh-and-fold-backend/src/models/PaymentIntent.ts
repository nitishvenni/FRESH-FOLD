import mongoose from "mongoose";

const pricedItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    itemTotal: { type: Number, required: true },
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    houseNumber: String,
    building: String,
    street: String,
    locality: String,
    city: String,
    pincode: String,
    addressType: String,
    instructions: String,
  },
  { _id: false }
);

const paymentIntentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    // This snapshot is the frozen fulfilment address. It lets a captured payment
    // reconcile even if the mutable address record changes after checkout starts.
    addressSnapshot: { type: addressSnapshotSchema, required: true },
    items: { type: [pricedItemSchema], required: true },
    cleaningService: { type: String, enum: ["wash", "dry"], required: true },
    speed: { type: String, enum: ["standard", "express"], required: true },
    pickupDate: { type: String, required: true },
    pickupSlot: { type: String, enum: ["9 AM - 12 PM", "12 PM - 3 PM", "3 PM - 6 PM"], required: true },
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, required: true, default: "INR" },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    receipt: { type: String, default: null },
    status: {
      type: String,
      enum: ["created", "provider_order_created", "payment_confirmed", "reconciliation_pending", "reconciled"],
      default: "created",
      required: true,
    },
    paymentConfirmedAt: { type: Date, default: null },
    reconciledAt: { type: Date, default: null },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", unique: true, sparse: true },
    reconciliationFailureCode: { type: String, default: null },
  },
  { timestamps: true }
);

paymentIntentSchema.index({ userId: 1, createdAt: -1 });

export type PaymentIntentStatus = "created" | "provider_order_created" | "payment_confirmed" | "reconciliation_pending" | "reconciled";
export default mongoose.model("PaymentIntent", paymentIntentSchema);
