import { env } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode ?? 500;
  const message =
    statusCode === 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;
  const details = env.NODE_ENV === "production" ? null : err.details ?? err.stack;

  if (env.NODE_ENV !== "test" && statusCode >= 500) {
    console.error(err);
  }

  return sendError(res, message, statusCode, details);
}
