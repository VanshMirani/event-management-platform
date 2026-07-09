import { z } from "zod";

export const adminListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const adminUserParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      status: z.enum(["ACTIVE", "BLOCKED"])
    })
    .strict()
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      role: z.enum(["USER", "ADMIN", "ORGANIZER"])
    })
    .strict()
});

export const categoryParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const createCategorySchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().max(500).optional()
    })
    .strict()
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).nullable().optional()
    })
    .strict()
    .refine((value) => value.name !== undefined || value.description !== undefined, {
      message: "At least one field is required"
    })
});
