import { Router } from "express";
import { getAdminStatus } from "../controllers/admin.controller.js";

const router = Router();

router.get("/status", getAdminStatus);

export default router;
