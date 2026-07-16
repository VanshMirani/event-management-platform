import { Router } from "express";
import {
  getPaymentStatus,
  postRazorpayOrder,
  verifyRazorpayOrderPayment
} from "../controllers/payments.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  createRazorpayOrderSchema,
  verifyPaymentSchema
} from "../validators/payment.validator.js";

const router = Router();

router.get("/status", getPaymentStatus);
router.post(
  "/razorpay/create-order",
  authMiddleware,
  validateRequest(createRazorpayOrderSchema),
  postRazorpayOrder
);
router.post(
  "/razorpay/verify",
  authMiddleware,
  validateRequest(verifyPaymentSchema),
  verifyRazorpayOrderPayment
);

export default router;
