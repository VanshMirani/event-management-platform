import { handleRazorpayWebhook } from "../services/payment.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function postRazorpayWebhook(req, res, next) {
  try {
    const result = await handleRazorpayWebhook({
      rawBody: req.rawBody,
      signature: req.get("x-razorpay-signature"),
      payload: req.body
    });

    return sendSuccess(res, result, "Webhook processed");
  } catch (error) {
    return next(error);
  }
}
