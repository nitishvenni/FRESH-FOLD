import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    items: [
      {
        itemName: String,
        quantity: Number,
        price: Number,
        itemTotal: Number,
      },
    ],
    // Legacy orders used this flattened field. New orders persist the two
    // canonical fields below and never rewrite historical documents.
    service: String,
    cleaningService: {
      type: String,
      enum: ["wash", "dry"],
      default: null,
    },
    speed: {
      type: String,
      enum: ["standard", "express"],
      default: null,
    },
    pickupDate: { type: String, default: null },
    pickupSlot: { type: String, enum: ["9 AM - 12 PM", "12 PM - 3 PM", "3 PM - 6 PM"], default: null },
    paymentIntentId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentIntent", unique: true, sparse: true },
    // Optional for historical compatibility; new reconciled orders receive the
    // immutable address snapshot that was validated before checkout.
    addressSnapshot: {
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
    deliveryCharge: Number,
    totalAmount: Number,
    paymentId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    paymentOrderId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    paymentSignature: {
      type: String,
      // Client verification stores a checkout signature, but a verified
      // Razorpay webhook has no client signature. Reconciliation relies on
      // the verified provider event in that case, so this legacy field cannot
      // be required for every new canonical Order.
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "verified", "failed"],
      default: "paid",
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        "Scheduled",
        "Received at Facility",
        "Picked Up",
        "Washing",
        "Ironing",
        "Out for Delivery",
        "Delivered",
      ],
      default: "Scheduled",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
