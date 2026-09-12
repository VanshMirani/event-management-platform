import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";
import { createSlug } from "../utils/slug.js";

const EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  shortDescription: true,
  imageUrl: true,
  status: true,
  type: true,
  startsAt: true,
  endsAt: true,
  venueName: true,
  address: true,
  city: true,
  state: true,
  country: true,
  onlineUrl: true,
  capacity: true,
  isFeatured: true,
  categoryId: true,
  organizerId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  organizer: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

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

  throw new Error("Unable to complete event transaction");
}

function normalizeOptionalText(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function toEventResponse(event) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    shortDescription: event.shortDescription,
    categoryId: event.categoryId,
    category: event.category,
    organizerId: event.organizerId,
    organizer: event.organizer,
    eventType: event.type,
    venueName: event.venueName,
    address: event.address,
    city: event.city,
    state: event.state,
    country: event.country,
    onlineUrl: event.onlineUrl,
    startAt: event.startsAt,
    endAt: event.endsAt,
    capacity: event.capacity,
    status: event.status,
    isFeatured: event.isFeatured,
    bannerImage: event.imageUrl,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

function toPublicEventResponse(event) {
  const response = toEventResponse(event);

  return {
    ...response,
    onlineUrl: null,
    organizer: event.organizer
      ? {
          id: event.organizer.id,
          name: event.organizer.name
        }
      : null
  };
}

function mapEventList(events) {
  return events.map(toEventResponse);
}

function mapPublicEventList(events) {
  return events.map(toPublicEventResponse);
}

async function ensureCategoryExists(categoryId, db = prisma) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });

  if (!category) {
    throw createHttpError(400, "Category does not exist");
  }
}

