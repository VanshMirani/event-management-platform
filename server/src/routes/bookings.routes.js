import { Router } from "express";
import {
  getBookingById,
  getMyBookings,
  postBooking
} from "../controllers/bookings.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  bookingParamsSchema,
  createBookingSchema
} from "../validators/booking.validator.js";

const router = Router();

router.post("/", authMiddleware, validateRequest(createBookingSchema), postBooking);
router.get("/my", authMiddleware, getMyBookings);
router.get("/:id", authMiddleware, validateRequest(bookingParamsSchema), getBookingById);

export default router;
