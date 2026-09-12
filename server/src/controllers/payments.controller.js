import {
  confirmFreeBooking,
  createRazorpayOrderForBooking,
  verifyRazorpayPayment
} from "../services/payment.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function postRazorpayOrder(req, res, next) {
  try {
    const razorpayOrder = await createRazorpayOrderForBooking({
      bookingId: req.validated.body.bookingId,
      userId: req.user.id
    });

    return sendSuccess(res, razorpayOrder, "Razorpay order created", 201);
  } catch (error) {
    return next(error);
  }
}

export async function verifyRazorpayOrderPayment(req, res, next) {
  try {
    const booking = await verifyRazorpayPayment(req.validated.body, req.user.id);
    return sendSuccess(res, { booking }, "Payment verified");
  } catch (error) {
    return next(error);
  }
}

export async function postFreeBookingConfirmation(req, res, next) {
  try {
    const booking = await confirmFreeBooking({
      bookingId: req.validated.body.bookingId,
      userId: req.user.id
    });

    return sendSuccess(res, { booking }, "Free booking confirmed");
  } catch (error) {
    return next(error);
  }
}
