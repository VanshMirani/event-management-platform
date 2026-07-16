import { apiGet, apiPost } from "./http.js";

export async function createBooking(data) {
  const response = await apiPost("/bookings", data);
  return response.data.booking;
}

export async function listMyBookings() {
  const response = await apiGet("/bookings/my");
  return response.data.bookings;
}

export async function getBooking(bookingId) {
  const response = await apiGet(`/bookings/${bookingId}`);
  return response.data.booking;
}
