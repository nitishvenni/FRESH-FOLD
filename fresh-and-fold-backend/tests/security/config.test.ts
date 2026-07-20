import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../../src/security/config";

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  MONGO_URI: "mongodb://example.test/fresh-fold",
  JWT_SECRET: "a-strong-production-jwt-secret-with-32-chars",
  HTTP_CORS_ORIGINS: "https://admin.example.com",
  SOCKET_CORS_ORIGINS: "https://admin.example.com",
  BOOKING_TIME_ZONE: "Asia/Kolkata",
  MSG91_AUTH_KEY: "msg91-key",
  MSG91_TEMPLATE_ID: "template-id",
  RAZORPAY_KEY_ID: "rzp_live_test",
  RAZORPAY_KEY_SECRET: "razorpay-secret",
  RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
  AI_PROVIDER: "gemini",
  GEMINI_API_KEY: "gemini-key",
  GEMINI_VISION_MODEL: "gemini-vision",
  GEMINI_TEXT_MODEL: "gemini-text",
};

describe("production environment validation", () => {
  it("accepts a complete production configuration without exposing values", () => {
    expect(() => validateProductionEnvironment(validProductionEnvironment)).not.toThrow();
  });

  it("fails fast when security-critical configuration is missing", () => {
    expect(() => validateProductionEnvironment({ NODE_ENV: "production" })).toThrow(/MONGO_URI.*JWT_SECRET.*HTTP_CORS_ORIGINS/s);
  });

  it("requires only the selected AI provider configuration", () => {
    const openAi = {
      ...validProductionEnvironment,
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "openai-key",
      AI_VISION_MODEL: "gpt-vision",
      AI_TEXT_MODEL: "gpt-text",
      GEMINI_API_KEY: "",
      GEMINI_VISION_MODEL: "",
      GEMINI_TEXT_MODEL: "",
    };
    expect(() => validateProductionEnvironment(openAi)).not.toThrow();
  });
});
