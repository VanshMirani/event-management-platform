import { prisma } from "../config/db.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

export async function getHealth(_req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(
      res,
      {
        status: "ok",
        database: "connected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      "EventFlow API is healthy"
    );
  } catch {
    return sendError(res, "Service is not ready", 503, {
      database: "unavailable"
    });
  }
}
