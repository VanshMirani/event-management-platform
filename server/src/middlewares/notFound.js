import { sendError } from "../utils/apiResponse.js";

export function notFound(req, res) {
  return sendError(res, `Route not found: ${req.originalUrl}`, 404);
}
