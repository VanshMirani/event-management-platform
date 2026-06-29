import { getAdminRoadmap } from "../services/admin.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getAdminStatus(_req, res) {
  return sendSuccess(res, getAdminRoadmap(), "Admin module scaffolded");
}
