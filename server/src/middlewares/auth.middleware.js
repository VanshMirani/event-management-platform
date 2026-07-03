import { getAuthenticatedUserById } from "../services/auth.service.js";
import { createHttpError } from "../utils/httpError.js";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "../utils/token.js";

export async function authMiddleware(req, _res, next) {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];

    if (!token) {
      throw createHttpError(401, "Authentication required");
    }

    try {
      req.auth = verifyAccessToken(token);
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      throw createHttpError(401, "Invalid or expired access token");
    }

    req.user = await getAuthenticatedUserById(req.auth.sub);

    return next();
  } catch (error) {
    return next(error);
  }
}
