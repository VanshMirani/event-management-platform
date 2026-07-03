import { Router } from "express";
import { getAdminStatus } from "../controllers/admin.controller.js";
import { adminMiddleware } from "../middlewares/admin.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get("/status", getAdminStatus);

export default router;
