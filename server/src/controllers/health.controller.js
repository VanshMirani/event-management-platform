import { sendSuccess } from "../utils/apiResponse.js";

export function getHealth(_req, res) {
  return sendSuccess(
    res,
    {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    "Event Management API is healthy"
  );
}
