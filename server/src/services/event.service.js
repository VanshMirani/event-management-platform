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
    status: event.status,
    isFeatured: event.isFeatured,
    bannerImage: event.imageUrl,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

function mapEventList(events) {
  return events.map(toEventResponse);
}

async function ensureCategoryExists(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });

  if (!category) {
    throw createHttpError(400, "Category does not exist");
  }
}

async function createUniqueEventSlug(title, currentEventId = null) {
  const baseSlug = createSlug(title);
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.event.findFirst({
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

async function getExistingEvent(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      startsAt: true,
      endsAt: true
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

function handleEventWriteError(error) {
  if (isUniqueSlugError(error)) {
    throw createHttpError(409, "Event slug is already in use");
  }

  throw error;
}

export async function createAdminEvent(input, organizerId) {
  await ensureCategoryExists(input.categoryId);

  const startsAt = new Date(input.startAt);
  const endsAt = new Date(input.endAt);
  ensureDateOrder(startsAt, endsAt);

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
  const existingEvent = await getExistingEvent(eventId);

  if (input.categoryId !== undefined) {
    await ensureCategoryExists(input.categoryId);
  }

  const updateData = mapEventData(input);

  if (input.title !== undefined) {
    updateData.slug = await createUniqueEventSlug(input.title, eventId);
  }

  const startsAt = updateData.startsAt ?? existingEvent.startsAt;
  const endsAt = updateData.endsAt ?? existingEvent.endsAt;
  ensureDateOrder(startsAt, endsAt);

  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      select: EVENT_SELECT
    });

    return toEventResponse(event);
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
  await getExistingEvent(eventId);
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
    select: EVENT_SELECT
  });

  return toEventResponse(event);
}

export async function unpublishAdminEvent(eventId) {
  await getExistingEvent(eventId);
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: "DRAFT" },
    select: EVENT_SELECT
  });

  return toEventResponse(event);
}

export async function listPublishedEvents() {
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      startsAt: "asc"
    },
    select: EVENT_SELECT
  });

  return mapEventList(events);
}

export async function listFeaturedPublishedEvents() {
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isFeatured: true
    },
    orderBy: {
      startsAt: "asc"
    },
    take: 6,
    select: EVENT_SELECT
  });

  return mapEventList(events);
}

export async function getPublishedEventBySlug(slug) {
  const event = await prisma.event.findFirst({
    where: {
      slug,
      status: "PUBLISHED"
    },
    select: EVENT_SELECT
  });

  if (!event) {
    throw createHttpError(404, "Event not found");
  }

  return toEventResponse(event);
}
