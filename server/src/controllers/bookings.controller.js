import { getBookingRoadmap } from "../services/booking.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getBookingStatus(_req, res) {
  return sendSuccess(res, getBookingRoadmap(), "Bookings module scaffolded");
}
