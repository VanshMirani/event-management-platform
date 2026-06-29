import { z } from "zod";

export const adminListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
});
