import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    venue: z.string().min(2),
    city: z.string().min(2),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    price: z.number().nonnegative(),
    capacity: z.number().int().positive()
  })
});
