import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { releaseExpiredPendingBookings } from "./booking.service.js";
import { generateTicketsForBooking } from "./ticket.service.js";
import { createHttpError } from "../utils/httpError.js";
import {
  assertRazorpayTestCredentials,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature
} from "../utils/razorpay.js";

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;
const RAZORPAY_ORDER_TRANSACTION_TIMEOUT_MS = 30_000;
const EVENT_UNAVAILABLE_REASON = "Event is no longer available";

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

const PAYMENT_WITH_RAW_PAYLOAD_SELECT = {
  ...PAYMENT_SELECT,
  rawPayload: true
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
    select: PAYMENT_WITH_RAW_PAYLOAD_SELECT
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

  const { rawPayload: _rawPayload, ...safePayment } = payment;

  return {
    ...safePayment,
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

function isEventUnavailable(booking, now) {
  return booking.event.status !== "PUBLISHED" || booking.event.startsAt <= now;
}

async function cancelPendingBookingForUnavailableEvent(tx, booking, now) {
  if (!isEventUnavailable(booking, now)) {
    return false;
  }

  const cancelled = await tx.booking.updateMany({
    where: {
      id: booking.id,
      status: "PENDING",
      event: {
        is: {
          OR: [
            {
              status: {
                not: "PUBLISHED"
              }
            },
            {
              startsAt: {
                lte: now
              }
            }
          ]
        }
      }
    },
    data: {
      status: "CANCELLED",
      cancelledAt: now
    }
  });

  if (cancelled.count !== 1) {
    return false;
  }

  for (const item of booking.items) {
    await tx.ticketType.update({
      where: {
        id: item.ticketTypeId
      },
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
      failureReason: EVENT_UNAVAILABLE_REASON
    }
  });

  return true;
}

function isReusableRazorpayOrder(booking) {
  return Boolean(
    booking.payment?.provider === "razorpay" &&
      booking.payment.status === "CREATED" &&
      booking.payment.providerOrderId &&
      Number(booking.payment.amount) === Number(booking.totalAmount) &&
      booking.payment.currency === booking.currency
  );
}

function toRazorpayOrderResponse(booking) {
  const rawOrder =
    booking.payment?.rawPayload &&
    typeof booking.payment.rawPayload === "object" &&
    !Array.isArray(booking.payment.rawPayload)
      ? booking.payment.rawPayload
      : {};

  return {
    id: booking.payment.providerOrderId,
    amount: amountToSmallestUnit(booking.totalAmount),
    currency: booking.currency,
    receipt:
      typeof rawOrder.receipt === "string"
        ? rawOrder.receipt
        : booking.bookingNumber.slice(0, 40),
    status: typeof rawOrder.status === "string" ? rawOrder.status : "created"
  };
}

function toRazorpayOrderResult(booking, reused) {
  return {
    keyId: env.RAZORPAY_KEY_ID,
    order: toRazorpayOrderResponse(booking),
    bookingId: booking.id,
    payment: toPaymentResponse(booking.payment),
    reused
  };
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
    if (booking.status !== "CONFIRMED") {
      throw createHttpError(409, "Payment is successful but booking is not confirmed");
    }

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

  if (isEventUnavailable(booking, now)) {
    await cancelPendingBookingForUnavailableEvent(tx, booking, now);
    return {
      booking: null,
      reason: "event_unavailable"
    };
  }

  const claimed = await tx.booking.updateMany({
    where: {
      id: booking.id,
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
        {
          expiresAt: null
        },
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
    const latestBooking = await tx.booking.findUnique({
      where: {
        id: booking.id
      },
      select: BOOKING_PAYMENT_SELECT
    });

    if (
      latestBooking?.status === "PENDING" &&
      isEventUnavailable(latestBooking, now)
    ) {
      await cancelPendingBookingForUnavailableEvent(tx, latestBooking, now);
      return {
        booking: null,
        reason: "event_unavailable"
      };
    }

    if (
      latestBooking?.status === "PENDING" &&
      latestBooking.expiresAt &&
      latestBooking.expiresAt <= now
    ) {
      return {
        booking: null,
        reason: "expired"
      };
    }

    return {
      booking: null,
      reason: "conflict"
    };
  }

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

async function handleRazorpayOrderFailure(reason, { bookingId, userId }) {
  if (!reason) {
    return;
  }

  if (reason === "expired") {
    await releaseExpiredPendingBookings({ bookingId, userId });
    throw createHttpError(410, "Booking has expired");
  }

  if (reason === "event_unavailable") {
    throw createHttpError(409, EVENT_UNAVAILABLE_REASON);
  }

  if (reason === "zero_amount") {
    throw createHttpError(400, "Payment order cannot be created for zero amount");
  }

  throw createHttpError(400, "Only pending bookings can be paid");
}

async function inspectBookingForRazorpayOrder(tx, { bookingId, userId }) {
  const booking = await getBookingPaymentForVerification(tx, bookingId, userId);

  if (booking.status !== "PENDING") {
    return {
      booking: null,
      reason: "not_pending",
      reused: false
    };
  }

  const now = new Date();
  if (booking.expiresAt && booking.expiresAt <= now) {
    return {
      booking: null,
      reason: "expired",
      reused: false
    };
  }

  if (isEventUnavailable(booking, now)) {
    await cancelPendingBookingForUnavailableEvent(tx, booking, now);
    return {
      booking: null,
      reason: "event_unavailable",
      reused: false
    };
  }

  if (amountToSmallestUnit(booking.totalAmount) <= 0) {
    return {
      booking: null,
      reason: "zero_amount",
      reused: false
    };
  }

  return {
    booking,
    reason: null,
    reused: isReusableRazorpayOrder(booking)
  };
}

async function lockBookingAndEventForRazorpayOrder(tx, { bookingId, userId }) {
  const lockedBookings = await tx.$queryRaw`
    SELECT "eventId"
    FROM "Booking"
    WHERE "id" = ${bookingId} AND "userId" = ${userId}
    FOR UPDATE
  `;

  if (lockedBookings.length === 0) {
    throw createHttpError(404, "Booking not found");
  }

  await tx.$queryRaw`
    SELECT "id"
    FROM "Event"
    WHERE "id" = ${lockedBookings[0].eventId}
    FOR SHARE
  `;
}

async function storeRazorpayOrderPayment(
  tx,
  { booking, order, status = "CREATED", failureReason = null }
) {
  await tx.payment.upsert({
    where: {
      bookingId: booking.id
    },
    create: {
      bookingId: booking.id,
      provider: "razorpay",
      providerOrderId: order.id,
      status,
      failureReason,
      amount: new Prisma.Decimal(booking.totalAmount),
      currency: booking.currency,
      rawPayload: order
    },
    update: {
      provider: "razorpay",
      providerOrderId: order.id,
      providerPaymentId: null,
      providerSignature: null,
      status,
      failureReason,
      amount: new Prisma.Decimal(booking.totalAmount),
      currency: booking.currency,
      rawPayload: order,
      paidAt: null
    }
  });
}

export async function createRazorpayOrderForBooking({ bookingId, userId }) {
  assertRazorpayTestCredentials();
  const expiredBookingIds = await releaseExpiredPendingBookings({ bookingId, userId });

  if (expiredBookingIds.includes(bookingId)) {
    throw createHttpError(410, "Booking has expired");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      await lockBookingAndEventForRazorpayOrder(tx, { bookingId, userId });
      let inspected = await inspectBookingForRazorpayOrder(tx, { bookingId, userId });

      if (inspected.reason || inspected.reused) {
        return inspected;
      }

      const orderBooking = inspected.booking;
      const order = await createRazorpayOrder({
        amount: amountToSmallestUnit(orderBooking.totalAmount),
        currency: orderBooking.currency,
        receipt: orderBooking.bookingNumber.slice(0, 40),
        notes: {
          bookingId: orderBooking.id,
          userId
        }
      });

      if (!order?.id) {
        throw createHttpError(502, "Razorpay returned an invalid order");
      }

      inspected = await inspectBookingForRazorpayOrder(tx, { bookingId, userId });
      if (inspected.reason === "event_unavailable") {
        await storeRazorpayOrderPayment(tx, {
          booking: orderBooking,
          order,
          status: "FAILED",
          failureReason: EVENT_UNAVAILABLE_REASON
        });
        return inspected;
      }

      if (inspected.reason === "expired") {
        await storeRazorpayOrderPayment(tx, {
          booking: orderBooking,
          order,
          status: "FAILED",
          failureReason: "Booking expired"
        });
        return inspected;
      }

      if (inspected.reason || inspected.reused) {
        return inspected;
      }

      await storeRazorpayOrderPayment(tx, {
        booking: inspected.booking,
        order
      });

      const booking = await getBookingPaymentForVerification(tx, bookingId, userId);
      return {
        booking,
        reason: null,
        reused: false
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: RAZORPAY_ORDER_TRANSACTION_TIMEOUT_MS
    }
  );

  await handleRazorpayOrderFailure(result.reason, { bookingId, userId });
  return toRazorpayOrderResult(result.booking, result.reused);
}

async function confirmBookingWithoutPayment({ bookingId, userId }) {
  const expiredBookingIds = await releaseExpiredPendingBookings({ bookingId, userId });

  if (expiredBookingIds.includes(bookingId)) {
    throw createHttpError(410, "Booking has expired");
  }

  const result = await runSerializableTransaction(async (tx) => {
    const booking = await getBookingPaymentForVerification(tx, bookingId, userId);
    const isFreeBooking = Number(booking.totalAmount) === 0;

    if (
      booking.status === "CONFIRMED" &&
      booking.payment?.status === "SUCCESS" &&
      booking.payment.provider === "free"
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

    if (!isFreeBooking) {
      return {
        booking: null,
        reason: "payment_required"
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
      await cancelPendingBookingForUnavailableEvent(tx, booking, now);

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
      const latestBooking = await tx.booking.findUnique({
        where: {
          id: booking.id
        },
        select: BOOKING_PAYMENT_SELECT
      });

      if (
        latestBooking?.status === "PENDING" &&
        isEventUnavailable(latestBooking, now)
      ) {
        await cancelPendingBookingForUnavailableEvent(tx, latestBooking, now);
        return {
          booking: null,
          reason: "event_unavailable"
        };
      }

      if (
        latestBooking?.status === "PENDING" &&
        latestBooking.expiresAt &&
        latestBooking.expiresAt <= now
      ) {
        return {
          booking: null,
          reason: "expired"
        };
      }

      return {
        booking: null,
        reason: "conflict"
      };
    }

    const providerPaymentId = `free_${randomUUID()}`;

    await tx.payment.upsert({
      where: {
        bookingId: booking.id
      },
      create: {
        bookingId: booking.id,
        provider: "free",
        providerPaymentId,
        status: "SUCCESS",
        amount: new Prisma.Decimal(booking.totalAmount),
        currency: booking.currency,
        rawPayload: {
          noCharge: true,
          freeBooking: true
        },
        paidAt: now
      },
      update: {
        provider: "free",
        providerOrderId: null,
        providerPaymentId,
        providerSignature: null,
        status: "SUCCESS",
        failureReason: null,
        amount: new Prisma.Decimal(booking.totalAmount),
        currency: booking.currency,
        rawPayload: {
          noCharge: true,
          freeBooking: true
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

  if (result.reason === "payment_required") {
    throw createHttpError(400, "Payment is required for this booking");
  }

  if (!result.booking) {
    throw createHttpError(409, "Booking is no longer available for confirmation");
  }

  return result.booking;
}

export async function confirmFreeBooking(input) {
  return confirmBookingWithoutPayment(input);
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

  const expiredBookingIds = await releaseExpiredPendingBookings({
    bookingId: input.bookingId,
    userId
  });

  if (expiredBookingIds.includes(input.bookingId)) {
    throw createHttpError(410, "Booking has expired");
  }

  const result = await runSerializableTransaction(async (tx) => {
    const pendingBooking = await getBookingPaymentForVerification(tx, input.bookingId, userId);
    const confirmation = await confirmBookingPayment(tx, {
      booking: pendingBooking,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
      rawPayload: input
    });

    return {
      ...confirmation,
      bookingId: pendingBooking.id
    };
  });

  if (result.reason === "expired") {
    await releaseExpiredPendingBookings({ bookingId: input.bookingId, userId });
    throw createHttpError(410, "Booking has expired");
  }

  if (result.reason === "event_unavailable") {
    throw createHttpError(409, EVENT_UNAVAILABLE_REASON);
  }

  if (!result.booking) {
    throw createHttpError(409, "Booking is no longer available for confirmation");
  }

  return result.booking;
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

    const result = await runSerializableTransaction(async (tx) => {
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
          booking: null,
          bookingId: null,
          reason: "payment_not_found"
        };
      }

      const confirmation = await confirmBookingPayment(tx, {
        booking: payment.booking,
        orderId,
        paymentId: paymentId ?? payment.providerPaymentId,
        rawPayload: payload
      });

      return {
        ...confirmation,
        bookingId: payment.booking.id
      };
    });

    if (result.reason === "expired") {
      await releaseExpiredPendingBookings({ bookingId: result.bookingId });

      return {
        processed: false,
        event: payload.event,
        booking: null,
        reason: "booking_expired"
      };
    }

    if (result.reason === "event_unavailable") {
      return {
        processed: false,
        event: payload.event,
        booking: null,
        reason: "event_unavailable"
      };
    }

    return {
      processed: Boolean(result.booking),
      event: payload.event,
      booking: result.booking,
      ...(result.reason ? { reason: result.reason } : {})
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
