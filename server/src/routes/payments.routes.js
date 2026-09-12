import { Router } from "express";
import {
  postDemoBookingConfirmation,
  postFreeBookingConfirmation,
  postRazorpayOrder,
  verifyRazorpayOrderPayment
} from "../controllers/payments.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  confirmBookingSchema,
  createRazorpayOrderSchema,
  verifyPaymentSchema
} from "../validators/payment.validator.js";

const router = Router();

router.post(
  "/free-confirm",
  authMiddleware,
  validateRequest(confirmBookingSchema),
  postFreeBookingConfirmation
);

router.post(
  "/demo-confirm",
  authMiddleware,
  validateRequest(confirmBookingSchema),
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
