import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import crypto from "crypto";
import Admin from "./models/Admin";
import http from "http";
import { Server } from "socket.io";
import Razorpay from "razorpay";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "./models/User";
import Order from "./models/Order";
import Address from "./models/Address";
import SupportTicket from "./models/SupportTicket";
import SupportInteraction from "./models/SupportInteraction";
import PaymentAttempt from "./models/PaymentAttempt";
import PaymentIntent from "./models/PaymentIntent";
import OtpChallenge from "./models/OtpChallenge";
import { authMiddleware, AuthRequest } from "./middleware/authMiddleware";
import { createRateLimit } from "./middleware/rateLimit";
import { createOtpHash, createOtpRateLimit, createSecureOtp, normalizeIndianMobile, secureOtpMatch } from "./auth/otp";
import { getOtpDemoConfiguration, selectOtpDeliveryMode } from "./auth/otpDemo";
import { getFast2SmsConfiguration, OtpDeliveryError, sendOtpSms } from "./auth/otpDelivery";
import { registerGarmentRecognitionRoutes } from "./ai/garmentRecognition";
import { registerFabricIdentificationRoutes } from "./ai/fabricIdentification";
import { registerStainDetectionRoutes } from "./ai/stainDetection";
import { registerCareLabelReaderRoutes } from "./ai/careLabelReader";
import { registerNaturalLanguageBookingRoutes } from "./ai/naturalLanguageBooking";
import { createAiRouter, createConfiguredAiEventRateLimit, createConfiguredAiRateLimit } from "./ai/router";
import { aggregateAiInteractions, registerAiInteractionEventRoutes } from "./ai/interactionAnalytics";
import { logAiDiagnostic } from "./ai/diagnostics";
import { sendPushNotification } from "./utils/pushNotifications";
import { createAdminLoginHandler, createAdminMiddleware } from "./admin/auth";
import { isBookablePickupDate, isCanonicalPickupSlot } from "./booking/schedule";
import { ORDER_STATUSES, canTransitionOrderStatus, isOrderStatus, nextOrderStatus } from "./booking/orderStatus";
import { reconcilePaymentIntent } from "./payment/reconciliation";
import { getCapturedPaymentFromWebhook, isValidRazorpayWebhookSignature } from "./payment/webhook";
import {
  ADMINS_ROOM,
  createSocketAuthenticationMiddleware,
  emitOrderStatusUpdate,
  emitTicketCreated as emitSocketTicketCreated,
  emitTicketMessage,
  emitTicketUpdated,
  getSocketCorsOrigins,
  isSocketOriginAllowed,
  registerSocketAuthorization,
} from "./realtime/socketSecurity";
import {
  calculateOrderTotals,
} from "./booking/pricing";
import {
  buildControlledSupportReply,
  buildSystemPrompt,
  detectEscalation,
  detectSupportIntentWithConfidence,
} from "./support/promptControl";
import {
  JSON_BODY_LIMIT,
  createConfiguredGlobalRateLimit,
  createHelmetMiddleware,
  createHttpCorsMiddleware,
  createNotFoundHandler,
  createSafeGlobalErrorHandler,
  getTrustProxyHops,
} from "./security/http";
import { validateProductionEnvironment } from "./security/config";

const DELIVERY_CHARGE = 25;
const FREE_DELIVERY_THRESHOLD = 299;
const CURRENCY = "INR";

const MOCK_PAYMENTS = String(process.env.MOCK_PAYMENTS || "").toLowerCase() === "true";
const mongoUri = String(process.env.MONGO_URI || "").trim();
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpayWebhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
const fast2SmsConfiguration = getFast2SmsConfiguration();
const fast2SmsOtpEnabled = Boolean(fast2SmsConfiguration);
const otpDemoConfiguration = getOtpDemoConfiguration();
const otpExpirySeconds = Math.max(60, Number(process.env.OTP_EXPIRY_SECONDS) || 300);
const otpResendCooldownSeconds = Math.max(30, Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60);
const otpMaxVerifyAttempts = Math.max(3, Number(process.env.OTP_MAX_VERIFY_ATTEMPTS) || 5);
const localDevOtpCode = String(process.env.OTP_LOCAL_DEV_CODE || "").trim();
const localDevOtpEnabled = process.env.NODE_ENV !== "production" && String(process.env.OTP_LOCAL_DEV_MODE || "").toLowerCase() === "true" && /^\d{6}$/.test(localDevOtpCode);
const razorpayClient =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      })
    : null;

const supportQueryLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  namespace: "support-query",
});
const adminPasswordResetLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  namespace: "admin-password-reset",
});
const adminLoginLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  namespace: "admin-login",
  error: {
    code: "ADMIN_LOGIN_RATE_LIMITED",
    message: "Too many login attempts. Please try again later.",
  },
});
const sendOtpIpLimiter = createOtpRateLimit({ namespace: "otp-send-ip", key: "ip", max: 10, windowMs: 15 * 60 * 1000 });
const sendOtpMobileLimiter = createOtpRateLimit({ namespace: "otp-send-mobile", key: "mobile", max: 3, windowMs: 15 * 60 * 1000 });
const verifyOtpIpLimiter = createOtpRateLimit({ namespace: "otp-verify-ip", key: "ip", max: 20, windowMs: 15 * 60 * 1000 });
const verifyOtpMobileLimiter = createOtpRateLimit({ namespace: "otp-verify-mobile", key: "mobile", max: 10, windowMs: 15 * 60 * 1000 });

const supportEscalateLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  namespace: "support-escalate",
});

const SUPPORT_CONFIDENCE_THRESHOLD = 0.7;
const RESPONSE_SLA_MINUTES = 15;
const RESOLUTION_SLA_MINUTES = 240;

validateProductionEnvironment();

const app = express();
// Render terminates TLS at one reverse-proxy hop. This bounded setting lets
// req.ip drive rate limits without trusting an arbitrary forwarded chain.
app.set("trust proxy", getTrustProxyHops());
const server = http.createServer(app);
const socketCorsOrigins = getSocketCorsOrigins();

const io = new Server(server, {
  cors: {
    origin: (origin, callback) =>
      callback(null, isSocketOriginAllowed(origin, socketCorsOrigins, process.env.NODE_ENV === "production")),
  },
  allowRequest: (request, callback) =>
    callback(null, isSocketOriginAllowed(request.headers.origin, socketCorsOrigins, process.env.NODE_ENV === "production")),
});

app.set("io", io);

io.use(createSocketAuthenticationMiddleware(String(process.env.JWT_SECRET || "")));
registerSocketAuthorization(io, {
  findTicketById: async (ticketId) => SupportTicket.findById(ticketId).select("userId").lean(),
});

let lastOverdueCount = -1;
const emitOverdueTicketAlert = async () => {
  const now = new Date();
  const overdueCount = await SupportTicket.countDocuments({
    status: { $ne: "resolved" },
    $or: [{ responseDueAt: { $lt: now } }, { resolutionDueAt: { $lt: now } }],
  });

  if (overdueCount !== lastOverdueCount) {
    lastOverdueCount = overdueCount;
    io.to(ADMINS_ROOM).emit("ticketOverdueAlert", {
      overdueCount,
      checkedAt: now.toISOString(),
    });
  }
};


app.use(createHelmetMiddleware());
app.use(createHttpCorsMiddleware());

// Razorpay signs the exact raw bytes, so this route must remain before every
// JSON parser. Helmet/CORS do not read or transform req.body.
app.post("/payments/webhook/razorpay", express.raw({ type: "application/json" }), handleRazorpayWebhook);

