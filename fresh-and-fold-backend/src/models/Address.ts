import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: String,
    phone: String,
    street: String,
    city: String,
    pincode: String,
    houseNumber: String,
    building: String,
    locality: String,
    addressType: {
      type: String,
      enum: ["House", "Office", "Other"],
      default: "House",
    },
    instructions: String,
    latitude: Number,
    longitude: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Address", addressSchema);
