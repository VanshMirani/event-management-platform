import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  refreshSession,
  register
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/register", authRateLimiter, validateRequest(registerSchema), register);
router.post("/login", authRateLimiter, validateRequest(loginSchema), login);
router.post("/refresh", authRateLimiter, refreshSession);
router.post("/logout", logout);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