// This broad limiter excludes the webhook by placement and complements (never
// replaces) the independent OTP, Admin-login, and AI capability limiters.
app.use(createConfiguredGlobalRateLimit());
app.use(
  "/ai",
  createAiRouter({
    rateLimit: createConfiguredAiRateLimit(),
    eventRateLimit: createConfiguredAiEventRateLimit(),
    registerRoutes: (router) => {
      registerGarmentRecognitionRoutes(router);
      registerFabricIdentificationRoutes(router);
      registerStainDetectionRoutes(router);
      registerCareLabelReaderRoutes(router);
      registerNaturalLanguageBookingRoutes(router);
      registerAiInteractionEventRoutes(router);
    },
  })
);

// AI text routes parse after their request ID/auth/rate-limit middleware so a
// malformed AI JSON body still receives the standard AI error contract.
app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({ status: databaseConnected ? "ok" : "unavailable" });
});

const getNextOrderStep = (status: string): string | null => {
  return isOrderStatus(status) ? nextOrderStatus(status) : null;
};

const getSupportRelevantOrder = async (userId: string | undefined) => {
  if (!userId) {
    return null;
  }

  const activeOrder = await Order.findOne({
    userId,
    status: { $ne: "Delivered" },
  }).sort({ createdAt: -1 });

  if (activeOrder) {
    return activeOrder;
  }

  return Order.findOne({ userId }).sort({ createdAt: -1 });
};

