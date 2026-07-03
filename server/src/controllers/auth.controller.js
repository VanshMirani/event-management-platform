import {
  getAuthenticatedUserById,
  loginUser,
  registerUser
} from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  clearAuthCookies,
  createAuthTokens,
  setAuthCookies
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
