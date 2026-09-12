import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function requireSecret(name, value) {
  if (!value || value.startsWith("replace-with")) {
    const error = new Error(`${name} must be configured.`);
    error.statusCode = 500;
    throw error;
  }

  return value;
}

function signToken(user, tokenType, secretName, expiresIn) {
  return jwt.sign(
    {
      role: user.role,
      tokenType
    },
    requireSecret(secretName, env[secretName]),
    {
      subject: user.id,
      algorithm: "HS256",
      expiresIn
    }
  );
}

function verifyToken(token, tokenType, secretName) {
  const payload = jwt.verify(token, requireSecret(secretName, env[secretName]), {
    algorithms: ["HS256"]
  });

  if (payload.tokenType !== tokenType || typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Invalid token payload.");
  }

  return payload;
}

function shouldUseCookieDomain(domain) {
  return Boolean(domain && domain !== "localhost" && domain !== "127.0.0.1");
}

function getCookieOptions(maxAge) {
  const isProduction = env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge
  };
  const domain = env.COOKIE_DOMAIN?.trim();

  if (shouldUseCookieDomain(domain)) {
    options.domain = domain;
  }

  return options;
}

function getClearCookieOptions() {
  const { maxAge: _maxAge, ...options } = getCookieOptions(0);
  return options;
}

export function createAuthTokens(user) {
  return {
    accessToken: createAccessToken(user),
    refreshToken: signToken(user, "refresh", "JWT_REFRESH_SECRET", REFRESH_TOKEN_EXPIRES_IN)
  };
}

export function createAccessToken(user) {
  return signToken(user, "access", "JWT_ACCESS_SECRET", ACCESS_TOKEN_EXPIRES_IN);
}

export function verifyAccessToken(token) {
  return verifyToken(token, "access", "JWT_ACCESS_SECRET");
}

export function verifyRefreshToken(token) {
  return verifyToken(token, "refresh", "JWT_REFRESH_SECRET");
}

export function setAuthCookies(res, tokens) {
  setAccessTokenCookie(res, tokens.accessToken);
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

export function setAccessTokenCookie(res, accessToken) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
}

export function clearAuthCookies(res) {
  const options = getClearCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
