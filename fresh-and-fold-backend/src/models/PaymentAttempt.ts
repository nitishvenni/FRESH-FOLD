import mongoose from "mongoose";

const paymentAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      default: null,
    },
    service: {
      type: String,
      default: "",
    },
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
    items: [
      {
        itemName: String,
        quantity: Number,
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    paymentOrderId: {
      type: String,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["failed"],
      default: "failed",
    },
    reason: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentAttempt", paymentAttemptSchema);
