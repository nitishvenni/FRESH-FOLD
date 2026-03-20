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
import cors from "cors";
import User from "./models/User";
import Order from "./models/Order";
import Address from "./models/Address";
import SupportTicket from "./models/SupportTicket";
import SupportInteraction from "./models/SupportInteraction";
import PaymentAttempt from "./models/PaymentAttempt";
import { authMiddleware, AuthRequest } from "./middleware/authMiddleware";
import { createRateLimit } from "./middleware/rateLimit";
import { sendPushNotification } from "./utils/pushNotifications";
import {
  buildControlledSupportReply,
  buildSystemPrompt,
  detectEscalation,
  detectSupportIntentWithConfidence,
} from "./support/promptControl";

const PRICING: Record<string, number> = {
  shirt: 20,
  tshirt: 18,
  jeans: 40,
  trousers: 35,
  dress: 60,
  jacket: 90,
  sweater: 50,
  bedsheet: 70,
  pillowcover: 20,
  towel: 22,
  curtain: 110,
  blanket: 140,
};
const SERVICE_MULTIPLIER: Record<string, number> = {
  wash: 1,
  dry: 1.25,
  express: 1.15,
};
const DELIVERY_CHARGE = 25;
const FREE_DELIVERY_THRESHOLD = 299;
const CURRENCY = "INR";

const ORDER_STEPS = [
  "Scheduled",
  "Received at Facility",
  "Picked Up",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
] as const;

const SERVICE_TURNAROUND: Record<string, string> = {
  wash: "24-36 hours",
  dry: "36-48 hours",
  express: "12-24 hours",
};

const MOCK_PAYMENTS = String(process.env.MOCK_PAYMENTS || "").toLowerCase() === "true";
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const msg91AuthKey = String(process.env.MSG91_AUTH_KEY || "").trim();
const msg91TemplateId = String(process.env.MSG91_TEMPLATE_ID || "").trim();
const msg91CountryCode = String(process.env.MSG91_COUNTRY_CODE || "91").trim();
const msg91OtpEnabled = Boolean(msg91AuthKey && msg91TemplateId);
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

const supportEscalateLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  namespace: "support-escalate",
});

const SUPPORT_CONFIDENCE_THRESHOLD = 0.7;
const RESPONSE_SLA_MINUTES = 15;
const RESOLUTION_SLA_MINUTES = 240;

const buildMsg91Mobile = (mobile: string) => `${msg91CountryCode}${mobile}`;

const sendOtpViaMsg91 = async (mobile: string) => {
  const params = new URLSearchParams({
    template_id: msg91TemplateId,
    mobile: buildMsg91Mobile(mobile),
    authkey: msg91AuthKey,
  });

  const response = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, any>;

  if (!response.ok) {
    throw new Error(String(data?.message || "MSG91 send OTP request failed"));
  }

  return data;
};

const verifyOtpViaMsg91 = async (mobile: string, otp: string) => {
  const params = new URLSearchParams({
    otp,
    mobile: buildMsg91Mobile(mobile),
  });

  const response = await fetch(`https://control.msg91.com/api/v5/otp/verify?${params.toString()}`, {
    method: "GET",
    headers: {
      authkey: msg91AuthKey,
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  const verifiedMessage = String(data?.message || "").toLowerCase();

  if (!response.ok || !verifiedMessage.includes("verified")) {
    throw new Error(String(data?.message || "MSG91 OTP verification failed"));
  }

  return data;
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔥 Admin connected:", socket.id);
});

io.on("connection", (socket) => {
  socket.on("joinTicket", (ticketId: string) => {
    const normalizedTicketId = String(ticketId || "").trim();
    if (!normalizedTicketId) {
      return;
    }

    socket.join(getTicketRoom(normalizedTicketId));
  });
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
    io.emit("ticketOverdueAlert", {
      overdueCount,
      checkedAt: now.toISOString(),
    });
  }
};


app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  const mongoStateMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: "ok",
    app: "Fresh & Fold Backend",
    database: {
      state: mongoStateMap[mongoose.connection.readyState] || "unknown",
      connected: mongoose.connection.readyState === 1,
    },
    otp: {
      provider: msg91OtpEnabled ? "msg91" : "local",
      smsConfigured: msg91OtpEnabled,
    },
    payment: {
      mockPayments: MOCK_PAYMENTS,
      razorpayConfigured: Boolean(razorpayKeyId && razorpayKeySecret),
    },
  });
});

