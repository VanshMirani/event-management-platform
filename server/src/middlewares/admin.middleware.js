import { createHttpError } from "../utils/httpError.js";

export function adminMiddleware(req, _res, next) {
  if (!req.user) {
    return next(createHttpError(401, "Authentication required"));
  }

  if (req.user.role !== "ADMIN") {
    return next(createHttpError(403, "Admin access required"));
  }

  return next();
}
