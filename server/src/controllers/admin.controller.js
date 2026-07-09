import {
  createCategory,
  deleteCategory,
  getCategory,
  getUser,
  listCategories,
  listUsers,
  updateCategory,
  updateUserRole,
  updateUserStatus
} from "../services/admin.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getAdminStatus(_req, res) {
  return sendSuccess(
    res,
    {
      implemented: true,
      modules: ["users", "categories", "events", "bookings", "payments"]
    },
    "Admin module ready"
  );
}

export async function getUsers(req, res, next) {
  try {
    const data = await listUsers(req.validated.query);
    return sendSuccess(res, data, "Users fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await getUser(req.validated.params.id);
    return sendSuccess(res, { user }, "User fetched");
  } catch (error) {
    return next(error);
  }
}

export async function patchUserStatus(req, res, next) {
  try {
    const user = await updateUserStatus(
      req.validated.params.id,
      req.validated.body.status,
      req.user.id
    );
    return sendSuccess(res, { user }, "User status updated");
  } catch (error) {
    return next(error);
  }
}

export async function patchUserRole(req, res, next) {
  try {
    const user = await updateUserRole(
      req.validated.params.id,
      req.validated.body.role,
      req.user.id
    );
    return sendSuccess(res, { user }, "User role updated");
  } catch (error) {
    return next(error);
  }
}

export async function postCategory(req, res, next) {
  try {
    const category = await createCategory(req.validated.body);
    return sendSuccess(res, { category }, "Category created", 201);
  } catch (error) {
    return next(error);
  }
}

export async function getCategories(_req, res, next) {
  try {
    const categories = await listCategories();
    return sendSuccess(res, { categories }, "Categories fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getCategoryById(req, res, next) {
  try {
    const category = await getCategory(req.validated.params.id);
    return sendSuccess(res, { category }, "Category fetched");
  } catch (error) {
    return next(error);
  }
}

export async function patchCategory(req, res, next) {
  try {
    const category = await updateCategory(req.validated.params.id, req.validated.body);
    return sendSuccess(res, { category }, "Category updated");
  } catch (error) {
    return next(error);
  }
}

export async function removeCategory(req, res, next) {
  try {
    await deleteCategory(req.validated.params.id);
    return sendSuccess(res, null, "Category deleted");
  } catch (error) {
    return next(error);
  }
}
