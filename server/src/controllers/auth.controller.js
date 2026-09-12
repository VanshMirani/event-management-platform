import {
  getAuthenticatedUserById,
  loginUser,
  registerUser
} from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { createHttpError } from "../utils/httpError.js";
import {
  clearAuthCookies,
  createAccessToken,
  createAuthTokens,
  REFRESH_TOKEN_COOKIE,
  setAccessTokenCookie,
  setAuthCookies,
  verifyRefreshToken
} from "../utils/token.js";

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.validated.body);
    setAuthCookies(res, createAuthTokens(user));

    return sendSuccess(res, { user }, "User registered", 201);
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await loginUser(req.validated.body);
    setAuthCookies(res, createAuthTokens(user));

    return sendSuccess(res, { user }, "Login successful");
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  clearAuthCookies(res);

  return sendSuccess(res, null, "Logout successful");
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = req.user ?? (await getAuthenticatedUserById(req.auth.sub));

    return sendSuccess(res, { user }, "Current user fetched");
  } catch (error) {
    return next(error);
  }
}

export async function refreshSession(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      throw createHttpError(401, "Refresh token is required");
    }

    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error.statusCode === 500) {
        throw error;
      }

      throw createHttpError(401, "Invalid or expired refresh token");
    }

    const user = await getAuthenticatedUserById(payload.sub);
    setAccessTokenCookie(res, createAccessToken(user));

    return sendSuccess(res, { user }, "Session refreshed");
  } catch (error) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      clearAuthCookies(res);
    }

    return next(error);
  }
}
