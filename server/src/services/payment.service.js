import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { releaseExpiredPendingBookings } from "./booking.service.js";
import { generateTicketsForBooking } from "./ticket.service.js";
import { createHttpError } from "../utils/httpError.js";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature
} from "../utils/razorpay.js";

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

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
  },
  event: {
    select: {
      status: true,
      startsAt: true
    }
  },
  items: {
    select: {
      ticketTypeId: true,
      quantity: true
    }
  }
};

async function runSerializableTransaction(callback) {
  for (let attempt = 1; attempt <= SERIALIZABLE_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (error?.code !== "P2034" || attempt === SERIALIZABLE_TRANSACTION_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("Unable to complete payment transaction");
}

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
  const expiredBookingIds = await releaseExpiredPendingBookings({ bookingId, userId });

  if (expiredBookingIds.includes(bookingId)) {
    throw createHttpError(410, "Booking has expired");
  }

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

function ensureDemoMode() {
  if (!env.DEMO_MODE) {
    throw createHttpError(404, "Payment route not found");
  }
}

function ensureRealPaymentMode() {
  if (env.DEMO_MODE) {
    throw createHttpError(404, "Real payment routes are disabled in demo mode");
  }
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
    await generateTicketsForBooking(booking.id, tx);
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

  await generateTicketsForBooking(updatedBooking.id, tx);

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

  const updated = await tx.payment.updateMany({
    where: {
      providerOrderId: orderId,
      status: {
        not: "SUCCESS"
      }
    },
    data: {
      providerPaymentId: payment.providerPaymentId ?? paymentId,
      status: "FAILED",
      failureReason: reason,
      rawPayload
    }
  });

  return updated.count === 1;
}

export async function createRazorpayOrderForBooking({ bookingId, userId }) {
  ensureRealPaymentMode();
  let booking = await getOwnedBookingForPayment(bookingId, userId);
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

  booking = await getOwnedBookingForPayment(bookingId, userId);

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

export async function confirmDemoBooking({ bookingId, userId }) {
  ensureDemoMode();
  const expiredBookingIds = await releaseExpiredPendingBookings({ bookingId, userId });

  if (expiredBookingIds.includes(bookingId)) {
    throw createHttpError(410, "Booking has expired");
  }

  const result = await runSerializableTransaction(async (tx) => {
    const booking = await getBookingPaymentForVerification(tx, bookingId, userId);

    if (
      booking.status === "CONFIRMED" &&
      booking.payment?.status === "SUCCESS" &&
      ["demo", "free"].includes(booking.payment.provider)
    ) {
      await generateTicketsForBooking(booking.id, tx);
      return {
        booking: toPaymentBookingResponse(booking),
        reason: null
      };
    }

    if (booking.status !== "PENDING") {
      return {
        booking: null,
        reason: "not_pending"
      };
    }

    const now = new Date();

    if (booking.expiresAt && booking.expiresAt <= now) {
      return {
        booking: null,
        reason: "expired"
      };
    }

    if (booking.event.status !== "PUBLISHED" || booking.event.startsAt <= now) {
      const cancelled = await tx.booking.updateMany({
        where: {
          id: booking.id,
          userId,
          status: "PENDING"
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now
        }
      });

      if (cancelled.count === 1) {
        for (const item of booking.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              availableQuantity: {
                increment: item.quantity
              }
            }
          });
        }

        await tx.payment.updateMany({
          where: {
            bookingId: booking.id,
            status: {
              not: "SUCCESS"
            }
          },
          data: {
            status: "FAILED",
            failureReason: "Event is no longer available"
          }
        });
      }

      return {
        booking: null,
        reason: "event_unavailable"
      };
    }

    const claimed = await tx.booking.updateMany({
      where: {
        id: booking.id,
        userId,
        status: "PENDING",
        event: {
          is: {
            status: "PUBLISHED",
            startsAt: {
              gt: now
            }
          }
        },
        OR: [
          { expiresAt: null },
          {
            expiresAt: {
              gt: now
            }
          }
        ]
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        expiresAt: null
      }
    });

    if (claimed.count !== 1) {
      return {
        booking: null,
        reason: "conflict"
      };
    }

    const isFreeBooking = Number(booking.totalAmount) === 0;
    const provider = isFreeBooking ? "free" : "demo";
    const providerPaymentId = `${provider}_${randomUUID()}`;

    await tx.payment.upsert({
      where: {
        bookingId: booking.id
      },
      create: {
        bookingId: booking.id,
        provider,
        providerPaymentId,
        status: "SUCCESS",
        amount: new Prisma.Decimal(booking.totalAmount),
        currency: booking.currency,
        rawPayload: {
          demoMode: true,
          noCharge: true,
          freeBooking: isFreeBooking
        },
        paidAt: now
      },
      update: {
        provider,
        providerOrderId: null,
        providerPaymentId,
        providerSignature: null,
        status: "SUCCESS",
        failureReason: null,
        amount: new Prisma.Decimal(booking.totalAmount),
        currency: booking.currency,
        rawPayload: {
          demoMode: true,
          noCharge: true,
          freeBooking: isFreeBooking
        },
        paidAt: now
      }
    });

    const updatedBooking = await tx.booking.findUnique({
      where: {
        id: booking.id
      },
      select: BOOKING_PAYMENT_SELECT
    });

    await generateTicketsForBooking(updatedBooking.id, tx);

    return {
      booking: toPaymentBookingResponse(updatedBooking),
      reason: null
    };
  });

  if (result.reason === "expired") {
    await releaseExpiredPendingBookings({ bookingId, userId });
    throw createHttpError(410, "Booking has expired");
  }

  if (result.reason === "event_unavailable") {
    throw createHttpError(409, "Event is no longer available");
  }

  if (!result.booking) {
    throw createHttpError(409, "Booking is no longer available for confirmation");
  }

  return result.booking;
}

