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
      },
    ],
    totalAmount: Number,
   status: {
  type: String,
  enum: [
    "Scheduled",
    "Picked Up",
    "Washing",
    "Out for Delivery",
    "Delivered",
  ],
  default: "Scheduled",
},
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
