import { Router } from "express";
import {
  postDemoBookingConfirmation,
  postRazorpayOrder,
  verifyRazorpayOrderPayment
} from "../controllers/payments.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  confirmDemoBookingSchema,
  createRazorpayOrderSchema,
  verifyPaymentSchema
} from "../validators/payment.validator.js";

const router = Router();

router.post(
  "/demo-confirm",
  authMiddleware,
  validateRequest(confirmDemoBookingSchema),
  postDemoBookingConfirmation
);

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
