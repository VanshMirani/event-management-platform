import { Router } from "express";
import {
  getFeaturedEvents,
  getPublicEventBySlug,
  getPublicEvents
} from "../controllers/events.controller.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { eventSlugParamsSchema } from "../validators/event.validator.js";

const router = Router();

router.get("/", getPublicEvents);
router.get("/featured", getFeaturedEvents);
router.get("/:slug", validateRequest(eventSlugParamsSchema), getPublicEventBySlug);

export default router;
