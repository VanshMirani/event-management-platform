import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";
import { createSlug } from "../utils/slug.js";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true
};

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true
};

const EVENT_SUMMARY_SELECT = {
  id: true,
  title: true,
  slug: true,
  startsAt: true,
  endsAt: true,
  venueName: true,
  city: true,
  country: true
};

const BOOKING_LIST_SELECT = {
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
  createdAt: true,
  updatedAt: true,
  user: {
    select: SAFE_USER_SELECT
  },
  event: {
    select: EVENT_SUMMARY_SELECT
  },
  payment: {
    select: {
      id: true,
      bookingId: true,
      status: true,
      provider: true,
      providerOrderId: true,
      providerPaymentId: true,
      amount: true,
      currency: true,
      paidAt: true
    }
  }
};

const BOOKING_DETAIL_SELECT = {
  ...BOOKING_LIST_SELECT,
  confirmedAt: true,
  cancelledAt: true,
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
          eventId: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          totalQuantity: true,
          availableQuantity: true,
          maxPerBooking: true,
          isActive: true
        }
      }
    }
  },
  payment: {
    select: {
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
    }
  }
};

const PAYMENT_LIST_SELECT = {
  id: true,
  bookingId: true,
  provider: true,
  providerOrderId: true,
  providerPaymentId: true,
  status: true,
  amount: true,
  currency: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  booking: {
    select: {
      id: true,
      bookingNumber: true,
      userId: true,
      eventId: true,
      status: true,
      user: {
        select: SAFE_USER_SELECT
      },
      event: {
        select: EVENT_SUMMARY_SELECT
      }
    }
  }
};

const PAYMENT_DETAIL_SELECT = {
  ...PAYMENT_LIST_SELECT,
  failureReason: true,
  rawPayload: true,
  refundedAt: true,
  booking: {
    select: {
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
      user: {
        select: SAFE_USER_SELECT
      },
      event: {
        select: EVENT_SUMMARY_SELECT
      }
    }
  }
};

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit ?? "20", 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function toMoney(value) {
  return Number(value);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function buildDateRangeFilter(query) {
  const dateFrom = parseDate(query.dateFrom);
  const dateTo = parseDate(query.dateTo);

  if (!dateFrom && !dateTo) {
    return {};
  }

  return {
    createdAt: {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {})
    }
  };
}

function buildBookingWhere(query = {}) {
  const search = query.search?.trim();

  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.eventId ? { eventId: query.eventId } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...buildDateRangeFilter(query),
    ...(search
      ? {
          OR: [
            {
              bookingNumber: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            },
            {
              event: {
                title: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            }
          ]
        }
      : {})
  };
}

