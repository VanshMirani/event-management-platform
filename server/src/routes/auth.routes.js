import { Router } from "express";
import { getAuthStatus } from "../controllers/auth.controller.js";

const router = Router();

router.get("/status", getAuthStatus);

export default router;
