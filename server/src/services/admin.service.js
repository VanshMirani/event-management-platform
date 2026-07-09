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

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit ?? "20", 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit
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
