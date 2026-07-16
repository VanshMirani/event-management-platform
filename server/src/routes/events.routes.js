import { Router } from "express";
import {
  getFeaturedEvents,
  getPublicEventBySlug,
  getPublicEvents
} from "../controllers/events.controller.js";
import { getPublicTicketTypesForEvent } from "../controllers/ticketTypes.controller.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { eventSlugParamsSchema } from "../validators/event.validator.js";
import { eventSlugTicketTypeParamsSchema } from "../validators/ticketType.validator.js";

const router = Router();

router.get("/", getPublicEvents);
router.get("/featured", getFeaturedEvents);
router.get(
  "/:slug/ticket-types",
  validateRequest(eventSlugTicketTypeParamsSchema),
  getPublicTicketTypesForEvent
);
router.get("/:slug", validateRequest(eventSlugParamsSchema), getPublicEventBySlug);

export default router;
