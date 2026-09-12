import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  NODE_ENV: nodeEnv,
  PORT: toNumber(process.env.PORT, 5000),
  DATABASE_URL: process.env.DATABASE_URL,
  CLIENT_ORIGIN:
    process.env.CLIENT_ORIGIN ?? (nodeEnv === "production" ? undefined : "http://localhost:5173"),
  PUBLIC_APP_URL:
    process.env.PUBLIC_APP_URL ??
    (nodeEnv === "production"
      ? "https://eventflow-event-management.vercel.app"
      : "http://localhost:5173"),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET
};
