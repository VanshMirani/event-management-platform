import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature
} from "../utils/razorpay.js";

const PAYMENT_SELECT = {
  id: true,
  bookingId: true,
  provider: true,
  providerOrderId: true,
  providerPaymentId: true,
  status: true,
  amount: true,
  currency: true,
  failureReason: true,
  paidAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true
};

const BOOKING_PAYMENT_SELECT = {
  id: true,
  bookingNumber: true,
  userId: true,
  eventId: true,
  status: true,
  quantity: true,
  totalAmount: true,
  currency: true,
  confirmedAt: true,
  expiresAt: true,
  payment: {
    select: PAYMENT_SELECT
  }
};

function toMoney(value) {
  return Number(value);
}

function toPaymentResponse(payment) {
  if (!payment) {
    return null;
  }

  return {
    ...payment,
    amount: toMoney(payment.amount)
  };
}

function toPaymentBookingResponse(booking) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    userId: booking.userId,
    eventId: booking.eventId,
    status: booking.status,
    quantity: booking.quantity,
    totalAmount: toMoney(booking.totalAmount),
    currency: booking.currency,
    confirmedAt: booking.confirmedAt,
    expiresAt: booking.expiresAt,
    payment: toPaymentResponse(booking.payment)
  };
}

function amountToSmallestUnit(amount) {
  return Math.round(Number(amount) * 100);
}

function getPaymentEntity(payload) {
  return payload?.payload?.payment?.entity ?? null;
}

function getOrderEntity(payload) {
  return payload?.payload?.order?.entity ?? null;
}

function getRazorpayFailureReason(paymentEntity) {
  return (
    paymentEntity?.error_description ??
    paymentEntity?.error_reason ??
    paymentEntity?.error_code ??
    "Payment failed"
  );
}

async function getOwnedBookingForPayment(bookingId, userId) {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId
    },
    select: BOOKING_PAYMENT_SELECT
  });

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  if (booking.status !== "PENDING") {
    throw createHttpError(400, "Only pending bookings can be paid");
  }

  return booking;
}

async function getBookingPaymentForVerification(tx, bookingId, userId) {
  const booking = await tx.booking.findFirst({
    where: {
      id: bookingId,
      userId
    },
    select: BOOKING_PAYMENT_SELECT
  });

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  return booking;
}

function ensurePaymentMatches(payment, orderId, paymentId) {
  if (!payment || payment.providerOrderId !== orderId) {
    throw createHttpError(400, "Payment order does not match booking");
  }

  if (
    payment.status === "SUCCESS" &&
    payment.providerPaymentId &&
    payment.providerPaymentId !== paymentId
  ) {
    throw createHttpError(409, "Booking is already confirmed with another payment");
  }
}

async function confirmBookingPayment(
  tx,
  { booking, orderId, paymentId, signature = null, rawPayload = null }
) {
  ensurePaymentMatches(booking.payment, orderId, paymentId);

  if (booking.payment.status === "SUCCESS") {
    return toPaymentBookingResponse(booking);
  }

  if (booking.status !== "PENDING") {
    throw createHttpError(400, "Only pending bookings can be confirmed");
  }

  const now = new Date();
  await tx.payment.update({
    where: {
      bookingId: booking.id
    },
    data: {
      providerPaymentId: paymentId,
      providerSignature: signature,
      status: "SUCCESS",
      failureReason: null,
      rawPayload,
      paidAt: now
    }
  });

  const updatedBooking = await tx.booking.update({
    where: {
      id: booking.id
    },
    data: {
      status: "CONFIRMED",
      confirmedAt: now,
      expiresAt: null
    },
    select: BOOKING_PAYMENT_SELECT
  });

  return toPaymentBookingResponse(updatedBooking);
}

async function markWebhookPaymentFailed(tx, { orderId, paymentId, reason, rawPayload }) {
  const payment = await tx.payment.findUnique({
    where: {
      providerOrderId: orderId
    },
    select: PAYMENT_SELECT
  });

  if (!payment || payment.status === "SUCCESS") {
    return false;
  }

  await tx.payment.update({
    where: {
      providerOrderId: orderId
    },
    data: {
      providerPaymentId: payment.providerPaymentId ?? paymentId,
      status: "FAILED",
      failureReason: reason,
      rawPayload
    }
  });

  return true;
}

