import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../../src/security/config";

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  MONGO_URI: "mongodb://example.test/fresh-fold",
  JWT_SECRET: "a-strong-production-jwt-secret-with-32-chars",
  HTTP_CORS_ORIGINS: "https://admin.example.com",
  SOCKET_CORS_ORIGINS: "https://admin.example.com",
  BOOKING_TIME_ZONE: "Asia/Kolkata",
  FAST2SMS_API_KEY: "fast2sms-key",
  FAST2SMS_OTP_ID: "fast2sms-otp-template",
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

  it("requires Fast2SMS delivery configuration in production even when local OTP mode is requested", () => {
    const missingFast2Sms = {
      ...validProductionEnvironment,
      FAST2SMS_API_KEY: "",
      FAST2SMS_OTP_ID: "",
      OTP_LOCAL_DEV_MODE: "true",
    };
    expect(() => validateProductionEnvironment(missingFast2Sms)).toThrow(/FAST2SMS_API_KEY.*FAST2SMS_OTP_ID/s);
  });

  it("allows an explicitly configured evaluator-only production deployment without Fast2SMS", () => {
    const demoOnly = {
      ...validProductionEnvironment,
      FAST2SMS_API_KEY: "",
      FAST2SMS_OTP_ID: "",
      OTP_DEMO_MODE: "true",
      OTP_DEMO_MOBILE: "+91 9876543210",
      OTP_DEMO_CODE: "123456",
    };
    expect(() => validateProductionEnvironment(demoOnly)).not.toThrow();
  });

  it("fails closed for invalid demo configuration and production local OTP mode", () => {
    expect(() => validateProductionEnvironment({
      ...validProductionEnvironment, OTP_DEMO_MODE: "true", OTP_DEMO_MOBILE: "invalid", OTP_DEMO_CODE: "12345",
    })).toThrow(/OTP_DEMO_MODE requires/);
    expect(() => validateProductionEnvironment({
      ...validProductionEnvironment, OTP_LOCAL_DEV_MODE: "true",
    })).toThrow(/OTP_LOCAL_DEV_MODE cannot be enabled/);
  });
});