function buildPaymentWhere(query = {}) {
  const search = query.search?.trim();

  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.provider ? { provider: query.provider.trim() } : {}),
    ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    ...buildDateRangeFilter(query),
    ...(search
      ? {
          OR: [
            {
              providerOrderId: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              providerPaymentId: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              booking: {
                bookingNumber: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            },
            {
              booking: {
                user: {
                  name: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            },
            {
              booking: {
                user: {
                  email: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            },
            {
              booking: {
                event: {
                  title: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            }
          ]
        }
      : {})
  };
}

function mapPaymentSummary(payment) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    bookingId: payment.bookingId,
    bookingCode: payment.booking?.bookingNumber,
    booking: payment.booking
      ? {
          id: payment.booking.id,
          bookingCode: payment.booking.bookingNumber,
          status: payment.booking.status
        }
      : null,
    user: payment.booking?.user ?? null,
    event: payment.booking?.event ?? null,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    amount: toMoney(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}

function mapPaymentDetail(payment) {
  return {
    ...mapPaymentSummary(payment),
    failureReason: payment.failureReason,
    refundedAt: payment.refundedAt,
    rawPayload: payment.rawPayload,
    booking: payment.booking
      ? {
          id: payment.booking.id,
          bookingCode: payment.booking.bookingNumber,
          bookingNumber: payment.booking.bookingNumber,
          userId: payment.booking.userId,
          eventId: payment.booking.eventId,
          status: payment.booking.status,
          quantity: payment.booking.quantity,
          subtotalAmount: toMoney(payment.booking.subtotalAmount),
          discountAmount: toMoney(payment.booking.discountAmount),
          totalAmount: toMoney(payment.booking.totalAmount),
          finalAmount: toMoney(payment.booking.totalAmount),
          currency: payment.booking.currency,
          expiresAt: payment.booking.expiresAt,
          confirmedAt: payment.booking.confirmedAt,
          cancelledAt: payment.booking.cancelledAt,
          createdAt: payment.booking.createdAt,
          updatedAt: payment.booking.updatedAt,
          user: payment.booking.user,
          event: payment.booking.event
        }
      : null
  };
}

function mapBookingSummary(booking) {
  return {
    id: booking.id,
    bookingCode: booking.bookingNumber,
    bookingNumber: booking.bookingNumber,
    userId: booking.userId,
    eventId: booking.eventId,
    user: booking.user,
    event: booking.event,
    status: booking.status,
    quantity: booking.quantity,
    totalAmount: toMoney(booking.subtotalAmount),
    discountAmount: toMoney(booking.discountAmount),
    finalAmount: toMoney(booking.totalAmount),
    currency: booking.currency,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    expiresAt: booking.expiresAt,
    paymentStatus: booking.payment?.status ?? null,
    payment: booking.payment ? mapPaymentSummary({ ...booking.payment, booking }) : null
  };
}

function mapTicketType(ticketType) {
  return {
    ...ticketType,
    price: toMoney(ticketType.price),
    soldQuantity: ticketType.totalQuantity - ticketType.availableQuantity,
    maxPerUser: ticketType.maxPerBooking,
    status: ticketType.isActive ? "ACTIVE" : "INACTIVE"
  };
}

function mapBookingItem(item) {
  return {
    id: item.id,
    bookingId: item.bookingId,
    ticketTypeId: item.ticketTypeId,
    quantity: item.quantity,
    unitPrice: toMoney(item.unitPrice),
    totalAmount: toMoney(item.totalAmount),
    ticketType: mapTicketType(item.ticketType),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function mapBookingDetail(booking) {
  return {
    ...mapBookingSummary(booking),
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    items: booking.items.map(mapBookingItem),
    payment: booking.payment ? mapPaymentDetail({ ...booking.payment, booking }) : null
  };
}

function normalizeName(name) {
  return name.trim();
}

function normalizeDescription(description) {
  if (description === null) {
    return null;
  }

  const normalized = description?.trim();
  return normalized || null;
}

function isUniqueConstraintError(error, field) {
  return error?.code === "P2002" && error?.meta?.target?.includes(field);
}

async function ensureUserExists(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }
}

async function ensureCategoryExists(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });

  if (!category) {
    throw createHttpError(404, "Category not found");
  }
}

async function ensureCategoryNameIsAvailable(name, currentCategoryId = null) {
  const existingCategory = await prisma.category.findFirst({
    where: {
      name: {
        equals: normalizeName(name),
        mode: "insensitive"
      },
      ...(currentCategoryId
        ? {
            NOT: {
              id: currentCategoryId
            }
          }
        : {})
    },
    select: {
      id: true
    }
  });

  if (existingCategory) {
    throw createHttpError(409, "Category name is already in use");
  }
}

async function createUniqueCategorySlug(name, currentCategoryId = null) {
  const baseSlug = createSlug(name);
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.category.findFirst({
      where: {
        slug,
        ...(currentCategoryId
          ? {
              NOT: {
                id: currentCategoryId
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

function handleCategoryWriteError(error) {
  if (isUniqueConstraintError(error, "name")) {
    throw createHttpError(409, "Category name is already in use");
  }

  if (isUniqueConstraintError(error, "slug")) {
    throw createHttpError(409, "Category slug is already in use");
  }

  throw error;
}

export async function listUsers(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit,
      select: SAFE_USER_SELECT
    }),
    prisma.user.count()
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
}

export async function updateUserStatus(userId, status, currentAdminId) {
  await ensureUserExists(userId);

  if (userId === currentAdminId && status === "BLOCKED") {
    throw createHttpError(400, "Admins cannot block their own account");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: SAFE_USER_SELECT
  });
}

export async function updateUserRole(userId, role, currentAdminId) {
  await ensureUserExists(userId);

  if (userId === currentAdminId && role !== "ADMIN") {
    throw createHttpError(400, "Admins cannot remove their own admin role");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: SAFE_USER_SELECT
  });
}

export async function createCategory({ name, description }) {
  const normalizedName = normalizeName(name);
  await ensureCategoryNameIsAvailable(normalizedName);
  const slug = await createUniqueCategorySlug(normalizedName);

  try {
    return await prisma.category.create({
      data: {
        name: normalizedName,
        slug,
        description: normalizeDescription(description)
      },
      select: CATEGORY_SELECT
    });
  } catch (error) {
    handleCategoryWriteError(error);
  }
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc"
    },
    select: CATEGORY_SELECT
  });
}

export async function getCategory(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: CATEGORY_SELECT
  });

  if (!category) {
    throw createHttpError(404, "Category not found");
  }

  return category;
}

export async function updateCategory(categoryId, data) {
  await ensureCategoryExists(categoryId);
  const updateData = {};

  if (data.name !== undefined) {
    const normalizedName = normalizeName(data.name);
    await ensureCategoryNameIsAvailable(normalizedName, categoryId);
    updateData.name = normalizedName;
    updateData.slug = await createUniqueCategorySlug(normalizedName, categoryId);
  }

  if (data.description !== undefined) {
    updateData.description = normalizeDescription(data.description);
  }

  try {
    return await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      select: CATEGORY_SELECT
    });
  } catch (error) {
    handleCategoryWriteError(error);
  }
}

