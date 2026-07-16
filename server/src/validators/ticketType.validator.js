import { z } from "zod";

const optionalTextSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().max(500).optional()
);

const optionalDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().datetime().optional()
);

const ticketTypeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

function validateSaleWindow(body, context) {
  if (
    body.saleStartAt &&
    body.saleEndAt &&
    new Date(body.saleEndAt) <= new Date(body.saleStartAt)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "saleEndAt must be after saleStartAt",
      path: ["saleEndAt"]
    });
  }
}

export const eventTicketTypeParamsSchema = z.object({
  params: z.object({
    eventId: z.string().min(1)
  })
});

export const ticketTypeParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const eventSlugTicketTypeParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1)
  })
});

export const createTicketTypeSchema = z.object({
  body: z
    .object({
      eventId: z.string().min(1),
      name: z.string().trim().min(2).max(100),
      description: optionalTextSchema,
      price: z.number().nonnegative(),
      currency: z.string().trim().min(3).max(3).default("INR"),
      totalQuantity: z.number().int().positive(),
      maxPerUser: z.number().int().positive().default(5),
      saleStartAt: optionalDateSchema,
      saleEndAt: optionalDateSchema,
      status: ticketTypeStatusSchema.default("ACTIVE")
    })
    .strict()
    .superRefine(validateSaleWindow)
});

export const updateTicketTypeSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: optionalTextSchema,
      price: z.number().nonnegative().optional(),
      currency: z.string().trim().min(3).max(3).optional(),
      totalQuantity: z.number().int().positive().optional(),
      maxPerUser: z.number().int().positive().optional(),
      saleStartAt: optionalDateSchema,
      saleEndAt: optionalDateSchema,
      status: ticketTypeStatusSchema.optional()
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required"
    })
    .superRefine(validateSaleWindow)
});
