import { Router } from "express";
import { getBookingStatus } from "../controllers/bookings.controller.js";

const router = Router();

router.get("/status", getBookingStatus);

export default router;
