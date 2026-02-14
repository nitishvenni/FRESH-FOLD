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
  },
  { timestamps: true }
);

export default mongoose.model("Address", addressSchema);
