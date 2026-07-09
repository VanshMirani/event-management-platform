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

export default router;