export async function deleteCategory(categoryId) {
  await ensureCategoryExists(categoryId);

  try {
    await prisma.category.delete({
      where: { id: categoryId }
    });
  } catch (error) {
    if (error?.code === "P2003") {
      throw createHttpError(409, "Category cannot be deleted while events use it");
    }

    throw error;
  }
}

export async function listAdminBookings(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const where = buildBookingWhere(query);
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit,
      select: BOOKING_LIST_SELECT
    }),
    prisma.booking.count({ where })
  ]);

  return {
    bookings: bookings.map(mapBookingSummary),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getAdminBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: BOOKING_DETAIL_SELECT
  });

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  return mapBookingDetail(booking);
}

export async function listAdminPayments(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const where = buildPaymentWhere(query);
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit,
      select: PAYMENT_LIST_SELECT
    }),
    prisma.payment.count({ where })
  ]);

  return {
    payments: payments.map(mapPaymentSummary),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getAdminPayment(paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: PAYMENT_DETAIL_SELECT
  });

  if (!payment) {
    throw createHttpError(404, "Payment not found");
  }

  return mapPaymentDetail(payment);
}

export async function getAdminDashboardData() {
  const [
    totalUsers,
    totalEvents,
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalPayments,
    successfulPayments,
    revenue,
    recentBookings,
    recentPayments
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: {
        amount: true
      }
    }),
    prisma.booking.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      select: BOOKING_LIST_SELECT
    }),
    prisma.payment.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      select: PAYMENT_LIST_SELECT
    })
  ]);

  return {
    stats: {
      totalUsers,
      totalEvents,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalPayments,
      successfulPayments,
      totalRevenue: toMoney(revenue._sum.amount ?? 0)
    },
    recentBookings: recentBookings.map(mapBookingSummary),
    recentPayments: recentPayments.map(mapPaymentSummary)
  };
}
