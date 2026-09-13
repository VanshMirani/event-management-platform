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

export const eventCheckInTicketsSchema = z.object({
  params: z.object({
    eventId: z.string().trim().min(1)
  }),
  query: z.object({
    status: z.enum(["ALL", "VALID", "USED"]).default("ALL"),
    search: z.string().trim().max(200).optional()
  })
});
