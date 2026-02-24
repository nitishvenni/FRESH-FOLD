import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import Admin from "./models/Admin";
import http from "http";
import { Server } from "socket.io";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cors from "cors";
import User from "./models/User";
import Order from "./models/Order";
import Address from "./models/Address";
import { authMiddleware, AuthRequest } from "./middleware/authMiddleware";

const PRICING: Record<string, number> = {
  shirt: 30,
  tshirt: 25,
  jeans: 60,
  trousers: 45,
  dress: 90,
  jacket: 140,
  sweater: 70,
  bedsheet: 120,
  pillowcover: 35,
  towel: 40,
  curtain: 180,
  blanket: 220,
};
const SERVICE_MULTIPLIER: Record<string, number> = {
  wash: 1,
  dry: 1.4,
  express: 1.2,
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


app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Fresh & Fold Backend",
  });
});
app.post("/auth/send-otp", async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || mobile.length !== 10) {
    return res.status(400).json({ message: "Invalid mobile number" });
  }

  // Generate 4-digit OTP
 const otp = Math.floor(100000 + Math.random() * 900000).toString();


  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  let user = await User.findOne({ mobile });

  if (!user) {
    user = new User({ mobile });
  }

  user.otp = otp;
  user.otpExpires = otpExpires;

  await user.save();

  console.log(`OTP for ${mobile}: ${otp}`);

  res.json({ success: true });
});

app.post("/auth/verify-otp", async (req, res) => {
  const { mobile, otp } = req.body;
  
  if (!mobile || !otp) {
    return res.status(400).json({ message: "Mobile and OTP required" });
  }
  
  const user = await User.findOne({ mobile });
  
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }
  
  if (user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }
  
  if (user.otpExpires < new Date()) {
    return res.status(400).json({ message: "OTP expired" });
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


    let totalAmount = 0;

    const calculatedItems = items.map((item: any) => {
      const basePrice = PRICING[item.itemName] || 0;
const multiplier = SERVICE_MULTIPLIER[service] || 1;

const finalPrice = Math.round(basePrice * multiplier);
const itemTotal = finalPrice * item.quantity;


      totalAmount += itemTotal;

    return {
  ...item,
  price: finalPrice,
  itemTotal,
};

    });
let deliveryCharge = 0;

if (totalAmount < 399) {
  deliveryCharge = 40;
}

totalAmount += deliveryCharge;

  res.json({
  success: true,
  items: calculatedItems,
  deliveryCharge,
  totalAmount,
});

  } catch (error) {
    res.status(500).json({ message: "Preview failed" });
  }
});
app.post("/orders", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { addressId, items, service } = req.body;

    if (!addressId || !items || items.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    let totalAmount = 0;

    const processedItems = items.map((item: any) => {
      const basePrice = PRICING[item.itemName] || 0;
      const multiplier = SERVICE_MULTIPLIER[service] || 1;

      const finalPrice = Math.round(basePrice * multiplier);
      const itemTotal = finalPrice * item.quantity;

      totalAmount += itemTotal;

      return {
        itemName: item.itemName,
        quantity: item.quantity,
        price: finalPrice,
        itemTotal,
      };
    });

    // 🔥 Delivery Charge Logic
    let deliveryCharge = 0;

    if (totalAmount < 399) {
      deliveryCharge = 40;
    }

    totalAmount += deliveryCharge;

    const order = new Order({
      userId: req.user.userId,
      addressId,
      service,
      items: processedItems,
      deliveryCharge,
      totalAmount,
      status: "Scheduled",
    });

    await order.save();
    const io = req.app.get("io");
    io.emit("ordersUpdated");

    res.json({ success: true, order });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Order creation failed" });
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

app.post("/addresses", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fullName, phone, street, city, pincode } = req.body;

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

app.get("/admin/orders", adminMiddleware, async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json({ success: true, orders });
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
    const { status } = req.body;
    const { id } = req.params;

    const ORDER_STEPS = [
      "Scheduled",
      "Received at Facility",
      "Picked Up",
      "Washing",
      "Ironing",
      "Out for Delivery",
      "Delivered",
    ];

    if (!ORDER_STEPS.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
const io = req.app.get("io");
io.emit("ordersUpdated");

    res.json({ success: true, order: updatedOrder });

  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
});
app.post("/admin/orders/:id/simulate",adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const ORDER_STEPS = [
      "Received at Facility",
      "Picked Up",
      "Washing",
      "Ironing",
      "Out for Delivery",
      "Delivered",
    ];

    ORDER_STEPS.forEach((step, index) => {
     setTimeout(async () => {
  await Order.findByIdAndUpdate(id, {
    status: step,
  });

  const io = req.app.get("io");
  io.emit("ordersUpdated");

}, (index + 1) * 15000);
 // 15 seconds per step
    });

    res.json({ success: true, message: "Simulation started" });

  } catch (error) {
    res.status(500).json({ message: "Simulation failed" });
  }
});


const PORT = 4000;
console.log("Loaded MONGO_URI:", process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

server.listen(PORT, () => {
  console.log(`🚀 Fresh & Fold backend running on http://localhost:${PORT}`);
});
