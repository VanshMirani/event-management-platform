import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";

const BOOKING_EXPIRY_MINUTES = 10;

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
      startsAt: true,
      endsAt: true,
      venueName: true,
      city: true,
      country: true
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
    event: booking.event,
    items: booking.items.map(toBookingItemResponse),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

function mapBookingList(bookings) {
  return bookings.map(toBookingResponse);
}

function ensureTicketSalesAreOpen(ticketType, now) {
  if (ticketType.salesStartAt && ticketType.salesStartAt > now) {
    throw createHttpError(400, "Ticket sales have not started");
  }

  if (ticketType.salesEndAt && ticketType.salesEndAt < now) {
    throw createHttpError(400, "Ticket sales have ended");
  }
}

async function getBookableEvent(tx, eventId) {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true
    }
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  if (event.status !== "PUBLISHED") {
    throw createHttpError(400, "Event is not available for booking");
  }

  return event;
}

async function getBookableTicketType(tx, { eventId, ticketTypeId, quantity }) {
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

  ensureTicketSalesAreOpen(ticketType, new Date());

  if (quantity > ticketType.maxPerBooking) {
    throw createHttpError(400, "Quantity exceeds maxPerUser");
  }

  if (ticketType.availableQuantity < quantity) {
    throw createHttpError(409, "Requested quantity is not available");
  }

  return ticketType;
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
  return prisma.$transaction(async (tx) => {
    await getBookableEvent(tx, input.eventId);
    const ticketType = await getBookableTicketType(tx, input);

    await reserveTicketQuantity(tx, {
      eventId: input.eventId,
      ticketTypeId: ticketType.id,
      quantity: input.quantity,
      now: new Date()
    });

    const subtotalAmount = new Prisma.Decimal(ticketType.price).mul(input.quantity);
    const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);

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
