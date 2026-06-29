import { Router } from "express";
import { getPaymentStatus } from "../controllers/payments.controller.js";

const router = Router();

router.get("/status", getPaymentStatus);

export default router;
