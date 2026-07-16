import { z } from "zod";

export const ticketParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const checkInLookupSchema = z.object({
  body: z
    .object({
      ticketCode: z.string().trim().min(1).optional(),
      qrToken: z.string().trim().min(1).optional()
    })
    .strict()
    .refine((value) => value.ticketCode || value.qrToken, {
      message: "ticketCode or qrToken is required"
    })
});
