import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import Admin from "../models/Admin";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const mongoUri = String(process.env.MONGO_URI || "").trim();

async function resetAdmin() {
  if (!mongoUri) {
    throw new Error("Missing MONGO_URI in backend .env");
  }

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  await mongoose.connect(mongoUri);

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { email, password: hashedPassword, role: "admin" },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin credentials updated for ${admin.email}`);
}

resetAdmin()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
