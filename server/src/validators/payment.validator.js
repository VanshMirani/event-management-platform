import { z } from "zod";

export const createRazorpayOrderSchema = z.object({
  body: z
    .object({
      bookingId: z.string().min(1)
    })
    .strict()
});

export const verifyPaymentSchema = z.object({
  body: z
    .object({
      bookingId: z.string().min(1),
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1)
    })
    .strict()
});