const getNextOrderStep = (status: string): string | null => {
  const current = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number]);
  if (current < 0 || current + 1 >= ORDER_STEPS.length) return null;
  return ORDER_STEPS[current + 1];
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

type OrderInputItem = {
  itemName: string;
  quantity: number;
};

const calculateOrderTotals = (items: OrderInputItem[], service: string) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items are required");
  }

  const normalizedService = String(service || "").trim().toLowerCase();
  const multiplier = SERVICE_MULTIPLIER[normalizedService];
  if (!multiplier) {
    throw new Error("Invalid service selected");
  }

  let subtotal = 0;

  const processedItems = items.map((item) => {
    const itemName = String(item?.itemName || "").trim().toLowerCase();
    const quantity = Number(item?.quantity);
    if (!itemName || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Invalid item payload");
    }

    const basePrice = PRICING[itemName];
    if (!basePrice) {
      throw new Error(`Unsupported item: ${itemName}`);
    }

    const finalPrice = Math.round(basePrice * multiplier);
    const itemTotal = finalPrice * quantity;
    subtotal += itemTotal;

    return {
      itemName,
      quantity,
      price: finalPrice,
      itemTotal,
    };
  });

  const deliveryCharge = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const totalAmount = subtotal + deliveryCharge;

  return {
    service: normalizedService,
    processedItems,
    subtotal,
    deliveryCharge,
    totalAmount,
  };
};

const generatePaymentReceipt = () => `ff_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

const buildPaymentContextHash = (params: {
  userId: string;
  addressId: string;
  service: string;
  items: Array<{ itemName: string; quantity: number; price: number; itemTotal: number }>;
  totalAmount: number;
}) => {
  const normalizedItems = [...params.items]
    .sort((a, b) => a.itemName.localeCompare(b.itemName))
    .map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      price: item.price,
      itemTotal: item.itemTotal,
    }));

  const payload = JSON.stringify({
    userId: params.userId,
    addressId: params.addressId,
    service: params.service,
    items: normalizedItems,
    totalAmount: params.totalAmount,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
};

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
const getTicketRoom = (ticketId: string) => `ticket:${ticketId}`;

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
  io.emit("ticketCreated", {
    ticket: serializeTicket(ticket),
    createdAt: new Date().toISOString(),
  });
  io.emit("newTicket", serializeTicket(ticket));
  io.emit("ticketsUpdated");
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
    io.to(getTicketRoom(String(existingTicket._id))).emit("ticketUpdated", serializeTicket(existingTicket));
    io.emit("ticketsUpdated");
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

app.post("/auth/send-otp", async (req, res) => {
  try {
    const mobile = String(req.body?.mobile || "").trim();

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number" });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database unavailable" });
    }

    let user = await User.findOne({ mobile });

    if (!user) {
      user = new User({ mobile });
    }

    if (msg91OtpEnabled) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      await sendOtpViaMsg91(mobile);
      console.log(`OTP sent via MSG91 for ${mobile}`);
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

      user.otp = otp;
      user.otpExpires = otpExpires;

      await user.save();

      console.log(`OTP for ${mobile}: ${otp}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("send-otp error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

app.post("/auth/verify-otp", async (req, res) => {
  try {
    const mobile = String(req.body?.mobile || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile and OTP required" });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database unavailable" });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (msg91OtpEnabled) {
      await verifyOtpViaMsg91(mobile, otp);
    } else {
      if (user.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (!user.otpExpires || user.otpExpires < new Date()) {
        return res.status(400).json({ message: "OTP expired" });
      }
    }
  
  
    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();
  
    // 🔐 Generate JWT
    const token = jwt.sign(
      { userId: user._id, mobile: user.mobile },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
  
    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("verify-otp error:", error);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

const adminMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token" });
  }

  // Support both "Bearer token" and raw token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as any;

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};


  app.post("/admin/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      email,
      password: hashedPassword,
    });

    await admin.save();

    res.json({ success: true, message: "Admin created" });

  } catch (error) {
    res.status(500).json({ message: "Admin registration failed" });
  }
});

