import { Router } from "express";
import { postRazorpayWebhook } from "../controllers/webhooks.controller.js";

const router = Router();

router.post("/razorpay", postRazorpayWebhook);

export default router;
