import { z } from "zod";

const optionalTextSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().max(500).nullable().optional()
);

const optionalLongTextSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().max(5000).nullable().optional()
);

const optionalUrlSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().url().max(1000).nullable().optional()
);

const eventTypeSchema = z.enum(["ONLINE", "OFFLINE", "HYBRID"]);
const eventStatusSchema = z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]);

function validateDateOrder(body, context) {
  if (body.startAt && body.endAt && new Date(body.endAt) <= new Date(body.startAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endAt must be after startAt",
      path: ["endAt"]
    });
  }
}

export const eventParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const eventSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1)
  })
});

export const createEventSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3).max(160),
      description: optionalLongTextSchema,
      categoryId: z.string().min(1),
      eventType: eventTypeSchema.default("OFFLINE"),
      venueName: optionalTextSchema,
      address: optionalTextSchema,
      city: optionalTextSchema,
      state: optionalTextSchema,
      country: z.string().trim().min(2).max(80).optional(),
      onlineUrl: optionalUrlSchema,
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      capacity: z.number().int().positive().nullable().optional(),
      status: eventStatusSchema.default("DRAFT"),
      isFeatured: z.boolean().optional(),
      bannerImage: optionalUrlSchema
    })
    .strict()
    .superRefine(validateDateOrder)
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      title: z.string().trim().min(3).max(160).optional(),
      description: optionalLongTextSchema,
      categoryId: z.string().min(1).optional(),
      eventType: eventTypeSchema.optional(),
      venueName: optionalTextSchema,
      address: optionalTextSchema,
      city: optionalTextSchema,
      state: optionalTextSchema,
      country: z.string().trim().min(2).max(80).optional(),
      onlineUrl: optionalUrlSchema,
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      capacity: z.number().int().positive().nullable().optional(),
      status: eventStatusSchema.optional(),
      isFeatured: z.boolean().optional(),
      bannerImage: optionalUrlSchema
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required"
    })
    .superRefine(validateDateOrder)
});