app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token });

  } catch (error) {
    res.status(500).json({ message: "Admin login failed" });
  }
});

app.post("/orders/preview", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { items, service } = req.body;
    const pricing = calculateOrderTotals(items, service);

    res.json({
      success: true,
      service: pricing.service,
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
  addressId: string;
  service: string;
  totalAmount: number;
  contextHash: string;
  paymentId: string;
  paymentOrderId: string;
  paymentSignature: string;
  paidAt: string;
};

const verifyPaymentForOrder = async (params: {
  userId: string;
  addressId: string;
  items: OrderInputItem[];
  service: string;
  payment: PaymentPayload;
}) => {
  if (MOCK_PAYMENTS) {
    const pricing = calculateOrderTotals(params.items, params.service);
    const contextHash = buildPaymentContextHash({
      userId: params.userId,
      addressId: params.addressId,
      service: pricing.service,
      items: pricing.processedItems,
      totalAmount: pricing.totalAmount,
    });
    return {
      pricing,
      contextHash,
      paymentId: String(params.payment?.razorpay_payment_id || "").trim() || generateMockPaymentId(),
      paymentOrderId: String(params.payment?.razorpay_order_id || "").trim() || generateMockOrderId(),
      paymentSignature: String(params.payment?.razorpay_signature || "").trim() || "mock_signature",
      paidAt: new Date().toISOString(),
    };
  }

  if (!razorpayClient || !razorpayKeySecret) {
    throw new Error("Payment gateway is not configured");
  }

  const razorpayOrderId = String(params.payment?.razorpay_order_id || "").trim();
  const razorpayPaymentId = String(params.payment?.razorpay_payment_id || "").trim();
  const razorpaySignature = String(params.payment?.razorpay_signature || "").trim();
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return {
      error: {
        status: 400,
        code: "INVALID_PAYMENT_PAYLOAD",
        message: "Invalid payment payload",
      },
    };
  }

  const pricing = calculateOrderTotals(params.items, params.service);
  const expectedAmountPaise = Math.round(pricing.totalAmount * 100);
  const contextHash = buildPaymentContextHash({
    userId: params.userId,
    addressId: params.addressId,
    service: pricing.service,
    items: pricing.processedItems,
    totalAmount: pricing.totalAmount,
  });

  const gatewayOrder = await razorpayClient.orders.fetch(razorpayOrderId);
  if (!gatewayOrder || gatewayOrder.id !== razorpayOrderId) {
    return {
      error: {
        status: 400,
        code: "PAYMENT_ORDER_NOT_FOUND",
        message: "Payment order not found",
      },
    };
  }
  if (gatewayOrder.amount !== expectedAmountPaise || gatewayOrder.currency !== CURRENCY) {
    return {
      error: {
        status: 400,
        code: "PAYMENT_AMOUNT_MISMATCH",
        message: "Payment amount mismatch",
      },
    };
  }
  if (
    gatewayOrder.notes?.userId !== params.userId ||
    gatewayOrder.notes?.addressId !== params.addressId ||
    gatewayOrder.notes?.service !== pricing.service ||
    gatewayOrder.notes?.contextHash !== contextHash
  ) {
    return {
      error: {
        status: 400,
        code: "PAYMENT_CONTEXT_MISMATCH",
        message: "Payment context mismatch",
      },
    };
  }
  if (gatewayOrder.status && gatewayOrder.status !== "paid") {
    return {
      error: {
        status: 400,
        code: "PAYMENT_NOT_COMPLETED",
        message: "Payment is not completed",
      },
    };
  }

  const expectedSignature = buildExpectedRazorpaySignature(razorpayOrderId, razorpayPaymentId);
  if (!secureHexCompare(expectedSignature, razorpaySignature)) {
    return {
      error: {
        status: 400,
        code: "INVALID_PAYMENT_SIGNATURE",
        message: "Invalid payment signature",
      },
    };
  }

  return {
    pricing,
    contextHash,
    paymentId: razorpayPaymentId,
    paymentOrderId: razorpayOrderId,
    paymentSignature: razorpaySignature,
    paidAt: new Date().toISOString(),
  };
};

const handleCreatePaymentOrder = async (req: AuthRequest, res: any) => {
  try {
    if (!MOCK_PAYMENTS && (!razorpayClient || !razorpayKeyId)) {
      return res.status(503).json({
        message: "Payment gateway is not configured",
      });
    }

    const { addressId, items, service } = req.body;
    if (!addressId) {
      return res.status(400).json({ message: "Address is required" });
    }

    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.userId,
    });
    if (!address) {
      return res.status(400).json({ message: "Invalid address" });
    }

    const pricing = calculateOrderTotals(items, service);
    const receipt = generatePaymentReceipt();
    const contextHash = buildPaymentContextHash({
      userId: String(req.user.userId),
      addressId: String(addressId),
      service: pricing.service,
      items: pricing.processedItems,
      totalAmount: pricing.totalAmount,
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
            userId: String(req.user.userId),
            addressId: String(addressId),
            service: pricing.service,
            contextHash,
          },
        });

    res.json({
      success: true,
      keyId: razorpayKeyId || "rzp_test_mock_key",
      mock: MOCK_PAYMENTS,
      paymentOrder: {
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        receipt: paymentOrder.receipt,
      },
      pricing: {
        service: pricing.service,
        items: pricing.processedItems,
        subtotal: pricing.subtotal,
        deliveryCharge: pricing.deliveryCharge,
        totalAmount: pricing.totalAmount,
      },
    });
  } catch (error) {
    console.error("Razorpay create-order failed:", error);
    const message = error instanceof Error ? error.message : "Payment order creation failed";
    res.status(400).json({ message });
  }
};