async function createUniqueEventSlug(title, currentEventId = null, db = prisma) {
  const baseSlug = createSlug(title);
  let slug = baseSlug;
  let suffix = 2;

  while (
    await db.event.findFirst({
      where: {
        slug,
        ...(currentEventId
          ? {
              NOT: {
                id: currentEventId
              }
            }
          : {})
      },
      select: { id: true }
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function mapEventData(input) {
  const data = {};

  if (input.title !== undefined) {
    data.title = input.title.trim();
  }

  if (input.description !== undefined) {
    data.description = normalizeOptionalText(input.description);
  }

  if (input.shortDescription !== undefined) {
    data.shortDescription = normalizeOptionalText(input.shortDescription);
  }

  if (input.categoryId !== undefined) {
    data.categoryId = input.categoryId;
  }

  if (input.eventType !== undefined) {
    data.type = input.eventType;
  }

  if (input.venueName !== undefined) {
    data.venueName = normalizeOptionalText(input.venueName);
  }

  if (input.address !== undefined) {
    data.address = normalizeOptionalText(input.address);
  }

  if (input.city !== undefined) {
    data.city = normalizeOptionalText(input.city);
  }

  if (input.state !== undefined) {
    data.state = normalizeOptionalText(input.state);
  }

  if (input.country !== undefined) {
    data.country = input.country.trim();
  }

  if (input.onlineUrl !== undefined) {
    data.onlineUrl = normalizeOptionalText(input.onlineUrl);
  }

  if (input.startAt !== undefined) {
    data.startsAt = new Date(input.startAt);
  }

  if (input.endAt !== undefined) {
    data.endsAt = new Date(input.endAt);
  }

  if (input.capacity !== undefined) {
    data.capacity = input.capacity;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (input.isFeatured !== undefined) {
    data.isFeatured = input.isFeatured;
  }

  if (input.bannerImage !== undefined) {
    data.imageUrl = normalizeOptionalText(input.bannerImage);
  }

  return data;
}

function isUniqueSlugError(error) {
  return error?.code === "P2002" && error?.meta?.target?.includes("slug");
}

async function getExistingEvent(eventId, db = prisma) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      status: true
    }
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  return event;
}

function ensureDateOrder(startsAt, endsAt) {
  if (endsAt <= startsAt) {
    throw createHttpError(400, "endAt must be after startAt");
  }
}

function ensurePublishedEventIsUpcoming(status, startsAt) {
  if (status === "PUBLISHED" && startsAt <= new Date()) {
    throw createHttpError(400, "Published events must start in the future");
  }
}

function ensureEventStatusTransition(currentStatus, nextStatus) {
  if (
    nextStatus &&
    nextStatus !== currentStatus &&
    ["CANCELLED", "COMPLETED"].includes(currentStatus)
  ) {
    throw createHttpError(409, `${currentStatus.toLowerCase()} events cannot change status`);
  }
}

async function ensureCapacitySupportsTicketTypes(eventId, capacity, db = prisma) {
  if (capacity === null || capacity === undefined) {
    return;
  }

  const ticketTotals = await db.ticketType.aggregate({
    where: {
      eventId
    },
    _sum: {
      totalQuantity: true
    }
  });

  if ((ticketTotals._sum.totalQuantity ?? 0) > capacity) {
    throw createHttpError(400, "capacity cannot be lower than configured ticket inventory");
  }
}

async function ensureEventHasActiveTicketType(eventId, db = prisma) {
  const activeTicketTypeCount = await db.ticketType.count({
    where: {
      eventId,
      isActive: true,
      totalQuantity: {
        gt: 0
      }
    }
  });

  if (activeTicketTypeCount === 0) {
    throw createHttpError(409, "Add at least one active ticket type before publishing");
  }
}

async function ensureEventDateSupportsTicketSales(eventId, startsAt, db = prisma) {
  const invalidTicketType = await db.ticketType.findFirst({
    where: {
      eventId,
      OR: [
        {
          salesStartAt: {
            gte: startsAt
          }
        },
        {
          salesEndAt: {
            gt: startsAt
          }
        }
      ]
    },
    select: {
      id: true
    }
  });

  if (invalidTicketType) {
    throw createHttpError(400, "Event startAt conflicts with a ticket sale window");
  }
}

function handleEventWriteError(error) {
  if (isUniqueSlugError(error)) {
    throw createHttpError(409, "Event slug is already in use");
  }

  throw error;
}

export async function createAdminEvent(input, organizerId) {
  if (input.status === "PUBLISHED") {
    throw createHttpError(409, "Create the event as a draft, add a ticket type, then publish it");
  }

  await ensureCategoryExists(input.categoryId);

  const startsAt = new Date(input.startAt);
  const endsAt = new Date(input.endAt);
  ensureDateOrder(startsAt, endsAt);
  ensurePublishedEventIsUpcoming(input.status, startsAt);

  const slug = await createUniqueEventSlug(input.title);

  try {
    const event = await prisma.event.create({
      data: {
        ...mapEventData(input),
        slug,
        startsAt,
        endsAt,
        country: input.country?.trim() || "India",
        organizerId
      },
      select: EVENT_SELECT
    });

    return toEventResponse(event);
  } catch (error) {
    handleEventWriteError(error);
  }
}

export async function listAdminEvents() {
  const events = await prisma.event.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: EVENT_SELECT
  });

  return mapEventList(events);
}

export async function getAdminEvent(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: EVENT_SELECT
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  return toEventResponse(event);
}

export async function updateAdminEvent(eventId, input) {
  try {
    return await runSerializableTransaction(async (tx) => {
      const existingEvent = await getExistingEvent(eventId, tx);

      if (input.categoryId !== undefined) {
        await ensureCategoryExists(input.categoryId, tx);
      }

      const updateData = mapEventData(input);
      ensureEventStatusTransition(existingEvent.status, updateData.status);

      if (input.title !== undefined) {
        updateData.slug = await createUniqueEventSlug(input.title, eventId, tx);
      }

      const startsAt = updateData.startsAt ?? existingEvent.startsAt;
      const endsAt = updateData.endsAt ?? existingEvent.endsAt;
      ensureDateOrder(startsAt, endsAt);
      const status = updateData.status ?? existingEvent.status;

      if (status === "PUBLISHED" && existingEvent.status !== "PUBLISHED") {
        await ensureEventHasActiveTicketType(eventId, tx);
      }

      if (input.status === "PUBLISHED" || input.startAt !== undefined) {
        ensurePublishedEventIsUpcoming(status, startsAt);
      }

      if (input.capacity !== undefined) {
        await ensureCapacitySupportsTicketTypes(eventId, input.capacity, tx);
      }

      if (input.startAt !== undefined) {
        await ensureEventDateSupportsTicketSales(eventId, startsAt, tx);
      }

      const event = await tx.event.update({
        where: { id: eventId },
        data: updateData,
        select: EVENT_SELECT
      });

      if (event.status === "CANCELLED") {
        await tx.ticket.updateMany({
          where: {
            eventId,
            status: "VALID"
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date()
          }
        });
      }

      return toEventResponse(event);
    });
  } catch (error) {
    handleEventWriteError(error);
  }
}

export async function deleteAdminEvent(eventId) {
  await getExistingEvent(eventId);

  try {
    await prisma.event.delete({
      where: { id: eventId }
    });
  } catch (error) {
    if (error?.code === "P2003") {
      throw createHttpError(409, "Event cannot be deleted while related records use it");
    }

    throw error;
  }
}

export async function publishAdminEvent(eventId) {
  return runSerializableTransaction(async (tx) => {
    const existingEvent = await getExistingEvent(eventId, tx);
    ensureEventStatusTransition(existingEvent.status, "PUBLISHED");
    ensurePublishedEventIsUpcoming("PUBLISHED", existingEvent.startsAt);
    await ensureEventHasActiveTicketType(eventId, tx);

    const event = await tx.event.update({
      where: { id: eventId },
      data: { status: "PUBLISHED" },
      select: EVENT_SELECT
    });

    return toEventResponse(event);
  });
}

export async function unpublishAdminEvent(eventId) {
  return runSerializableTransaction(async (tx) => {
    const existingEvent = await getExistingEvent(eventId, tx);
    ensureEventStatusTransition(existingEvent.status, "DRAFT");
    const event = await tx.event.update({
      where: { id: eventId },
      data: { status: "DRAFT" },
      select: EVENT_SELECT
    });

    return toEventResponse(event);
  });
}

export async function listPublishedEvents() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: {
        gt: now
      }
    },
    orderBy: {
      startsAt: "asc"
    },
    select: EVENT_SELECT
  });

  return mapPublicEventList(events);
}

export async function listFeaturedPublishedEvents() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isFeatured: true,
      startsAt: {
        gt: now
      }
    },
    orderBy: {
      startsAt: "asc"
    },
    take: 6,
    select: EVENT_SELECT
  });

  return mapPublicEventList(events);
}

export async function getPublishedEventBySlug(slug) {
  const event = await prisma.event.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      startsAt: {
        gt: new Date()
      }
    },
    select: EVENT_SELECT
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  return toPublicEventResponse(event);
}
