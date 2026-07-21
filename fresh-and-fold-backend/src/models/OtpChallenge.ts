import mongoose from "mongoose";

const otpChallengeSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true, index: true },
    // Every new challenge is generated and verified by Fresh & Fold.
    otpHash: { type: String, default: null },
    provider: { type: String, enum: ["fast2sms", "demo", "local"], required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    resendAvailableAt: { type: Date, required: true },
    failedAttempts: { type: Number, required: true, default: 0 },
    consumedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("OtpChallenge", otpChallengeSchema);
