import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";

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

async function ensureEventExists(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true }
  });

  if (!event) {
    throw createHttpError(400, "Event does not exist");
  }
}

async function getExistingTicketType(ticketTypeId) {
  const ticketType = await prisma.ticketType.findUnique({
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

export async function createAdminTicketType(input) {
  await ensureEventExists(input.eventId);

  try {
    const ticketType = await prisma.ticketType.create({
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
  } catch (error) {
    handleTicketTypeWriteError(error);
  }
}

export async function listAdminTicketTypesForEvent(eventId) {
  await ensureEventExists(eventId);

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
  const existingTicketType = await getExistingTicketType(ticketTypeId);
  const soldQuantity =
    existingTicketType.totalQuantity - existingTicketType.availableQuantity;
  const data = mapCommonTicketTypeData(input);

  if (input.totalQuantity !== undefined) {
    if (input.totalQuantity < soldQuantity) {
      throw createHttpError(400, "totalQuantity cannot be less than soldQuantity");
    }

    data.totalQuantity = input.totalQuantity;
    data.availableQuantity = input.totalQuantity - soldQuantity;
  }

  try {
    const ticketType = await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data,
      select: TICKET_TYPE_SELECT
    });

    return toTicketTypeResponse(ticketType);
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
  const event = await prisma.event.findFirst({
    where: {
      slug,
      status: "PUBLISHED"
    },
    select: {
      id: true
    }
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  const ticketTypes = await prisma.ticketType.findMany({
    where: {
      eventId: event.id,
      isActive: true
    },
    orderBy: {
      price: "asc"
    },
    select: TICKET_TYPE_SELECT
  });

  return mapTicketTypeList(ticketTypes);
}
