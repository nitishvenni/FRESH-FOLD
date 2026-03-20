import mongoose from "mongoose";

const supportInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    response: {
      type: String,
      default: null,
      trim: true,
    },
    intent: {
      type: String,
      default: "unknown",
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    aiOutcome: {
      type: String,
      enum: ["ai_handled", "escalated"],
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SupportInteraction", supportInteractionSchema);