const handleVerifyPayment = async (req: AuthRequest, res: any) => {
  try {
    const { addressId, items, service, payment } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: "Invalid order data" });
    }
    if (!payment) {
      return res.status(400).json({
        code: "PAYMENT_REQUIRED",
        message: "Payment verification is required",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.userId,
    });
    if (!address) {
      return res.status(400).json({ message: "Invalid address" });
    }

    const verified = await verifyPaymentForOrder({
      userId: String(req.user.userId),
      addressId: String(addressId),
      items,
      service,
      payment,
    });
    if ("error" in verified && verified.error) {
      return res.status(verified.error.status).json(verified.error);
    }

    const existingOrderForPayment = await Order.findOne({
      $or: [{ paymentId: verified.paymentId }, { paymentOrderId: verified.paymentOrderId }],
    }).select("_id");
    if (existingOrderForPayment) {
      return res.status(409).json({
        code: "PAYMENT_ALREADY_USED",
        message: "Payment already linked to an order",
      });
    }

    const payload: PaymentVerificationTokenPayload = {
      purpose: "payment_verification",
      userId: String(req.user.userId),
      addressId: String(addressId),
      service: verified.pricing.service,
      totalAmount: verified.pricing.totalAmount,
      contextHash: verified.contextHash,
      paymentId: verified.paymentId,
      paymentOrderId: verified.paymentOrderId,
      paymentSignature: verified.paymentSignature,
      paidAt: verified.paidAt,
    };

    const paymentVerificationToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "20m",
    });

    res.json({
      success: true,
      verified: true,
      mock: MOCK_PAYMENTS,
      paymentVerificationToken,
      payment: {
        paymentId: verified.paymentId,
        paymentOrderId: verified.paymentOrderId,
        paidAt: verified.paidAt,
      },
    });
  } catch (error) {
    console.error("Payment verification failed:", error);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    res.status(400).json({ code: "PAYMENT_VERIFICATION_FAILED", message });
  }
};

