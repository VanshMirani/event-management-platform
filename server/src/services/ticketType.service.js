import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";
import { releaseExpiredPendingBookings } from "./booking.service.js";

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

const TICKET_TYPE_SELECT = {
  id: true,
  eventId: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  totalQuantity: true,
  availableQuantity: true,
  maxPerBooking: true,
  salesStartAt: true,
  salesEndAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
};

function normalizeOptionalText(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function toTicketTypeResponse(ticketType) {
  return {
    id: ticketType.id,
    eventId: ticketType.eventId,
    name: ticketType.name,
    description: ticketType.description,
    price: Number(ticketType.price),
    currency: ticketType.currency,
    totalQuantity: ticketType.totalQuantity,
    soldQuantity: ticketType.totalQuantity - ticketType.availableQuantity,
    availableQuantity: ticketType.availableQuantity,
    maxPerUser: ticketType.maxPerBooking,
    saleStartAt: ticketType.salesStartAt,
    saleEndAt: ticketType.salesEndAt,
    status: ticketType.isActive ? "ACTIVE" : "INACTIVE",
    createdAt: ticketType.createdAt,
    updatedAt: ticketType.updatedAt
  };
}

function mapTicketTypeList(ticketTypes) {
  return ticketTypes.map(toTicketTypeResponse);
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

  throw new Error("Unable to complete ticket inventory transaction");
}

async function ensureEventExists(eventId, db = prisma) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      capacity: true
    }
  });

  if (!event) {
    throw createHttpError(400, "Event does not exist");
  }

  return event;
}

async function getExistingTicketType(ticketTypeId, db = prisma) {
  const ticketType = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: TICKET_TYPE_SELECT
  });

  if (!ticketType) {
    throw createHttpError(404, "Ticket type not found");
  }

  return ticketType;
}

function isDuplicateTicketTypeName(error) {
  return error?.code === "P2002" && error?.meta?.target?.includes("name");
}

function handleTicketTypeWriteError(error) {
  if (isDuplicateTicketTypeName(error)) {
    throw createHttpError(409, "Ticket type name already exists for this event");
  }

  throw error;
}

function mapCommonTicketTypeData(input) {
  const data = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }

  if (input.description !== undefined) {
    data.description = normalizeOptionalText(input.description);
  }

  if (input.price !== undefined) {
    data.price = new Prisma.Decimal(input.price);
  }

  if (input.currency !== undefined) {
    data.currency = input.currency.trim().toUpperCase();
  }

  if (input.maxPerUser !== undefined) {
    data.maxPerBooking = input.maxPerUser;
  }

  if (input.saleStartAt !== undefined) {
    data.salesStartAt = input.saleStartAt ? new Date(input.saleStartAt) : null;
  }

  if (input.saleEndAt !== undefined) {
    data.salesEndAt = input.saleEndAt ? new Date(input.saleEndAt) : null;
  }

  if (input.status !== undefined) {
    data.isActive = input.status === "ACTIVE";
  }

  return data;
}

function ensureSaleWindowFitsEvent({ salesStartAt, salesEndAt, event }) {
  if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) {
    throw createHttpError(400, "saleEndAt must be after saleStartAt");
  }

  if (salesStartAt && salesStartAt >= event.startsAt) {
    throw createHttpError(400, "saleStartAt must be before the event starts");
  }

  if (salesEndAt && salesEndAt > event.startsAt) {
    throw createHttpError(400, "saleEndAt cannot be after the event starts");
  }
}

async function ensureTicketInventoryFitsCapacity({
  event,
  totalQuantity,
  currentTicketTypeId = null,
  db = prisma
}) {
  if (event.capacity === null) {
    return;
  }

  const otherTicketTypes = await db.ticketType.aggregate({
    where: {
      eventId: event.id,
      ...(currentTicketTypeId
        ? {
            NOT: {
              id: currentTicketTypeId
            }
          }
        : {})
    },
    _sum: {
      totalQuantity: true
    }
  });

  if ((otherTicketTypes._sum.totalQuantity ?? 0) + totalQuantity > event.capacity) {
    throw createHttpError(400, "Ticket inventory exceeds event capacity");
  }
}

async function ensureTicketTypeRules({
  event,
  totalQuantity,
  maxPerUser,
  salesStartAt,
  salesEndAt,
  currentTicketTypeId = null,
  db = prisma
}) {
  if (maxPerUser > totalQuantity) {
    throw createHttpError(400, "maxPerUser cannot exceed totalQuantity");
  }

  ensureSaleWindowFitsEvent({ salesStartAt, salesEndAt, event });
  await ensureTicketInventoryFitsCapacity({
    event,
    totalQuantity,
    currentTicketTypeId,
    db
  });
}

