import { listFeaturedEvents } from "../services/event.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getEvents(_req, res) {
  return sendSuccess(res, listFeaturedEvents(), "Events fetched");
}
