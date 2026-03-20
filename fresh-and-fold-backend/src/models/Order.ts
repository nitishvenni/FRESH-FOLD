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
    service: String,
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
      required: true,
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
