import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/error.middleware.js'
import * as orderService from '../services/order.service.js'
import { AppError } from '../utils/errors.js'
import { param } from '../utils/params.js'

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive(),
      imageUrl: z.string(),
    }),
  ),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    postalCode: z.string().min(4),
    country: z.string().min(2),
  }),
  subtotal: z.number(),
  shipping: z.number(),
  total: z.number(),
  customerEmail: z.string().email(),
  customerPhone: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number.')),
})

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED')
  }

  if (req.user.role === 'seller') {
    res.json(await orderService.listOrdersForSeller(req.user.id))
    return
  }

  if (req.user.role === 'admin') {
    res.json(await orderService.listOrders())
    return
  }

  res.json(await orderService.listOrders(req.user.id))
})

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED')
  }

  const orderId = param(req.params.id)

  if (req.user.role === 'seller') {
    const order = await orderService.getOrderByIdForSeller(orderId, req.user.id)
    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND')
    }
    res.json(order)
    return
  }

  const buyerId = req.user.role === 'customer' ? req.user.id : undefined
  const order = await orderService.getOrderById(orderId, buyerId)
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND')
  }
  res.json(order)
})

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = createOrderSchema.parse(req.body)
  const order = await orderService.createOrder({
    buyerId: req.user?.id,
    customerEmail: payload.customerEmail,
    customerPhone: payload.customerPhone,
    items: payload.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    shippingAddress: payload.shippingAddress,
    subtotal: payload.subtotal,
    shipping: payload.shipping,
    total: payload.total,
  })
  res.status(201).json(order)
})