export async function verifyRazorpayPayment(input, userId) {
  ensureRealPaymentMode();
  const isValidSignature = verifyRazorpayPaymentSignature({
    orderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature
  });

  if (!isValidSignature) {
    throw createHttpError(400, "Invalid payment signature");
  }

  const expiredBookingIds = await releaseExpiredPendingBookings({
    bookingId: input.bookingId,
    userId
  });

  if (expiredBookingIds.includes(input.bookingId)) {
    throw createHttpError(410, "Booking has expired");
  }

  const result = await prisma.$transaction(async (tx) => {
    const pendingBooking = await getBookingPaymentForVerification(tx, input.bookingId, userId);

    if (
      pendingBooking.status === "PENDING" &&
      pendingBooking.expiresAt &&
      pendingBooking.expiresAt <= new Date()
    ) {
      return {
        expired: true,
        booking: null
      };
    }

    return {
      expired: false,
      booking: await confirmBookingPayment(tx, {
        booking: pendingBooking,
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
        rawPayload: input
      })
    };
  });

  if (result.expired) {
    await releaseExpiredPendingBookings({ bookingId: input.bookingId, userId });
    throw createHttpError(410, "Booking has expired");
  }

  return result.booking;
}

export async function handleRazorpayWebhook({ rawBody, signature, payload }) {
  ensureRealPaymentMode();
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

    const linkedPayment = await prisma.payment.findUnique({
      where: {
        providerOrderId: orderId
      },
      select: {
        bookingId: true,
        booking: {
          select: {
            status: true,
            expiresAt: true
          }
        }
      }
    });

    if (
      linkedPayment?.booking.status === "PENDING" &&
      linkedPayment.booking.expiresAt &&
      linkedPayment.booking.expiresAt <= new Date()
    ) {
      await releaseExpiredPendingBookings({ bookingId: linkedPayment.bookingId });

      return {
        processed: false,
        event: payload.event,
        booking: null,
        reason: "booking_expired"
      };
    }

    const result = await prisma.$transaction(async (tx) => {
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
        return {
          expired: false,
          booking: null
        };
      }

      if (
        payment.booking.status === "PENDING" &&
        payment.booking.expiresAt &&
        payment.booking.expiresAt <= new Date()
      ) {
        return {
          expired: true,
          booking: null,
          bookingId: payment.booking.id
        };
      }

      return {
        expired: false,
        booking: await confirmBookingPayment(tx, {
          booking: payment.booking,
          orderId,
          paymentId: paymentId ?? payment.providerPaymentId,
          rawPayload: payload
        })
      };
    });

    if (result.expired) {
      await releaseExpiredPendingBookings({ bookingId: result.bookingId });

      return {
        processed: false,
        event: payload.event,
        booking: null,
        reason: "booking_expired"
      };
    }

    return {
      processed: Boolean(result.booking),
      event: payload.event,
      booking: result.booking
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
