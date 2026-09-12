import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  NODE_ENV: nodeEnv,
  PORT: toNumber(process.env.PORT, 5000),
  DATABASE_URL: process.env.DATABASE_URL,
  CLIENT_ORIGIN:
    process.env.CLIENT_ORIGIN ?? (nodeEnv === "production" ? undefined : "http://localhost:5173"),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  DEMO_MODE: toBoolean(process.env.DEMO_MODE),
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET
};
