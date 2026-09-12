import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";

const BOOKING_EXPIRY_MINUTES = 10;
const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

const BOOKING_SELECT = {
  id: true,
  bookingNumber: true,
  userId: true,
  eventId: true,
  status: true,
  quantity: true,
  subtotalAmount: true,
  discountAmount: true,
  totalAmount: true,
  currency: true,
  expiresAt: true,
  confirmedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      startsAt: true,
      endsAt: true,
      venueName: true,
      address: true,
      city: true,
      state: true,
      onlineUrl: true,
      country: true
    }
  },
  payment: {
    select: {
      provider: true,
      status: true
    }
  },
  items: {
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      bookingId: true,
      ticketTypeId: true,
      quantity: true,
      unitPrice: true,
      totalAmount: true,
      createdAt: true,
      updatedAt: true,
      ticketType: {
        select: {
          id: true,
          name: true,
          description: true,
          currency: true
        }
      }
    }
  }
};

function createBookingNumber() {
  return `BK-${randomUUID()}`;
}

function toMoney(value) {
  return Number(value);
}

function toBookingItemResponse(item) {
  return {
    id: item.id,
    bookingId: item.bookingId,
    ticketTypeId: item.ticketTypeId,
    quantity: item.quantity,
    unitPrice: toMoney(item.unitPrice),
    totalAmount: toMoney(item.totalAmount),
    ticketType: item.ticketType,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function toBookingResponse(booking) {
  const event = booking.event
    ? {
        ...booking.event,
        onlineUrl: booking.status === "CONFIRMED" ? booking.event.onlineUrl : null
      }
    : null;

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    userId: booking.userId,
    eventId: booking.eventId,
    status: booking.status,
    quantity: booking.quantity,
    subtotalAmount: toMoney(booking.subtotalAmount),
    discountAmount: toMoney(booking.discountAmount),
    totalAmount: toMoney(booking.totalAmount),
    currency: booking.currency,
    expiresAt: booking.expiresAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    event,
    payment: booking.payment,
    items: booking.items.map(toBookingItemResponse),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

function mapBookingList(bookings) {
  return bookings.map(toBookingResponse);
}

function activeBookingWhere(now) {
  return {
    OR: [
      { status: "CONFIRMED" },
      { status: "PENDING", expiresAt: null },
      {
        status: "PENDING",
        expiresAt: {
          gt: now
        }
      }
    ]
  };
}

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

  throw new Error("Unable to complete booking transaction");
}

async function releaseExpiredPendingBookingsInTransaction(
  tx,
  { bookingId, userId, eventId, ticketTypeId, now }
) {
  const expiredBookings = await tx.booking.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lte: now
      },
      ...(bookingId ? { id: bookingId } : {}),
      ...(userId ? { userId } : {}),
      ...(eventId ? { eventId } : {}),
      ...(ticketTypeId
        ? {
            items: {
              some: {
                ticketTypeId
              }
            }
          }
        : {})
    },
    select: {
      id: true,
      items: {
        select: {
          ticketTypeId: true,
          quantity: true
        }
      }
    }
  });

  const releasedBookingIds = [];

  for (const booking of expiredBookings) {
    const claimed = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: "PENDING",
        expiresAt: {
          lte: now
        }
      },
      data: {
        status: "CANCELLED",
        cancelledAt: now
      }
    });

    if (claimed.count !== 1) {
      continue;
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
        failureReason: "Booking expired"
      }
    });

    releasedBookingIds.push(booking.id);
  }

  return releasedBookingIds;
}

export async function releaseExpiredPendingBookings({
  bookingId,
  userId,
  eventId,
  ticketTypeId,
  now = new Date()
} = {}) {
  return prisma.$transaction((tx) =>
    releaseExpiredPendingBookingsInTransaction(tx, {
      bookingId,
      userId,
      eventId,
      ticketTypeId,
      now
    })
  );
}

function ensureTicketSalesAreOpen(ticketType, now) {
  if (ticketType.salesStartAt && ticketType.salesStartAt > now) {
    throw createHttpError(400, "Ticket sales have not started");
  }

  if (ticketType.salesEndAt && ticketType.salesEndAt < now) {
    throw createHttpError(400, "Ticket sales have ended");
  }
}

async function getBookableEvent(tx, eventId, now) {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      capacity: true
    }
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  if (event.status !== "PUBLISHED") {
    throw createHttpError(400, "Event is not available for booking");
  }

  if (event.startsAt <= now || event.endsAt <= now) {
    throw createHttpError(400, "Event has already started or ended");
  }

  return event;
}

