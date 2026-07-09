import { prisma } from "../config/db.js";

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true
};

export function listPublicCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc"
    },
    select: CATEGORY_SELECT
  });
}