const generatePaymentReceipt = () => `ff_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

const buildExpectedRazorpaySignature = (orderId: string, paymentId: string) =>
  crypto.createHmac("sha256", razorpayKeySecret as string).update(`${orderId}|${paymentId}`).digest("hex");

const secureHexCompare = (a: string, b: string) => {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const generateMockPaymentId = () => `pay_mock_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
const generateMockOrderId = () => `order_mock_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

type TicketStatus = "open" | "in_progress" | "resolved";
type TicketMessageSender = "user" | "admin" | "ai";

const AI_ESCALATION_MESSAGE = "I am escalating this to our support team.";
const ticketStatusLabel = (status: TicketStatus): "Open" | "In Progress" | "Resolved" => {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
  }
};

const normalizeTicketStatus = (rawStatus: string): TicketStatus | null => {
  const value = rawStatus.trim().toLowerCase();

  if (value === "open") return "open";
  if (value === "in progress" || value === "in_progress") return "in_progress";
  if (value === "resolved") return "resolved";
  return null;
};

const toMinutes = (from: Date, to: Date) =>
  Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));

const getTicketCreatedAtDate = (ticket: any) => {
  const createdAt = ticket?.createdAt ? new Date(ticket.createdAt) : new Date();
  return Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
};

const getFallbackResponseDueAt = (ticket: any) =>
  new Date(getTicketCreatedAtDate(ticket).getTime() + RESPONSE_SLA_MINUTES * 60000);

const getFallbackResolutionDueAt = (ticket: any) =>
  new Date(getTicketCreatedAtDate(ticket).getTime() + RESOLUTION_SLA_MINUTES * 60000);

const normalizeTicketDocument = (ticket: any) => {
  if (!ticket) return ticket;
  if (!ticket.responseDueAt) {
    ticket.responseDueAt = getFallbackResponseDueAt(ticket);
  }
  if (!ticket.resolutionDueAt) {
    ticket.resolutionDueAt = getFallbackResolutionDueAt(ticket);
  }
  if (!Array.isArray(ticket.messages)) {
    ticket.messages = [];
  }
  if (!Array.isArray(ticket.statusHistory)) {
    ticket.statusHistory = [];
  }
  if (!ticket.userMessage && ticket.message) {
    ticket.userMessage = ticket.message;
  }
  return ticket;
};

const serializeTicketMessage = (message: any) => ({
  sender: String(message.sender || "ai") as TicketMessageSender,
  text: String(message.text || ""),
  createdAt: message.createdAt || new Date(),
});

const getTicketSla = (ticket: any) => {
  const responseDueAt = ticket?.responseDueAt ? new Date(ticket.responseDueAt) : getFallbackResponseDueAt(ticket);
  const resolutionDueAt = ticket?.resolutionDueAt
    ? new Date(ticket.resolutionDueAt)
    : getFallbackResolutionDueAt(ticket);
  const now = new Date();
  const responseOverdue = !ticket.firstResponseAt && now > responseDueAt;
  const resolutionOverdue = ticket.status !== "resolved" && now > resolutionDueAt;
  return {
    responseDueAt,
    resolutionDueAt,
    firstResponseAt: ticket.firstResponseAt || null,
    resolvedAt: ticket.resolvedAt || null,
    responseTimeMinutes: ticket.responseTimeMinutes ?? null,
    resolutionTimeMinutes: ticket.resolutionTimeMinutes ?? null,
    overdue: responseOverdue || resolutionOverdue,
    overdueType: responseOverdue ? "response" : resolutionOverdue ? "resolution" : null,
  };
};

const serializeTicket = (ticket: any) => ({
  id: ticket._id,
  userId: ticket.userId,
  mobile: ticket.mobile,
  orderId: ticket.orderId,
  message: ticket.message,
  userMessage: ticket.userMessage,
  aiReply: ticket.aiReply || null,
  aiOutcome: ticket.aiOutcome,
  reason: ticket.reason,
  intent: ticket.intent,
  status: ticketStatusLabel(ticket.status as TicketStatus),
  confidenceScore: ticket.confidenceScore ?? null,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  sla: getTicketSla(ticket),
  messages: Array.isArray(ticket.messages)
    ? ticket.messages.map((message: any) => serializeTicketMessage(message))
    : [],
  statusHistory: Array.isArray(ticket.statusHistory)
    ? ticket.statusHistory.map((entry: any) => ({
        fromStatus: entry.fromStatus ? ticketStatusLabel(entry.fromStatus as TicketStatus) : null,
        toStatus: ticketStatusLabel(entry.toStatus as TicketStatus),
        changedAt: entry.changedAt,
        changedBy: entry.changedBy,
      }))
    : [],
});

const emitTicketCreated = (ticket: any) => {
  emitSocketTicketCreated(io, ticket);
  void emitOverdueTicketAlert();
};

const upsertEscalatedTicket = async (params: {
  userId: string;
  mobile: string;
  message: string;
  aiReply: string;
  reason: string;
  intent: string;
  confidenceScore: number;
  orderId: any;
  changedBy: "ai" | "system";
  forceNew?: boolean;
}) => {
  const now = new Date();
  const existingTicket = params.forceNew
    ? null
    : await SupportTicket.findOne({
        userId: params.userId,
        status: { $ne: "resolved" },
      }).sort({ updatedAt: -1 });

  if (existingTicket) {
    normalizeTicketDocument(existingTicket);
    existingTicket.message = params.message;
    existingTicket.userMessage = params.message;
    existingTicket.aiReply = params.aiReply;
    existingTicket.aiOutcome = "escalated";
    existingTicket.reason = params.reason;
    existingTicket.intent = params.intent;
    existingTicket.confidenceScore = params.confidenceScore;
    existingTicket.orderId = params.orderId || null;
    existingTicket.messages.push(
      {
        sender: "user",
        text: params.message,
        createdAt: now,
      } as any,
      {
        sender: "ai",
        text: AI_ESCALATION_MESSAGE,
        createdAt: now,
      } as any
    );
    await existingTicket.save();
    emitTicketUpdated(io, existingTicket);
    void emitOverdueTicketAlert();
    return {
      ticket: existingTicket,
      created: false,
    };
  }

  const ticket = await SupportTicket.create({
    userId: params.userId,
    mobile: params.mobile,
    message: params.message,
    userMessage: params.message,
    aiReply: params.aiReply,
    aiOutcome: "escalated",
    reason: params.reason,
    intent: params.intent,
    confidenceScore: params.confidenceScore,
    orderId: params.orderId || null,
    status: "open",
    responseDueAt: new Date(now.getTime() + RESPONSE_SLA_MINUTES * 60000),
    resolutionDueAt: new Date(now.getTime() + RESOLUTION_SLA_MINUTES * 60000),
    messages: [
      {
        sender: "user",
        text: params.message,
        createdAt: now,
      },
      {
        sender: "ai",
        text: AI_ESCALATION_MESSAGE,
        createdAt: now,
      },
    ],
    statusHistory: [
      {
        fromStatus: null,
        toStatus: "open",
        changedAt: now,
        changedBy: params.changedBy,
      },
    ],
  });

  emitTicketCreated(ticket);

  return {
    ticket,
    created: true,
  };
};

app.post("/auth/send-otp", sendOtpIpLimiter, sendOtpMobileLimiter, async (req, res) => {
  try {
    const mobile = normalizeIndianMobile(req.body?.mobile);
    if (!mobile) return res.status(400).json({ message: "Invalid mobile number" });
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: "Database unavailable" });
    const deliveryMode = selectOtpDeliveryMode(mobile, otpDemoConfiguration, fast2SmsOtpEnabled, localDevOtpEnabled);
    if (!deliveryMode) {
      return res.status(503).json({ code: "OTP_UNAVAILABLE", message: "Verification is temporarily unavailable" });
    }

    const now = new Date();
    const otp = deliveryMode === "demo" ? otpDemoConfiguration!.code :
      (localDevOtpEnabled && /^\d{6}$/.test(localDevOtpCode) ? localDevOtpCode : createSecureOtp());
    const provider = deliveryMode;
    const expiresAt = new Date(now.getTime() + otpExpirySeconds * 1000);
    const resendAvailableAt = new Date(now.getTime() + otpResendCooldownSeconds * 1000);
    let challenge: any;
    try {
      challenge = await OtpChallenge.findOneAndUpdate(
        { mobile, $or: [{ resendAvailableAt: { $lte: now } }, { resendAvailableAt: { $exists: false } }] },
        { $set: { provider, otpHash: createOtpHash(mobile, otp, String(process.env.JWT_SECRET || "")), expiresAt, resendAvailableAt, failedAttempts: 0, consumedAt: null, lockedAt: null } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } catch (error: any) {
      if (error?.code === 11000) return res.status(429).json({ code: "OTP_RESEND_COOLDOWN", message: "Please wait before requesting another code.", retryAfterSeconds: otpResendCooldownSeconds });
      throw error;
    }

    try {
      if (provider === "fast2sms" && fast2SmsConfiguration) {
        await sendOtpSms({ mobile, otp, expirySeconds: otpExpirySeconds, configuration: fast2SmsConfiguration });
      }
      else if (process.env.NODE_ENV === "development") console.info(`[otp] local development code: ${otp}`);
    } catch (error) {
      await OtpChallenge.deleteOne({ _id: challenge._id, mobile });
      if (error instanceof OtpDeliveryError) {
        console.warn("OTP delivery unavailable", { provider: "fast2sms", category: error.category, ...(error.status ? { status: error.status } : {}) });
      }
      return res.status(503).json({ code: "OTP_UNAVAILABLE", message: "Verification is temporarily unavailable" });
    }

    res.json({ success: true, retryAfterSeconds: otpResendCooldownSeconds });
  } catch {
    console.error("OTP send failed");
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

app.post("/auth/verify-otp", verifyOtpIpLimiter, verifyOtpMobileLimiter, async (req, res) => {
  try {
    const mobile = normalizeIndianMobile(req.body?.mobile);
    const otp = String(req.body?.otp || "").trim();

    if (!mobile || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Mobile and OTP required" });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database unavailable" });
    }

    const now = new Date();
    const challenge = await OtpChallenge.findOne({ mobile });
    const rejectAttempt = async () => {
      if (challenge?._id) {
        const updated = await OtpChallenge.findOneAndUpdate(
          { _id: challenge._id, consumedAt: null, expiresAt: { $gt: now }, failedAttempts: { $lt: otpMaxVerifyAttempts } },
          { $inc: { failedAttempts: 1 } },
          { new: true }
        );
        if (updated && updated.failedAttempts >= otpMaxVerifyAttempts) {
          await OtpChallenge.updateOne({ _id: updated._id, consumedAt: null }, { $set: { lockedAt: now } });
        }
      }
      return res.status(400).json({ code: "INVALID_OTP", message: "Invalid or expired verification code" });
    };

    if (!challenge || challenge.consumedAt || challenge.lockedAt || challenge.expiresAt <= now || challenge.failedAttempts >= otpMaxVerifyAttempts) return rejectAttempt();
    const expected = String(challenge.otpHash || "");
    const actual = createOtpHash(mobile, otp, String(process.env.JWT_SECRET || ""));
    if (!expected || !secureOtpMatch(expected, actual)) return rejectAttempt();

    const consumed = await OtpChallenge.findOneAndUpdate(
      { _id: challenge._id, consumedAt: null, lockedAt: null, expiresAt: { $gt: now }, failedAttempts: { $lt: otpMaxVerifyAttempts } },
      { $set: { consumedAt: now } },
      { new: true }
    );
    if (!consumed) return res.status(400).json({ code: "INVALID_OTP", message: "Invalid or expired verification code" });

    let user = await User.findOne({ mobile });
    if (!user) {
      try {
        user = await User.findOneAndUpdate({ mobile }, { $setOnInsert: { mobile } }, { new: true, upsert: true });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        user = await User.findOne({ mobile });
      }
    }
    if (!user) throw new Error("User creation failed");
  
  
    // Clear OTP
  
    // 🔐 Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
  
    res.json({
      success: true,
      token,
    });
  } catch {
    console.error("OTP verification failed");
    res.status(500).json({ message: "OTP verification failed" });
  }
});

const adminMiddleware = createAdminMiddleware(String(process.env.JWT_SECRET || ""));
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getAdminEmailFilter = (email: string) => ({
  email: { $regex: new RegExp(`^${escapeRegExp(email)}$`, "i") },
});

app.post(
  "/admin/login",
  adminLoginLimiter,
  createAdminLoginHandler({
    findAdminByEmail: (email) => Admin.findOne(getAdminEmailFilter(email)).lean(),
    comparePassword: bcrypt.compare,
    jwtSecret: String(process.env.JWT_SECRET || ""),
  })
);

app.post("/admin/forgot-password", adminPasswordResetLimiter, async (req, res) => {
  try {
    const { email, newPassword, resetKey } = req.body;
    const configuredResetKey = String(process.env.ADMIN_RESET_KEY || "").trim();

    if (!configuredResetKey) {
      return res.status(503).json({ message: "Admin password reset is not configured" });
    }

    if (String(resetKey || "").trim() !== configuredResetKey) {
      return res.status(401).json({ message: "Invalid reset key" });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const passwordValue = String(newPassword || "");

    if (!normalizedEmail || !passwordValue) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (passwordValue.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedPassword = await bcrypt.hash(passwordValue, 10);
    const admin = await Admin.findOneAndUpdate(
      getAdminEmailFilter(normalizedEmail),
      { password: hashedPassword },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin account not found" });
    }

    res.json({ success: true, message: "Admin password updated" });
  } catch (error) {
    res.status(500).json({ message: "Admin password reset failed" });
  }
});

app.post("/orders/preview", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { items, cleaningService, speed } = req.body;
    const pricing = calculateOrderTotals(items, cleaningService, speed, DELIVERY_CHARGE, FREE_DELIVERY_THRESHOLD);

    res.json({
      success: true,
      cleaningService: pricing.cleaningService,
      speed: pricing.speed,
      items: pricing.processedItems,
      subtotal: pricing.subtotal,
      deliveryCharge: pricing.deliveryCharge,
      totalAmount: pricing.totalAmount,
      currency: CURRENCY,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    res.status(400).json({ message });
  }
});

type PaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type PaymentVerificationTokenPayload = {
  purpose: "payment_verification";
  userId: string;
  paymentIntentId: string;
};

const addressSnapshotFor = (address: any) => ({
  fullName: address.fullName || "",
  phone: address.phone || "",
  houseNumber: address.houseNumber || "",
  building: address.building || "",
  street: address.street || "",
  locality: address.locality || "",
  city: address.city || "",
  pincode: address.pincode || "",
  addressType: address.addressType || "",
  instructions: address.instructions || "",
});

const confirmPaymentIntent = async (intent: any, paymentId: string) => {
  if (intent.razorpayPaymentId && intent.razorpayPaymentId !== paymentId) return null;
  return PaymentIntent.findOneAndUpdate(
    {
      _id: intent._id,
      $or: [{ razorpayPaymentId: { $exists: false } }, { razorpayPaymentId: null }, { razorpayPaymentId: paymentId }],
    },
    {
      $set: {
        razorpayPaymentId: paymentId,
        paymentConfirmedAt: intent.paymentConfirmedAt || new Date(),
        status: intent.orderId ? "reconciled" : "payment_confirmed",
        reconciliationFailureCode: null,
      },
    },
    { new: true }
  );
};

const sendOrderCreatedRealtime = (appInstance: express.Application, order: any) => {
  const realtime = appInstance.get("io");
  realtime?.to(ADMINS_ROOM).emit("ordersUpdated");
};

const handleCreatePaymentOrder = async (req: AuthRequest, res: any) => {
  try {
    if (!MOCK_PAYMENTS && (!razorpayClient || !razorpayKeyId)) {
      return res.status(503).json({
        message: "Payment gateway is not configured",
      });
    }

    const { items, cleaningService, speed, pickupDate, pickupSlot } = req.body;
    const addressId = String(req.body?.addressId || "").trim();
    if (!addressId) {
      return res.status(400).json({ message: "Address is required" });
    }
    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "Invalid address" });
    }

    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.userId,
    });
    if (!address) {
      return res.status(400).json({ message: "Invalid address" });
    }
    if (!isBookablePickupDate(pickupDate)) {
      return res.status(400).json({ code: "INVALID_PICKUP_DATE", message: "Select a valid pickup date" });
    }
    if (!isCanonicalPickupSlot(pickupSlot)) {
      return res.status(400).json({ code: "INVALID_PICKUP_SLOT", message: "Select a valid pickup slot" });
    }

    const pricing = calculateOrderTotals(items, cleaningService, speed, DELIVERY_CHARGE, FREE_DELIVERY_THRESHOLD);
    const receipt = generatePaymentReceipt();
    const paymentIntent = await PaymentIntent.create({
      userId: req.user.userId,
      addressId,
      addressSnapshot: addressSnapshotFor(address),
      items: pricing.processedItems,
      cleaningService: pricing.cleaningService,
      speed: pricing.speed,
      pickupDate,
      pickupSlot,
      subtotal: pricing.subtotal,
      deliveryCharge: pricing.deliveryCharge,
      totalAmount: pricing.totalAmount,
      currency: CURRENCY,
      receipt,
      status: "created",
    });

    const paymentOrder = MOCK_PAYMENTS
      ? {
          id: generateMockOrderId(),
          amount: Math.round(pricing.totalAmount * 100),
          currency: CURRENCY,
          receipt,
        }
      : await razorpayClient!.orders.create({
          amount: Math.round(pricing.totalAmount * 100),
          currency: CURRENCY,
          receipt,
          notes: {
            paymentIntentId: String(paymentIntent._id),
          },
        });

    paymentIntent.razorpayOrderId = paymentOrder.id;
    paymentIntent.status = "provider_order_created";
    await paymentIntent.save();

    res.json({
      success: true,
      paymentIntentId: String(paymentIntent._id),
      keyId: razorpayKeyId || "rzp_test_mock_key",
      mock: MOCK_PAYMENTS,
      paymentOrder: {
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        receipt: paymentOrder.receipt,
      },
      pricing: {
        cleaningService: pricing.cleaningService,
        speed: pricing.speed,
        items: pricing.processedItems,
        subtotal: pricing.subtotal,
        deliveryCharge: pricing.deliveryCharge,
        totalAmount: pricing.totalAmount,
      },
    });
  } catch (error) {
    console.error("Razorpay payment intent creation failed");
    res.status(400).json({ message: "Payment order creation failed" });
  }
};

const handleVerifyPayment = async (req: AuthRequest, res: any) => {
  try {
    const { paymentIntentId, payment } = req.body;
    const intentId = String(paymentIntentId || "").trim();
    if (!intentId) return res.status(400).json({ code: "PAYMENT_INTENT_REQUIRED", message: "Payment intent is required" });
    if (!mongoose.isValidObjectId(intentId)) return res.status(400).json({ code: "INVALID_PAYMENT_INTENT", message: "Invalid payment intent" });
    if (!payment) {
      return res.status(400).json({
        code: "PAYMENT_REQUIRED",
        message: "Payment verification is required",
      });
    }

    const intent = await PaymentIntent.findOne({ _id: intentId, userId: req.user.userId });
    if (!intent) return res.status(404).json({ code: "PAYMENT_INTENT_NOT_FOUND", message: "Payment intent not found" });
    const razorpayOrderId = String(payment.razorpay_order_id || "").trim();
    const razorpayPaymentId = String(payment.razorpay_payment_id || "").trim();
    const razorpaySignature = String(payment.razorpay_signature || "").trim();
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || razorpayOrderId !== intent.razorpayOrderId) {
      return res.status(400).json({ code: "INVALID_PAYMENT_PAYLOAD", message: "Invalid payment payload" });
    }

    if (!MOCK_PAYMENTS) {
      if (!razorpayClient || !razorpayKeySecret) return res.status(503).json({ message: "Payment gateway is not configured" });
      const gatewayOrder = await razorpayClient.orders.fetch(razorpayOrderId);
      if (!gatewayOrder || gatewayOrder.id !== razorpayOrderId || gatewayOrder.amount !== Math.round(intent.totalAmount * 100) || gatewayOrder.currency !== intent.currency || gatewayOrder.notes?.paymentIntentId !== String(intent._id) || (gatewayOrder.status && gatewayOrder.status !== "paid")) {
        return res.status(400).json({ code: "PAYMENT_CONTEXT_MISMATCH", message: "Payment verification does not match the payment intent" });
      }
      if (!secureHexCompare(buildExpectedRazorpaySignature(razorpayOrderId, razorpayPaymentId), razorpaySignature)) {
        return res.status(400).json({ code: "INVALID_PAYMENT_SIGNATURE", message: "Invalid payment signature" });
      }
    }

    const confirmedIntent = await confirmPaymentIntent(intent, razorpayPaymentId);
    if (!confirmedIntent) return res.status(400).json({ code: "PAYMENT_IDENTITY_MISMATCH", message: "Payment does not match the payment intent" });
    const wasReconciled = Boolean(intent.orderId || intent.status === "reconciled");
    const reconciled = await reconcilePaymentIntent(String(confirmedIntent._id));
    if (reconciled.order && !wasReconciled) sendOrderCreatedRealtime(req.app, reconciled.order);

    const payload: PaymentVerificationTokenPayload = {
      purpose: "payment_verification",
      userId: String(req.user.userId),
      paymentIntentId: String(confirmedIntent._id),
    };

    const paymentVerificationToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "20m",
    });

    res.json({
      success: true,
      verified: true,
      mock: MOCK_PAYMENTS,
      paymentIntentId: String(confirmedIntent._id),
      status: reconciled.status,
      paymentVerificationToken,
      order: reconciled.order ? { _id: String(reconciled.order._id), totalAmount: reconciled.order.totalAmount, status: reconciled.order.status, pickupDate: reconciled.order.pickupDate, pickupSlot: reconciled.order.pickupSlot } : null,
    });
  } catch (error) {
    console.error("Payment verification failed");
    res.status(400).json({ code: "PAYMENT_VERIFICATION_FAILED", message: "Payment verification failed" });
  }
};

app.post("/payments/create-order", authMiddleware, handleCreatePaymentOrder);
app.post("/payment/create-order", authMiddleware, handleCreatePaymentOrder);
app.post("/payments/verify", authMiddleware, handleVerifyPayment);
app.post("/payment/verify", authMiddleware, handleVerifyPayment);

function handleRazorpayWebhook(req: express.Request, res: express.Response) {
  return (async () => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const signature = req.header("x-razorpay-signature");
    if (!razorpayWebhookSecret) {
      return res.status(503).json({ code: "WEBHOOK_NOT_CONFIGURED", message: "Webhook processing is unavailable" });
    }
    if (!isValidRazorpayWebhookSignature(rawBody, signature, razorpayWebhookSecret)) {
      return res.status(401).json({ code: "INVALID_WEBHOOK_SIGNATURE", message: "Invalid webhook signature" });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ code: "INVALID_WEBHOOK_PAYLOAD", message: "Invalid webhook payload" });
    }
    const payment = getCapturedPaymentFromWebhook(payload);
    if (!payment) return res.status(200).json({ success: true, ignored: true });

    const intent = await PaymentIntent.findOne({ razorpayOrderId: payment.orderId });
    if (!intent) return res.status(200).json({ success: true, ignored: true });
    if (payment.amount !== Math.round(intent.totalAmount * 100) || payment.currency !== intent.currency) {
      return res.status(400).json({ code: "PAYMENT_AMOUNT_MISMATCH", message: "Payment does not match the payment intent" });
    }
    const confirmedIntent = await confirmPaymentIntent(intent, payment.id);
    if (!confirmedIntent) return res.status(400).json({ code: "PAYMENT_IDENTITY_MISMATCH", message: "Payment does not match the payment intent" });
    const wasReconciled = Boolean(intent.orderId || intent.status === "reconciled");
    const reconciled = await reconcilePaymentIntent(String(confirmedIntent._id));
    if (reconciled.order && !wasReconciled) sendOrderCreatedRealtime(req.app, reconciled.order);
    if (!reconciled.order) return res.status(503).json({ code: "RECONCILIATION_PENDING", message: "Reconciliation pending" });
    return res.json({ success: true });
  })().catch(() => res.status(500).json({ code: "WEBHOOK_PROCESSING_FAILED", message: "Webhook processing failed" }));
}

app.get("/payments/intents/:intentId", authMiddleware, async (req: AuthRequest, res) => {
  const intentId = String(req.params.intentId || "").trim();
  if (!mongoose.isValidObjectId(intentId)) return res.status(400).json({ code: "INVALID_PAYMENT_INTENT", message: "Invalid payment intent" });
  const intent = await PaymentIntent.findOne({ _id: intentId, userId: req.user.userId });
  if (!intent) return res.status(404).json({ code: "PAYMENT_INTENT_NOT_FOUND", message: "Payment intent not found" });
  const reconciled = await reconcilePaymentIntent(String(intent._id));
  const refreshed = await PaymentIntent.findById(intent._id);
  return res.json({
    success: true,
    paymentIntentId: String(intent._id),
    status: refreshed?.status || reconciled.status,
    order: reconciled.order ? { _id: String(reconciled.order._id), totalAmount: reconciled.order.totalAmount, status: reconciled.order.status, pickupDate: reconciled.order.pickupDate, pickupSlot: reconciled.order.pickupSlot } : null,
  });
});
app.post("/payments/failure", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { addressId, items, cleaningService, speed, paymentOrderId, paymentId, reason, totalAmount, metadata } = req.body || {};

    await PaymentAttempt.create({
      userId: req.user.userId,
      addressId: addressId || null,
      items: Array.isArray(items) ? items : [],
      cleaningService: cleaningService === "wash" || cleaningService === "dry" ? cleaningService : null,
      speed: speed === "standard" || speed === "express" ? speed : null,
      paymentOrderId: String(paymentOrderId || "").trim() || null,
      paymentId: String(paymentId || "").trim() || null,
      totalAmount: Number(totalAmount) || 0,
      reason: String(reason || "Payment failed").trim(),
      metadata: metadata || null,
      status: "failed",
    });

    res.json({ success: true });
  } catch {
    console.error("Payment failure logging failed");
    res.status(500).json({ message: "Failed to log payment failure" });
  }
});
app.post("/payment/failure", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { addressId, items, cleaningService, speed, paymentOrderId, paymentId, reason, totalAmount, metadata } = req.body || {};

    await PaymentAttempt.create({
      userId: req.user.userId,
      addressId: addressId || null,
      items: Array.isArray(items) ? items : [],
      cleaningService: cleaningService === "wash" || cleaningService === "dry" ? cleaningService : null,
      speed: speed === "standard" || speed === "express" ? speed : null,
      paymentOrderId: String(paymentOrderId || "").trim() || null,
      paymentId: String(paymentId || "").trim() || null,
      totalAmount: Number(totalAmount) || 0,
      reason: String(reason || "Payment failed").trim(),
      metadata: metadata || null,
      status: "failed",
    });

    res.json({ success: true });
  } catch {
    console.error("Payment failure logging failed");
    res.status(500).json({ message: "Failed to log payment failure" });
  }
});

app.post("/orders", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { paymentVerificationToken } = req.body;
    if (!paymentVerificationToken) {
      return res.status(400).json({
        code: "PAYMENT_VERIFICATION_REQUIRED",
        message: "Payment verification token is required",
      });
    }
    let tokenPayload: PaymentVerificationTokenPayload;
    try {
      tokenPayload = jwt.verify(
        String(paymentVerificationToken),
        process.env.JWT_SECRET as string
      ) as PaymentVerificationTokenPayload;
    } catch {
      return res.status(401).json({
        code: "INVALID_PAYMENT_VERIFICATION_TOKEN",
        message: "Invalid or expired payment verification token",
      });
    }

    if (tokenPayload.purpose !== "payment_verification" || tokenPayload.userId !== String(req.user.userId) || !tokenPayload.paymentIntentId) {
      return res.status(400).json({
        code: "PAYMENT_VERIFICATION_MISMATCH",
        message: "Payment verification does not match order details",
      });
    }

    if (!mongoose.isValidObjectId(tokenPayload.paymentIntentId)) {
      return res.status(400).json({ code: "PAYMENT_VERIFICATION_MISMATCH", message: "Payment verification does not match order details" });
    }
    const intent = await PaymentIntent.findOne({ _id: tokenPayload.paymentIntentId, userId: req.user.userId });
    if (!intent) return res.status(404).json({ code: "PAYMENT_INTENT_NOT_FOUND", message: "Payment intent not found" });
    const wasReconciled = Boolean(intent.orderId || intent.status === "reconciled");
    const reconciled = await reconcilePaymentIntent(String(intent._id));
    if (!reconciled.order) return res.status(202).json({ success: true, status: reconciled.status, order: null });
    if (!wasReconciled) sendOrderCreatedRealtime(req.app, reconciled.order);
    res.json({ success: true, order: reconciled.order });
  } catch (error) {
    res.status(400).json({ code: "ORDER_CREATION_FAILED", message: "Order reconciliation failed" });
  }
});

app.get("/orders", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId })
      .populate("addressId")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

app.post("/support/query", authMiddleware, supportQueryLimiter, async (req: AuthRequest, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const forceNew = Boolean(req.body?.forceNew);
    if (!message) {
      return res.status(400).json({ message: "Support message is required" });
    }

    const userId = req.user?.userId;
    const tokenMobile = req.user?.mobile as string | undefined;
    const user =
      tokenMobile && tokenMobile.length === 10
        ? null
        : await User.findById(userId).select("mobile");
    const mobile = tokenMobile || user?.mobile || "unknown";

    const latestOrder = await getSupportRelevantOrder(userId);
    const escalationCheck = detectEscalation(message);
    const { intent, confidenceScore } = detectSupportIntentWithConfidence(message);

    if (escalationCheck.escalate || confidenceScore < SUPPORT_CONFIDENCE_THRESHOLD) {
      const aiReply = "ESCALATE_TO_AGENT";
      const reason =
        escalationCheck.escalate
          ? escalationCheck.reason
          : `Low confidence (${Math.round(confidenceScore * 100)}%)`;
      const { ticket } = await upsertEscalatedTicket({
        userId,
        mobile,
        message,
        aiReply,
        reason,
        intent,
        confidenceScore,
        orderId: latestOrder?._id || null,
        changedBy: "ai",
        forceNew,
      });

      await SupportInteraction.create({
        userId,
        mobile,
        message,
        response: aiReply,
        intent,
        confidenceScore,
        aiOutcome: "escalated",
        reason,
      });
      return res.json({
        success: true,
        escalated: true,
        intent,
        confidenceScore,
        reason,
        response: aiReply,
        ticket: serializeTicket(ticket),
        hybridFlow: {
          resolvedByAI: false,
          ticketCreated: true,
        },
        promptControl: {
          version: "v1",
          mode: escalationCheck.escalate ? "strict-escalation" : "low-confidence-escalation",
        },
      });
    }

    const servicesList = ["Wash & Iron", "Dry Clean", "Standard", "Express"].join(", ");
    const pricingRule = "Item-wise pricing uses cleaning multipliers (wash x1.0, dry x2.5) and speed multipliers (standard x1.0, express x1.5).";
    const deliveryPolicy = "Delivery is free for orders >= Rs.299, otherwise Rs.25.";
    const workingHours = "Daily 8:00 AM - 9:00 PM.";

    const response = buildControlledSupportReply(intent, {
      mobile,
      latestOrder: latestOrder
        ? {
            status: latestOrder.status,
            createdAt: latestOrder.createdAt,
          }
        : null,
      nextStep: latestOrder ? getNextOrderStep(latestOrder.status) : null,
      servicesList,
      pricingRule,
      deliveryPolicy,
      workingHours,
      serviceTurnaround: { wash: "24-36 hours", dry: "36-48 hours", express: "24 hours" },
    });

    await SupportInteraction.create({
      userId,
      mobile,
      message,
      response,
      intent,
      confidenceScore,
      aiOutcome: "ai_handled",
      reason: "",
    });

    return res.json({
      success: true,
      escalated: false,
      intent,
      confidenceScore,
      response,
      hybridFlow: {
        resolvedByAI: true,
        ticketCreated: false,
      },
      promptControl: {
        version: "v1",
        mode: "strict-answer-whitelist",
        systemPrompt: buildSystemPrompt(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Support query failed" });
  }
});

app.post("/support/escalate", authMiddleware, supportEscalateLimiter, async (req: AuthRequest, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const reason = String(req.body?.reason || "Manual escalation requested").trim();
    const intent = String(req.body?.intent || "unknown").trim();
    const aiReply = String(req.body?.aiReply || "ESCALATE_TO_AGENT").trim();
    const forceNew = Boolean(req.body?.forceNew);
    const confidenceScore = Number.isFinite(Number(req.body?.confidenceScore))
      ? Math.max(0, Math.min(1, Number(req.body?.confidenceScore)))
      : 0.5;

    if (!message) {
      return res.status(400).json({ message: "Support message is required" });
    }

    const userId = req.user?.userId;
    const tokenMobile = req.user?.mobile as string | undefined;
    const user =
      tokenMobile && tokenMobile.length === 10
        ? null
        : await User.findById(userId).select("mobile");
    const mobile = tokenMobile || user?.mobile || "unknown";

    const latestOrder = await getSupportRelevantOrder(userId);

    const { ticket } = await upsertEscalatedTicket({
      userId,
      mobile,
      message,
      aiReply,
      reason,
      intent,
      confidenceScore,
      orderId: latestOrder?._id || null,
      changedBy: "system",
      forceNew,
    });

    await SupportInteraction.create({
      userId,
      mobile,
      message,
      response: aiReply,
      intent,
      confidenceScore,
      aiOutcome: "escalated",
      reason,
    });
    res.json({
      success: true,
      escalated: true,
      confidenceScore,
      ticket: serializeTicket(ticket),
      hybridFlow: {
        resolvedByAI: false,
        ticketCreated: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Support escalation failed" });
  }
});

app.get("/support/tickets/active", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      userId: req.user?.userId,
      status: { $ne: "resolved" },
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      ticket: ticket ? serializeTicket(ticket) : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active support ticket" });
  }
});

app.post("/support/tickets/message", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const ticketId = String(req.body?.ticketId || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!ticketId || !message) {
      return res.status(400).json({ message: "Ticket ID and message are required" });
    }
    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket" });
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId: req.user?.userId,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    normalizeTicketDocument(ticket);
    const newMessage = {
      sender: "user" as TicketMessageSender,
      text: message,
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage as any);
    await ticket.save();

    const serializedMessage = serializeTicketMessage(newMessage);
    emitTicketMessage(io, ticketId, serializedMessage);
    emitTicketUpdated(io, ticket);

    res.json({
      success: true,
      ticket: serializeTicket(ticket),
      message: serializedMessage,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to send support message" });
  }
});

app.get("/addresses", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const addresses = await Address.find({
      userId: req.user.userId,
    });

    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

app.post("/user/save-push-token", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const pushToken = String(req.body?.pushToken || "").trim();
    if (!pushToken) {
      return res.status(400).json({ message: "Push token is required" });
    }

    await User.findByIdAndUpdate(req.user?.userId, { pushToken });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to save push token" });
  }
});

app.post("/addresses", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const street = String(req.body?.street || "").trim();
    const city = String(req.body?.city || "").trim();
    const pincode = String(req.body?.pincode || "").trim();
    const houseNumber = String(req.body?.houseNumber || "").trim();
    const building = String(req.body?.building || "").trim();
    const locality = String(req.body?.locality || "").trim();
    const requestedAddressType = String(req.body?.addressType || "House").trim();
    const addressType = ["House", "Office", "Other"].includes(requestedAddressType)
      ? requestedAddressType
      : "House";
    const instructions = String(req.body?.instructions || "").trim();
    const latitude =
      typeof req.body?.latitude === "number" && Number.isFinite(req.body.latitude)
        ? req.body.latitude
        : undefined;
    const longitude =
      typeof req.body?.longitude === "number" && Number.isFinite(req.body.longitude)
        ? req.body.longitude
        : undefined;

    if (!fullName || !phone || !street || !city || !pincode) {
      return res.status(400).json({ message: "All address fields are required" });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: "Invalid pincode" });
    }

    if (fullName.length < 2) {
      return res.status(400).json({ message: "Invalid full name" });
    }

    const address = new Address({
      userId: req.user.userId,
      fullName,
      phone,
      street,
      city,
      pincode,
      houseNumber,
      building,
      locality,
      addressType,
      instructions,
      latitude,
      longitude,
    });

    await address.save();

    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ message: "Failed to create address" });
  }
});

app.put("/addresses/:addressId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const addressId = String(req.params.addressId || "").trim();
    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "Invalid address" });
    }
    const fullName = String(req.body?.fullName || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const street = String(req.body?.street || "").trim();
    const city = String(req.body?.city || "").trim();
    const pincode = String(req.body?.pincode || "").trim();
    const houseNumber = String(req.body?.houseNumber || "").trim();
    const building = String(req.body?.building || "").trim();
    const locality = String(req.body?.locality || "").trim();
    const requestedAddressType = String(req.body?.addressType || "House").trim();
    const addressType = ["House", "Office", "Other"].includes(requestedAddressType)
      ? requestedAddressType
      : "House";
    const instructions = String(req.body?.instructions || "").trim();
    const latitude =
      typeof req.body?.latitude === "number" && Number.isFinite(req.body.latitude)
        ? req.body.latitude
        : undefined;
    const longitude =
      typeof req.body?.longitude === "number" && Number.isFinite(req.body.longitude)
        ? req.body.longitude
        : undefined;

    if (!fullName || !phone || !street || !city || !pincode) {
      return res.status(400).json({ message: "All address fields are required" });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: "Invalid pincode" });
    }

    if (fullName.length < 2) {
      return res.status(400).json({ message: "Invalid full name" });
    }

    const address = await Address.findOneAndUpdate(
      {
        _id: addressId,
        userId: req.user.userId,
      },
      {
        fullName,
        phone,
        street,
        city,
        pincode,
        houseNumber,
        building,
        locality,
        addressType,
        instructions,
        latitude,
        longitude,
      },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ message: "Failed to update address" });
  }
});

app.get("/admin/orders", adminMiddleware, async (_req, res) => {
  const orders = await Order.find()
    .populate("userId", "mobile")
    .sort({ createdAt: -1 })
    .lean();

  const serializedOrders = orders.map((order: any) => ({
    ...order,
    userId:
      typeof order.userId === "object" && order.userId?._id
        ? String(order.userId._id)
        : String(order.userId || ""),
    mobile:
      typeof order.userId === "object" && order.userId?.mobile
        ? String(order.userId.mobile)
        : "",
  }));

  res.json({ success: true, orders: serializedOrders });
});

app.get("/admin/tickets", adminMiddleware, async (_req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1 })
      .select(
        "_id userId mobile orderId message userMessage aiReply aiOutcome reason intent status statusHistory confidenceScore firstResponseAt resolvedAt responseDueAt resolutionDueAt responseTimeMinutes resolutionTimeMinutes messages createdAt updatedAt"
      );

    res.json({
      success: true,
      tickets: tickets.map((ticket) => serializeTicket(ticket)),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

app.post("/admin/tickets/message", adminMiddleware, async (req, res) => {
  try {
    const ticketId = String(req.body?.ticketId || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!ticketId || !message) {
      return res.status(400).json({ message: "Ticket ID and message are required" });
    }
    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket" });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    normalizeTicketDocument(ticket);
    const now = new Date();
    const newMessage = {
      sender: "admin" as TicketMessageSender,
      text: message,
      createdAt: now,
    };

    ticket.messages.push(newMessage as any);

    const previousStatus = ticket.status as TicketStatus;
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = now as any;
      ticket.responseTimeMinutes = toMinutes(new Date(ticket.createdAt), now) as any;
    }
    if (previousStatus === "open") {
      ticket.status = "in_progress";
      (ticket as any).statusHistory.push({
        fromStatus: previousStatus,
        toStatus: "in_progress",
        changedAt: now,
        changedBy: "admin",
      });
    }

    await ticket.save();

    const serializedMessage = serializeTicketMessage(newMessage);
    emitTicketMessage(io, ticketId, serializedMessage);
    emitTicketUpdated(io, ticket);
    void emitOverdueTicketAlert();

    res.json({
      success: true,
      ticket: serializeTicket(ticket),
      message: serializedMessage,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to send admin ticket message" });
  }
});

app.patch("/admin/tickets/:id/status", adminMiddleware, async (req, res) => {
  try {
    const normalizedStatus = normalizeTicketStatus(String(req.body?.status || ""));
    const ticketId = String(req.params.id || "").trim();
    if (!normalizedStatus) {
      return res.status(400).json({ message: "Invalid ticket status" });
    }
    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket" });
    }

    const ticket = await SupportTicket.findById(ticketId).select(
      "_id userId mobile orderId message userMessage aiReply aiOutcome reason intent status statusHistory confidenceScore firstResponseAt resolvedAt responseDueAt resolutionDueAt responseTimeMinutes resolutionTimeMinutes messages createdAt updatedAt"
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    normalizeTicketDocument(ticket);
    const previousStatus = ticket.status as TicketStatus;
    if (previousStatus !== normalizedStatus) {
      ticket.status = normalizedStatus;
      const now = new Date();
      if (!ticket.firstResponseAt && (normalizedStatus === "in_progress" || normalizedStatus === "resolved")) {
        ticket.firstResponseAt = now as any;
        ticket.responseTimeMinutes = toMinutes(new Date(ticket.createdAt), now) as any;
      }
      if (!ticket.resolvedAt && normalizedStatus === "resolved") {
        ticket.resolvedAt = now as any;
        ticket.resolutionTimeMinutes = toMinutes(new Date(ticket.createdAt), now) as any;
      }
      (ticket as any).statusHistory.push({
        fromStatus: previousStatus,
        toStatus: normalizedStatus,
        changedAt: now,
        changedBy: "admin",
      });
      await ticket.save();
    }

    emitTicketUpdated(io, ticket);
    void emitOverdueTicketAlert();

    res.json({
      success: true,
      ticket: serializeTicket(ticket),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update ticket status" });
  }
});

app.get("/admin/support/analytics", adminMiddleware, async (_req, res) => {
  try {
    const [totalInteractions, aiResolvedCount, escalatedCount, tickets, issueBuckets] = await Promise.all([
      SupportInteraction.countDocuments(),
      SupportInteraction.countDocuments({ aiOutcome: "ai_handled" }),
      SupportInteraction.countDocuments({ aiOutcome: "escalated" }),
      SupportTicket.find().select(
        "_id reason status createdAt firstResponseAt resolvedAt responseTimeMinutes resolutionTimeMinutes responseDueAt resolutionDueAt"
      ),
      SupportInteraction.aggregate([
        { $match: { aiOutcome: "escalated" } },
        {
          $group: {
            _id: { $ifNull: ["$reason", "Other"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const responseTimes = tickets
      .map((ticket: any) => ticket.responseTimeMinutes)
      .filter((value: any) => typeof value === "number");
    const resolutionTimes = tickets
      .map((ticket: any) => ticket.resolutionTimeMinutes)
      .filter((value: any) => typeof value === "number");

    const avgResponseTimeMinutes = responseTimes.length
      ? Math.round(responseTimes.reduce((sum: number, value: number) => sum + value, 0) / responseTimes.length)
      : null;
    const avgResolutionTimeMinutes = resolutionTimes.length
      ? Math.round(
          resolutionTimes.reduce((sum: number, value: number) => sum + value, 0) / resolutionTimes.length
        )
      : null;

    const overdueTickets = tickets
      .filter((ticket: any) => {
        const sla = getTicketSla(ticket);
        return sla.overdue;
      })
      .map((ticket: any) => ({
        id: String(ticket._id),
        reason: ticket.reason,
        status: ticketStatusLabel(ticket.status as TicketStatus),
        overdueType: getTicketSla(ticket).overdueType,
        createdAt: ticket.createdAt,
      }));

    const aiResolvedRate = totalInteractions
      ? Number(((aiResolvedCount / totalInteractions) * 100).toFixed(1))
      : 0;
    const escalationRate = totalInteractions
      ? Number(((escalatedCount / totalInteractions) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      analytics: {
        totalInteractions,
        aiResolvedCount,
        escalatedCount,
        aiResolvedRate,
        escalationRate,
        avgResponseTimeMinutes,
        avgResolutionTimeMinutes,
        overdueTickets,
        mostCommonIssues: issueBuckets.map((bucket: any) => ({
          issue: bucket._id || "Other",
          count: bucket.count,
        })),
      },
      sla: {
        confidenceThresholdPercent: Math.round(SUPPORT_CONFIDENCE_THRESHOLD * 100),
        responseSlaMinutes: RESPONSE_SLA_MINUTES,
        resolutionSlaMinutes: RESOLUTION_SLA_MINUTES,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch support analytics" });
  }
});

app.get("/admin/ai/analytics", adminMiddleware, async (req, res) => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const parseDate = (value: unknown, fallback: Date) => {
    const parsed = typeof value === "string" ? new Date(value) : fallback;
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  };
  const from = parseDate(req.query.from, defaultFrom);
  const to = parseDate(req.query.to, now);
  if (from > to || to.getTime() - from.getTime() > 90 * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ success: false, message: "Use a valid date window up to 90 days." });
  }
  try {
    const analytics = await aggregateAiInteractions(from, to);
    logAiDiagnostic({ requestId: "admin_ai_analytics", stage: "admin_ai_analytics_aggregated" });
    return res.json({ success: true, analytics: { window: { from: from.toISOString(), to: to.toISOString() }, ...analytics } });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to fetch AI operations analytics." });
  }
});

const updateAdminOrderStatus = async (req: express.Request, res: express.Response) => {
  try {
    const status = String(req.body?.status || "");
    const id = String(req.params.id || "").trim();

    if (!mongoose.isValidObjectId(id) || !isOrderStatus(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await Order.findById(id);
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!canTransitionOrderStatus(updatedOrder.status, status)) {
      return res.status(409).json({
        code: "INVALID_ORDER_STATUS_TRANSITION",
        message: "Order status can only move to the next lifecycle step.",
      });
    }

    const statusChanged = updatedOrder.status !== status;
    if (statusChanged) {
      updatedOrder.status = status;
      await updatedOrder.save();
    }

    const user = statusChanged ? await User.findById(updatedOrder.userId).select("pushToken") : null;

    if (user?.pushToken) {
      let notificationMessage = "";

      switch (status) {
        case "Picked Up":
          notificationMessage = "Your order has been picked up!";
          break;
        case "Washing":
          notificationMessage = "Your clothes are now being washed.";
          break;
        case "Out for Delivery":
          notificationMessage = "Your order is out for delivery!";
          break;
        case "Delivered":
          notificationMessage = "Your order has been delivered!";
          break;
      }

      if (notificationMessage) {
        try {
          await sendPushNotification(user.pushToken, notificationMessage);
        } catch {
          console.error("Push notification failed");
        }
      }
    }

    const io = req.app.get("io");
    emitOrderStatusUpdate(io, updatedOrder);

    res.json({ success: true, order: updatedOrder });

  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
};

// Keep the legacy PUT route compatible, but route it through the same strict
// lifecycle policy as the current PATCH endpoint.
app.put("/admin/orders/:id", adminMiddleware, updateAdminOrderStatus);
app.patch("/admin/orders/:id/status", adminMiddleware, updateAdminOrderStatus);

app.post("/admin/orders/:id/simulate",adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const simulationDelayMs = 2500;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const currentStepIndex = ORDER_STATUSES.indexOf(order.status as (typeof ORDER_STATUSES)[number]);
    const remainingSteps =
      currentStepIndex >= 0 ? ORDER_STATUSES.slice(currentStepIndex + 1) : ORDER_STATUSES.slice(1);

    if (!remainingSteps.length) {
      return res.json({ success: true, message: "Order is already at the final step" });
    }

    const io = req.app.get("io");
    const applyStep = async (step: string) => {
      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { status: step },
        { new: true }
      );

      if (updatedOrder) {
        emitOrderStatusUpdate(io, updatedOrder);
      }
    };

    await applyStep(remainingSteps[0]);

    remainingSteps.slice(1).forEach((step, index) => {
      setTimeout(() => {
        void applyStep(step);
      }, (index + 1) * simulationDelayMs);
    });

    res.json({ success: true, message: "Simulation started", nextStep: remainingSteps[0] });

  } catch (error) {
    res.status(500).json({ message: "Simulation failed" });
  }
});

// Keep unknown endpoints and unhandled faults generic. Individual routes retain
// their established domain-specific safe error codes above this boundary.
app.use(createNotFoundHandler());
app.use(createSafeGlobalErrorHandler());


const PORT = Number(process.env.PORT) || 4000;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch(() => {
    console.error("MongoDB connection failed");
  });

if (!mongoUri) {
  console.error("Missing MONGO_URI environment variable");
}

server.listen(PORT, () => {
  console.log(`Fresh & Fold backend running on port ${PORT}`);
  console.log(
    `[payment-config] mockPayments=${MOCK_PAYMENTS} razorpayConfigured=${Boolean(
      razorpayKeyId && razorpayKeySecret
    )}`
  );
  if (otpDemoConfiguration) console.info("OTP evaluator demo mode enabled");
});

setInterval(() => {
  void emitOverdueTicketAlert();
}, 60 * 1000);

