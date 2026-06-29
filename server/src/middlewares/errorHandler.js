import { env } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode ?? 500;
  const details = env.NODE_ENV === "production" ? null : err.stack;

  if (env.NODE_ENV !== "test") {
    console.error(err);
  }

  return sendError(res, err.message, statusCode, details);
}
