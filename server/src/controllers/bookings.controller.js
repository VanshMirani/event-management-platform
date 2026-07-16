import {
  createPendingBooking,
  getBookingRoadmap,
  getUserBooking,
  listUserBookings
} from "../services/booking.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getBookingStatus(_req, res) {
  return sendSuccess(res, getBookingRoadmap(), "Bookings module available");
}

export async function postBooking(req, res, next) {
  try {
    const booking = await createPendingBooking(req.validated.body, req.user.id);
    return sendSuccess(res, { booking }, "Booking created", 201);
  } catch (error) {
    return next(error);
  }
}

export async function getMyBookings(req, res, next) {
  try {
    const bookings = await listUserBookings(req.user.id);
    return sendSuccess(res, { bookings }, "Bookings fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const booking = await getUserBooking(req.validated.params.id, req.user.id);
    return sendSuccess(res, { booking }, "Booking fetched");
  } catch (error) {
    return next(error);
  }
}
