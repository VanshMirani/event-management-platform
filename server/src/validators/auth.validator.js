import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const optionalPhoneSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(7).max(20).optional()
);

export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255),
      password: passwordSchema,
      phone: optionalPhoneSchema
    })
    .strict()
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email().max(255),
      password: passwordSchema
    })
    .strict()
});
