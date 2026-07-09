import { listPublicCategories } from "../services/category.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getPublicCategories(_req, res, next) {
  try {
    const categories = await listPublicCategories();
    return sendSuccess(res, { categories }, "Categories fetched");
  } catch (error) {
    return next(error);
  }
}