app.post("/payments/create-order", authMiddleware, handleCreatePaymentOrder);
app.post("/payment/create-order", authMiddleware, handleCreatePaymentOrder);
app.post("/payments/verify", authMiddleware, handleVerifyPayment);
app.post("/payment/verify", authMiddleware, handleVerifyPayment);
app.post("/payments/failure", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { addressId, items, service, paymentOrderId, paymentId, reason, totalAmount, metadata } = req.body || {};

    await PaymentAttempt.create({
      userId: req.user.userId,
      addressId: addressId || null,
      items: Array.isArray(items) ? items : [],
      service: String(service || "").trim(),
      paymentOrderId: String(paymentOrderId || "").trim() || null,
      paymentId: String(paymentId || "").trim() || null,
      totalAmount: Number(totalAmount) || 0,
      reason: String(reason || "Payment failed").trim(),
      metadata: metadata || null,
      status: "failed",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Payment failure logging failed:", error);
    res.status(500).json({ message: "Failed to log payment failure" });
  }
});
app.post("/payment/failure", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { addressId, items, service, paymentOrderId, paymentId, reason, totalAmount, metadata } = req.body || {};

    await PaymentAttempt.create({
      userId: req.user.userId,
      addressId: addressId || null,
      items: Array.isArray(items) ? items : [],
      service: String(service || "").trim(),
      paymentOrderId: String(paymentOrderId || "").trim() || null,
      paymentId: String(paymentId || "").trim() || null,
      totalAmount: Number(totalAmount) || 0,
      reason: String(reason || "Payment failed").trim(),
      metadata: metadata || null,
      status: "failed",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Payment failure logging failed:", error);
    res.status(500).json({ message: "Failed to log payment failure" });
  }
});

