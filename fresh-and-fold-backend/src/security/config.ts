import { getAiConfig } from "../ai/config";
import { getOtpDemoConfiguration, isOtpDemoModeRequested } from "../auth/otpDemo";
import { getHttpCorsOrigins } from "./http";
import { getSocketCorsOrigins } from "../realtime/socketSecurity";

type ProductionEnvironment = NodeJS.ProcessEnv;

const required = (environment: ProductionEnvironment, name: string, issues: string[]) => {
  if (!String(environment[name] || "").trim()) issues.push(`${name} is required in production`);
};

const validTimeZone = (value: string | undefined) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value || "Asia/Kolkata" }).format();
    return true;
  } catch {
    return false;
  }
};

/** Fails before listening when production security-critical configuration is absent. */
export const validateProductionEnvironment = (environment: ProductionEnvironment = process.env) => {
  if (environment.NODE_ENV !== "production") return;

  const issues: string[] = [];
  required(environment, "MONGO_URI", issues);
  required(environment, "JWT_SECRET", issues);
  if (String(environment.JWT_SECRET || "").trim().length < 32) {
    issues.push("JWT_SECRET must be at least 32 characters in production");
  }
  if (String(environment.OTP_LOCAL_DEV_MODE || "").toLowerCase() === "true") {
    issues.push("OTP_LOCAL_DEV_MODE cannot be enabled in production");
  }
  const demoModeRequested = isOtpDemoModeRequested(environment);
  const demoConfiguration = getOtpDemoConfiguration(environment);
  if (demoModeRequested && !demoConfiguration) {
    issues.push("OTP_DEMO_MODE requires a valid OTP_DEMO_MOBILE and six-digit OTP_DEMO_CODE in production");
  }
  if (!demoModeRequested) {
    required(environment, "FAST2SMS_API_KEY", issues);
    required(environment, "FAST2SMS_OTP_ID", issues);
  }

  try {
    getHttpCorsOrigins({
      NODE_ENV: environment.NODE_ENV,
      HTTP_CORS_ORIGINS: environment.HTTP_CORS_ORIGINS,
    });
  } catch (error) { issues.push(error instanceof Error ? error.message : "HTTP_CORS_ORIGINS is invalid"); }
  try {
    getSocketCorsOrigins({
      NODE_ENV: environment.NODE_ENV,
      SOCKET_CORS_ORIGINS: environment.SOCKET_CORS_ORIGINS,
    });
  } catch (error) { issues.push(error instanceof Error ? error.message : "SOCKET_CORS_ORIGINS is invalid"); }

  if (!validTimeZone(environment.BOOKING_TIME_ZONE)) {
    issues.push("BOOKING_TIME_ZONE must be a valid IANA timezone");
  }

  if (String(environment.MOCK_PAYMENTS || "").toLowerCase() !== "true") {
    required(environment, "RAZORPAY_KEY_ID", issues);
    required(environment, "RAZORPAY_KEY_SECRET", issues);
    required(environment, "RAZORPAY_WEBHOOK_SECRET", issues);
  }

  const ai = getAiConfig(environment);
  if (ai.provider === "openai") {
    if (!ai.openai.apiKey || !ai.openai.visionModel || !ai.openai.textModel) {
      issues.push("OpenAI API key, vision model, and text model are required for AI_PROVIDER=openai in production");
    }
  } else if (ai.provider === "gemini") {
    if (!ai.gemini.apiKey || !ai.gemini.visionModel || !ai.gemini.textModel) {
      issues.push("Gemini API key, vision model, and text model are required for AI_PROVIDER=gemini in production");
    }
  } else {
    issues.push("AI_PROVIDER must be openai or gemini in production");
  }

  if (issues.length > 0) {
    throw new Error(`Invalid production environment: ${issues.join("; ")}`);
  }
};
