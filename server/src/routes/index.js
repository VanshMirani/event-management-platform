import { Router } from "express";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import bookingRoutes from "./bookings.routes.js";
import categoryRoutes from "./categories.routes.js";
import eventRoutes from "./events.routes.js";
import healthRoutes from "./health.routes.js";
import paymentRoutes from "./payments.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/events", eventRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin", adminRoutes);

export default router;
