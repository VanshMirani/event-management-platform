import { getAuthRoadmap } from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export function getAuthStatus(_req, res) {
  return sendSuccess(res, getAuthRoadmap(), "Auth module scaffolded");
}
