import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
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
    userMessage: {
      type: String,
      required: true,
      trim: true,
    },
    aiReply: {
      type: String,
      default: null,
      trim: true,
    },
    aiOutcome: {
      type: String,
      enum: ["ai_handled", "escalated"],
      default: "escalated",
    },
    reason: {
      type: String,
      default: "Manual escalation requested",
    },
    intent: {
      type: String,
      default: "unknown",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    statusHistory: [
      {
        fromStatus: {
          type: String,
          default: null,
        },
        toStatus: {
          type: String,
          required: true,
        },
        changedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
        changedBy: {
          type: String,
          required: true,
          default: "system",
        },
      },
    ],
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    responseDueAt: {
      type: Date,
      required: true,
    },
    resolutionDueAt: {
      type: Date,
      required: true,
    },
    responseTimeMinutes: {
      type: Number,
      default: null,
    },
    resolutionTimeMinutes: {
      type: Number,
      default: null,
    },
    messages: {
      type: [supportMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);
