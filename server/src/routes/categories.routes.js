import { Router } from "express";
import { getPublicCategories } from "../controllers/categories.controller.js";

const router = Router();

router.get("/", getPublicCategories);

export default router;
