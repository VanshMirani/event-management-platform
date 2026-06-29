import { getPaymentRoadmap } from "../services/payment.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getPaymentStatus(_req, res) {
  return sendSuccess(res, getPaymentRoadmap(), "Payments module scaffolded");
}
