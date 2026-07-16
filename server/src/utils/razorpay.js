import crypto from "node:crypto";
import { env } from "../config/env.js";
import { createHttpError } from "./httpError.js";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

function requireRazorpayCredentials() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw createHttpError(500, "Razorpay is not configured");
  }
}

function requireWebhookSecret() {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw createHttpError(500, "Razorpay webhook is not configured");
  }
}

function createSignature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function createRazorpayOrder({ amount, currency, receipt, notes }) {
  requireRazorpayCredentials();

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
    "base64"
  );
  const response = await fetch(RAZORPAY_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
      payment_capture: 1
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw createHttpError(
      502,
      payload?.error?.description ?? "Unable to create Razorpay order"
    );
  }

  return payload;
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
  secret = env.RAZORPAY_KEY_SECRET
}) {
  const actualSecret = secret ?? env.RAZORPAY_KEY_SECRET;

  if (!actualSecret) {
    throw createHttpError(500, "Razorpay is not configured");
  }

  const expectedSignature = createSignature(`${orderId}|${paymentId}`, actualSecret);
  return timingSafeEqual(expectedSignature, signature);
}

export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
  secret = env.RAZORPAY_WEBHOOK_SECRET
}) {
  const actualSecret = secret ?? env.RAZORPAY_WEBHOOK_SECRET;

  if (!actualSecret) {
    requireWebhookSecret();
  }

  if (!rawBody || !signature) {
    return false;
  }

  const expectedSignature = createSignature(rawBody, actualSecret);
  return timingSafeEqual(expectedSignature, signature);
}