export function getPaymentRoadmap() {
  return {
    implemented: true,
    provider: "Razorpay",
    flow: ["create order", "verify payment", "record payment", "confirm booking"]
  };
}

export async function createRazorpayOrderForBooking({ bookingId, userId }) {
  const booking = await getOwnedBookingForPayment(bookingId, userId);
  const amount = amountToSmallestUnit(booking.totalAmount);

  if (amount <= 0) {
    throw createHttpError(400, "Payment order cannot be created for zero amount");
  }

  const order = await createRazorpayOrder({
    amount,
    currency: booking.currency,
    receipt: booking.bookingNumber.slice(0, 40),
    notes: {
      bookingId: booking.id,
      userId
    }
  });

  const payment = await prisma.payment.upsert({
    where: {
      bookingId: booking.id
    },
    create: {
      bookingId: booking.id,
      provider: "razorpay",
      providerOrderId: order.id,
      status: "CREATED",
      amount: new Prisma.Decimal(booking.totalAmount),
      currency: booking.currency,
      rawPayload: order
    },
    update: {
      provider: "razorpay",
      providerOrderId: order.id,
      providerPaymentId: null,
      providerSignature: null,
      status: "CREATED",
      failureReason: null,
      amount: new Prisma.Decimal(booking.totalAmount),
      currency: booking.currency,
      rawPayload: order,
      paidAt: null
    },
    select: PAYMENT_SELECT
  });

  return {
    keyId: env.RAZORPAY_KEY_ID,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status
    },
    bookingId: booking.id,
    payment: toPaymentResponse(payment)
  };
}

export async function verifyRazorpayPayment(input, userId) {
  const isValidSignature = verifyRazorpayPaymentSignature({
    orderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature
  });

  if (!isValidSignature) {
    throw createHttpError(400, "Invalid payment signature");
  }

  const booking = await prisma.$transaction(async (tx) => {
    const pendingBooking = await getBookingPaymentForVerification(tx, input.bookingId, userId);

    return confirmBookingPayment(tx, {
      booking: pendingBooking,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
      rawPayload: input
    });
  });

  return booking;
}

export async function handleRazorpayWebhook({ rawBody, signature, payload }) {
  const isValidSignature = verifyRazorpayWebhookSignature({
    rawBody,
    signature
  });

  if (!isValidSignature) {
    throw createHttpError(401, "Invalid webhook signature");
  }

  const paymentEntity = getPaymentEntity(payload);
  const orderEntity = getOrderEntity(payload);
  const orderId = paymentEntity?.order_id ?? orderEntity?.id;
  const paymentId = paymentEntity?.id;

  if (!orderId) {
    return {
      processed: false,
      event: payload?.event ?? null
    };
  }

  if (payload?.event === "payment.captured" || payload?.event === "order.paid") {
    if (!paymentId) {
      return {
        processed: false,
        event: payload.event
      };
    }

    const booking = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: {
          providerOrderId: orderId
        },
        select: {
          ...PAYMENT_SELECT,
          booking: {
            select: BOOKING_PAYMENT_SELECT
          }
        }
      });

      if (!payment) {
        return null;
      }

      return confirmBookingPayment(tx, {
        booking: payment.booking,
        orderId,
        paymentId: paymentId ?? payment.providerPaymentId,
        rawPayload: payload
      });
    });

    return {
      processed: Boolean(booking),
      event: payload.event,
      booking
    };
  }

  if (payload?.event === "payment.failed") {
    const processed = await prisma.$transaction((tx) =>
      markWebhookPaymentFailed(tx, {
        orderId,
        paymentId,
        reason: getRazorpayFailureReason(paymentEntity),
        rawPayload: payload
      })
    );

    return {
      processed,
      event: payload.event
    };
  }

  return {
    processed: false,
    event: payload?.event ?? null
  };
}
