import { Router } from "express";
import {
  getAdminDashboard,
  getAdminStatus,
  getBookingById,
  getBookings,
  getCategories,
  getCategoryById,
  getPaymentById,
  getPayments,
  getUserById,
  getUsers,
  patchCategory,
  patchUserRole,
  patchUserStatus,
  postCategory,
  removeCategory
} from "../controllers/admin.controller.js";
import {
  getAdminEventById,
  getAdminEvents,
  patchAdminEvent,
  postAdminEvent,
  publishEvent,
  removeAdminEvent,
  unpublishEvent
} from "../controllers/events.controller.js";
import {
  getAdminTicketTypesForEvent,
  patchAdminTicketType,
  postAdminTicketType,
  removeAdminTicketType
} from "../controllers/ticketTypes.controller.js";
import {
  markTicketUsed,
  verifyTicketForCheckIn
} from "../controllers/tickets.controller.js";
import { adminMiddleware } from "../middlewares/admin.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  adminBookingListQuerySchema,
  adminBookingParamsSchema,
  adminListQuerySchema,
  adminPaymentListQuerySchema,
  adminPaymentParamsSchema,
  adminUserParamsSchema,
  categoryParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  updateUserRoleSchema,
  updateUserStatusSchema
} from "../validators/admin.validator.js";
import {
  createEventSchema,
  eventParamsSchema,
  updateEventSchema
} from "../validators/event.validator.js";
import {
  createTicketTypeSchema,
  eventTicketTypeParamsSchema,
  ticketTypeParamsSchema,
  updateTicketTypeSchema
} from "../validators/ticketType.validator.js";
import { checkInLookupSchema } from "../validators/ticket.validator.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get("/status", getAdminStatus);
router.get("/dashboard", getAdminDashboard);
router.get("/users", validateRequest(adminListQuerySchema), getUsers);
router.get("/users/:id", validateRequest(adminUserParamsSchema), getUserById);
router.patch("/users/:id/status", validateRequest(updateUserStatusSchema), patchUserStatus);
router.patch("/users/:id/role", validateRequest(updateUserRoleSchema), patchUserRole);
router.post("/categories", validateRequest(createCategorySchema), postCategory);
router.get("/categories", getCategories);
router.get("/categories/:id", validateRequest(categoryParamsSchema), getCategoryById);
router.patch("/categories/:id", validateRequest(updateCategorySchema), patchCategory);
router.delete("/categories/:id", validateRequest(categoryParamsSchema), removeCategory);
router.post("/events", validateRequest(createEventSchema), postAdminEvent);
router.get("/events", getAdminEvents);
router.get("/events/:id", validateRequest(eventParamsSchema), getAdminEventById);
router.patch("/events/:id", validateRequest(updateEventSchema), patchAdminEvent);
router.delete("/events/:id", validateRequest(eventParamsSchema), removeAdminEvent);
router.patch("/events/:id/publish", validateRequest(eventParamsSchema), publishEvent);
router.patch("/events/:id/unpublish", validateRequest(eventParamsSchema), unpublishEvent);
router.post("/ticket-types", validateRequest(createTicketTypeSchema), postAdminTicketType);
router.get(
  "/events/:eventId/ticket-types",
  validateRequest(eventTicketTypeParamsSchema),
  getAdminTicketTypesForEvent
);
router.patch(
  "/ticket-types/:id",
  validateRequest(updateTicketTypeSchema),
  patchAdminTicketType
);
router.delete(
  "/ticket-types/:id",
  validateRequest(ticketTypeParamsSchema),
  removeAdminTicketType
);
router.get("/bookings", validateRequest(adminBookingListQuerySchema), getBookings);
router.get("/bookings/:id", validateRequest(adminBookingParamsSchema), getBookingById);
router.get("/payments", validateRequest(adminPaymentListQuerySchema), getPayments);
router.get("/payments/:id", validateRequest(adminPaymentParamsSchema), getPaymentById);
router.post(
  "/check-in/verify",
  validateRequest(checkInLookupSchema),
  verifyTicketForCheckIn
);
router.post(
  "/check-in/mark-used",
  validateRequest(checkInLookupSchema),
  markTicketUsed
);

export default router;
