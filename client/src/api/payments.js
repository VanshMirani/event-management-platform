import { apiPost } from "./http.js";

export async function createRazorpayOrder(bookingId) {
  const response = await apiPost("/payments/razorpay/create-order", { bookingId });
  return response.data;
}

export async function verifyRazorpayPayment(data) {
  const response = await apiPost("/payments/razorpay/verify", data);
  return response.data.booking;
}

export async function confirmDemoPayment(bookingId) {
  const response = await apiPost("/payments/demo-confirm", { bookingId });
  return response.data.booking;
}

export async function confirmFreeBooking(bookingId) {
  const response = await apiPost("/payments/free-confirm", { bookingId });
  return response.data.booking;
}
