import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";

const PASSWORD_SALT_ROUNDS = 12;

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

const USER_WITH_PASSWORD_SELECT = {
  ...SAFE_USER_SELECT,
  passwordHash: true
};

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeOptionalString(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function toPublicUser(user) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function invalidCredentialsError() {
  return createHttpError(401, "Invalid email or password");
}

function isUniqueEmailError(error) {
  return error?.code === "P2002" && error?.meta?.target?.includes("email");
}

export async function registerUser({ name, email, password, phone }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw createHttpError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  try {
    return await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: normalizeOptionalString(phone),
        role: "USER",
        status: "ACTIVE"
      },
      select: SAFE_USER_SELECT
    });
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw createHttpError(409, "Email is already registered");
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: USER_WITH_PASSWORD_SELECT
  });

  if (!user) {
    throw invalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw invalidCredentialsError();
  }

  if (user.status !== "ACTIVE") {
    throw createHttpError(403, "User account is blocked");
  }

  return toPublicUser(user);
}

export async function getAuthenticatedUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT
  });

  if (!user) {
    throw createHttpError(401, "Authentication required");
  }

  if (user.status !== "ACTIVE") {
    throw createHttpError(403, "User account is blocked");
  }

  return user;
}