export async function createAdminTicketType(input) {
  try {
    return await runSerializableTransaction(async (tx) => {
      const event = await ensureEventExists(input.eventId, tx);
      await ensureTicketTypeRules({
        event,
        totalQuantity: input.totalQuantity,
        maxPerUser: input.maxPerUser,
        salesStartAt: input.saleStartAt ? new Date(input.saleStartAt) : null,
        salesEndAt: input.saleEndAt ? new Date(input.saleEndAt) : null,
        db: tx
      });

      const ticketType = await tx.ticketType.create({
        data: {
          ...mapCommonTicketTypeData(input),
          eventId: input.eventId,
          totalQuantity: input.totalQuantity,
          availableQuantity: input.totalQuantity,
          currency: input.currency.trim().toUpperCase(),
          maxPerBooking: input.maxPerUser
        },
        select: TICKET_TYPE_SELECT
      });

      return toTicketTypeResponse(ticketType);
    });
  } catch (error) {
    handleTicketTypeWriteError(error);
  }
}

export async function listAdminTicketTypesForEvent(eventId) {
  await ensureEventExists(eventId);
  await releaseExpiredPendingBookings({ eventId });

  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: {
      createdAt: "asc"
    },
    select: TICKET_TYPE_SELECT
  });

  return mapTicketTypeList(ticketTypes);
}

export async function updateAdminTicketType(ticketTypeId, input) {
  await releaseExpiredPendingBookings({ ticketTypeId });

  try {
    return await runSerializableTransaction(async (tx) => {
      const existingTicketType = await getExistingTicketType(ticketTypeId, tx);
      const event = await ensureEventExists(existingTicketType.eventId, tx);
      const soldQuantity =
        existingTicketType.totalQuantity - existingTicketType.availableQuantity;
      const data = mapCommonTicketTypeData(input);
      const totalQuantity = input.totalQuantity ?? existingTicketType.totalQuantity;
      const maxPerUser = input.maxPerUser ?? existingTicketType.maxPerBooking;
      const salesStartAt =
        input.saleStartAt !== undefined
          ? input.saleStartAt
            ? new Date(input.saleStartAt)
            : null
          : existingTicketType.salesStartAt;
      const salesEndAt =
        input.saleEndAt !== undefined
          ? input.saleEndAt
            ? new Date(input.saleEndAt)
            : null
          : existingTicketType.salesEndAt;

      if (input.totalQuantity !== undefined) {
        if (input.totalQuantity < soldQuantity) {
          throw createHttpError(400, "totalQuantity cannot be less than soldQuantity");
        }

        data.totalQuantity = input.totalQuantity;
        data.availableQuantity = input.totalQuantity - soldQuantity;
      }

      await ensureTicketTypeRules({
        event,
        totalQuantity,
        maxPerUser,
        salesStartAt,
        salesEndAt,
        currentTicketTypeId: ticketTypeId,
        db: tx
      });

      const ticketType = await tx.ticketType.update({
        where: { id: ticketTypeId },
        data,
        select: TICKET_TYPE_SELECT
      });

      return toTicketTypeResponse(ticketType);
    });
  } catch (error) {
    handleTicketTypeWriteError(error);
  }
}

export async function deleteAdminTicketType(ticketTypeId) {
  await getExistingTicketType(ticketTypeId);

  try {
    await prisma.ticketType.delete({
      where: { id: ticketTypeId }
    });
  } catch (error) {
    if (error?.code === "P2003") {
      throw createHttpError(409, "Ticket type cannot be deleted while related records use it");
    }

    throw error;
  }
}

export async function listPublicTicketTypesForEventSlug(slug) {
  const now = new Date();
  const event = await prisma.event.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      startsAt: {
        gt: now
      }
    },
    select: {
      id: true
    }
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  await releaseExpiredPendingBookings({ eventId: event.id, now });

  const ticketTypes = await prisma.ticketType.findMany({
    where: {
      eventId: event.id,
      isActive: true,
      availableQuantity: {
        gt: 0
      },
      AND: [
        {
          OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }]
        },
        {
          OR: [{ salesEndAt: null }, { salesEndAt: { gte: now } }]
        }
      ]
    },
    orderBy: {
      price: "asc"
    },
    select: TICKET_TYPE_SELECT
  });

  return mapTicketTypeList(ticketTypes);
}