async function getBookableTicketType(tx, { eventId, ticketTypeId, quantity, now }) {
  const ticketType = await tx.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: {
      id: true,
      eventId: true,
      isActive: true,
      price: true,
      currency: true,
      totalQuantity: true,
      availableQuantity: true,
      maxPerBooking: true,
      salesStartAt: true,
      salesEndAt: true
    }
  });

  if (!ticketType) {
    throw createHttpError(404, "Ticket type not found");
  }

  if (ticketType.eventId !== eventId) {
    throw createHttpError(400, "Ticket type does not belong to this event");
  }

  if (!ticketType.isActive) {
    throw createHttpError(400, "Ticket type is not active");
  }

  ensureTicketSalesAreOpen(ticketType, now);

  if (quantity > ticketType.maxPerBooking) {
    throw createHttpError(400, "Quantity exceeds maxPerUser");
  }

  if (ticketType.availableQuantity < quantity) {
    throw createHttpError(409, "Requested quantity is not available");
  }

  return ticketType;
}

async function ensureCumulativeUserLimit(
  tx,
  { userId, ticketTypeId, quantity, maxPerUser, now }
) {
  const existing = await tx.bookingItem.aggregate({
    where: {
      ticketTypeId,
      booking: {
        userId,
        ...activeBookingWhere(now)
      }
    },
    _sum: {
      quantity: true
    }
  });
  const existingQuantity = existing._sum.quantity ?? 0;

  if (existingQuantity + quantity > maxPerUser) {
    throw createHttpError(400, "Cumulative quantity exceeds maxPerUser");
  }
}

async function ensureEventHasCapacity(tx, { event, quantity, now }) {
  if (event.capacity === null) {
    return;
  }

  const allocated = await tx.booking.aggregate({
    where: {
      eventId: event.id,
      ...activeBookingWhere(now)
    },
    _sum: {
      quantity: true
    }
  });
  const allocatedQuantity = allocated._sum.quantity ?? 0;

  if (allocatedQuantity + quantity > event.capacity) {
    throw createHttpError(409, "Event capacity is not available");
  }
}

async function reserveTicketQuantity(tx, { eventId, ticketTypeId, quantity, now }) {
  const result = await tx.ticketType.updateMany({
    where: {
      id: ticketTypeId,
      eventId,
      isActive: true,
      availableQuantity: {
        gte: quantity
      },
      AND: [
        {
          OR: [
            {
              salesStartAt: null
            },
            {
              salesStartAt: {
                lte: now
              }
            }
          ]
        },
        {
          OR: [
            {
              salesEndAt: null
            },
            {
              salesEndAt: {
                gte: now
              }
            }
          ]
        }
      ]
    },
    data: {
      availableQuantity: {
        decrement: quantity
      }
    }
  });

  if (result.count !== 1) {
    throw createHttpError(409, "Requested quantity is not available");
  }
}

export async function createPendingBooking(input, userId) {
  const now = new Date();
  await releaseExpiredPendingBookings({
    eventId: input.eventId,
    ticketTypeId: input.ticketTypeId,
    now
  });

  return runSerializableTransaction(async (tx) => {
    const event = await getBookableEvent(tx, input.eventId, now);
    const ticketType = await getBookableTicketType(tx, {
      ...input,
      now
    });

    await ensureCumulativeUserLimit(tx, {
      userId,
      ticketTypeId: ticketType.id,
      quantity: input.quantity,
      maxPerUser: ticketType.maxPerBooking,
      now
    });
    await ensureEventHasCapacity(tx, {
      event,
      quantity: input.quantity,
      now
    });

    await reserveTicketQuantity(tx, {
      eventId: input.eventId,
      ticketTypeId: ticketType.id,
      quantity: input.quantity,
      now
    });

    const subtotalAmount = new Prisma.Decimal(ticketType.price).mul(input.quantity);
    const expiresAt = new Date(now.getTime() + BOOKING_EXPIRY_MINUTES * 60 * 1000);

    const booking = await tx.booking.create({
      data: {
        bookingNumber: createBookingNumber(),
        userId,
        eventId: input.eventId,
        status: "PENDING",
        quantity: input.quantity,
        subtotalAmount,
        discountAmount: new Prisma.Decimal(0),
        totalAmount: subtotalAmount,
        currency: ticketType.currency,
        expiresAt,
        items: {
          create: {
            ticketTypeId: ticketType.id,
            quantity: input.quantity,
            unitPrice: ticketType.price,
            totalAmount: subtotalAmount
          }
        }
      },
      select: BOOKING_SELECT
    });

    return toBookingResponse(booking);
  });
}

export async function listUserBookings(userId) {
  await releaseExpiredPendingBookings({ userId });

  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc"
    },
    select: BOOKING_SELECT
  });

  return mapBookingList(bookings);
}

export async function getUserBooking(bookingId, userId) {
  await releaseExpiredPendingBookings({ bookingId, userId });

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId
    },
    select: BOOKING_SELECT
  });

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  return toBookingResponse(booking);
}