app.post("/orders", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { addressId, items, service, paymentVerificationToken } = req.body;
    if (!addressId) {
      return res.status(400).json({ message: "Invalid order data" });
    }
    if (!paymentVerificationToken) {
      return res.status(400).json({
        code: "PAYMENT_VERIFICATION_REQUIRED",
        message: "Payment verification token is required",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.userId,
    });
    if (!address) {
      return res.status(400).json({ message: "Invalid address" });
    }

    const pricing = calculateOrderTotals(items, service);
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

    const contextHash = buildPaymentContextHash({
      userId: String(req.user.userId),
      addressId: String(addressId),
      service: pricing.service,
      items: pricing.processedItems,
      totalAmount: pricing.totalAmount,
    });

    if (
      tokenPayload.purpose !== "payment_verification" ||
      tokenPayload.userId !== String(req.user.userId) ||
      tokenPayload.addressId !== String(addressId) ||
      tokenPayload.service !== pricing.service ||
      tokenPayload.totalAmount !== pricing.totalAmount ||
      tokenPayload.contextHash !== contextHash
    ) {
      return res.status(400).json({
        code: "PAYMENT_VERIFICATION_MISMATCH",
        message: "Payment verification does not match order details",
      });
    }

    const existingOrderForPayment = await Order.findOne({
      $or: [{ paymentId: tokenPayload.paymentId }, { paymentOrderId: tokenPayload.paymentOrderId }],
    }).select("_id");
    if (existingOrderForPayment) {
      return res.status(409).json({
        code: "PAYMENT_ALREADY_USED",
        message: "Payment already linked to an order",
      });
    }

    const order = new Order({
      userId: req.user.userId,
      addressId,
      service: pricing.service,
      items: pricing.processedItems,
      deliveryCharge: pricing.deliveryCharge,
      totalAmount: pricing.totalAmount,
      paymentId: tokenPayload.paymentId,
      paymentOrderId: tokenPayload.paymentOrderId,
      paymentSignature: tokenPayload.paymentSignature,
      paymentStatus: "paid",
      paidAt: new Date(tokenPayload.paidAt),
      status: "Scheduled",
    });

    await order.save();
    const io = req.app.get("io");
    io.emit("ordersUpdated");

    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        code: "PAYMENT_ALREADY_USED",
        message: "Payment already linked to an order",
      });
    }
    const message = error instanceof Error ? error.message : "Order creation failed";
    res.status(400).json({ code: "ORDER_CREATION_FAILED", message });
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

    const servicesList = [
      "Wash",
      "Dry Clean",
      "Express",
    ].join(", ");
    const pricingRule = "Item-wise pricing with service multipliers (wash x1.0, dry x1.25, express x1.15).";
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
      serviceTurnaround: {
        wash: SERVICE_TURNAROUND.wash,
        dry: SERVICE_TURNAROUND.dry,
        express: SERVICE_TURNAROUND.express,
      },
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
    io.to(getTicketRoom(ticketId)).emit("ticketMessage", {
      ticketId,
      message: serializedMessage,
    });
    io.to(getTicketRoom(ticketId)).emit("ticketUpdated", serializeTicket(ticket));
    io.emit("ticketsUpdated");

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
    });

    await address.save();

    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ message: "Failed to create address" });
  }
});

app.get("/admin/orders", adminMiddleware, async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json({ success: true, orders });
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
    io.to(getTicketRoom(ticketId)).emit("ticketMessage", {
      ticketId,
      message: serializedMessage,
    });
    io.to(getTicketRoom(ticketId)).emit("ticketUpdated", serializeTicket(ticket));
    io.emit("ticketsUpdated");
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
    if (!normalizedStatus) {
      return res.status(400).json({ message: "Invalid ticket status" });
    }

    const ticket = await SupportTicket.findById(req.params.id).select(
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

    io.emit("ticketsUpdated");
    io.to(getTicketRoom(String(req.params.id))).emit("ticketUpdated", serializeTicket(ticket));
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

app.put("/admin/orders/:id",adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({ success: true, order: updated });
  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
});

app.patch("/admin/orders/:id/status",adminMiddleware, async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    const { id } = req.params;

    if (!ORDER_STEPS.includes(status as (typeof ORDER_STEPS)[number])) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const user = await User.findById(updatedOrder.userId).select("pushToken");

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
        } catch (pushError) {
          console.error("Push notification failed:", pushError);
        }
      }
    }

    const io = req.app.get("io");
    io.emit("orderUpdated", updatedOrder);
    io.emit("ordersUpdated");

    res.json({ success: true, order: updatedOrder });

  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
});
app.post("/admin/orders/:id/simulate",adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const simulationDelayMs = 2500;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const currentStepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
    const remainingSteps =
      currentStepIndex >= 0 ? ORDER_STEPS.slice(currentStepIndex + 1) : ORDER_STEPS.slice(1);

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
        io.emit("orderUpdated", updatedOrder);
      }
      io.emit("ordersUpdated");
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


const PORT = Number(process.env.PORT) || 4000;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

server.listen(PORT, () => {
  console.log(`Fresh & Fold backend running on port ${PORT}`);
  console.log(
    `[payment-config] mockPayments=${MOCK_PAYMENTS} razorpayConfigured=${Boolean(
      razorpayKeyId && razorpayKeySecret
    )}`
  );
});

setInterval(() => {
  void emitOverdueTicketAlert();
}, 60 * 1000);

