import { z } from "zod";

export const createBookingSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    quantity: z.number().int().positive()
  })
});
