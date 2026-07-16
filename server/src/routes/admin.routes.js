import { Router } from "express";
import {
  getAdminStatus,
  getCategories,
  getCategoryById,
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
import { adminMiddleware } from "../middlewares/admin.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  adminListQuerySchema,
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

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get("/status", getAdminStatus);
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

export default router;
