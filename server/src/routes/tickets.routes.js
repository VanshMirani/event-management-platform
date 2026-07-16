import { Router } from "express";
import {
  downloadTicket,
  getMyTickets,
  getTicketById
} from "../controllers/tickets.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ticketParamsSchema } from "../validators/ticket.validator.js";

const router = Router();

router.use(authMiddleware);
router.get("/my", getMyTickets);
router.get("/:id/download", validateRequest(ticketParamsSchema), downloadTicket);
router.get("/:id", validateRequest(ticketParamsSchema), getTicketById);

export default router;
