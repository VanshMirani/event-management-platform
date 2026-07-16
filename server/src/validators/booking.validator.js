import { z } from "zod";

export const createBookingSchema = z.object({
  body: z
    .object({
      eventId: z.string().min(1),
      ticketTypeId: z.string().min(1),
      quantity: z.number().int().positive()
    })
    .strict()
});

export const bookingParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});
