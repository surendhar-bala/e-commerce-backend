import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/error.middleware.js'
import * as paymentService from '../services/payment.service.js'

const createIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  orderId: z.string().uuid().optional(),
})

const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  amount: z.number().positive(),
})

export const createIntent = asyncHandler(async (req: Request, res: Response) => {
  const payload = createIntentSchema.parse(req.body)
  const intent = await paymentService.createPaymentIntent(
    payload.amount,
    payload.currency,
    payload.orderId,
  )
  res.json(intent)
})

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const payload = verifySchema.parse(req.body)
  res.json(await paymentService.verifyPayment(payload))
})
