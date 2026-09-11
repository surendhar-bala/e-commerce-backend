import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/error.middleware.js'
import * as authService from '../services/auth.service.js'
import { AppError } from '../utils/errors.js'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  role: z.enum(['customer', 'seller', 'admin']).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const register = asyncHandler(async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body)
  const session = await authService.registerUser(payload)
  res.status(201).json(session)
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body)
  const session = await authService.loginUser(payload.email, payload.password)
  res.json(session)
})

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.status(204).send()
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED')
  }
  const user = await authService.getUserById(req.user.id)
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND')
  }
  res.json({ user, accessToken: req.headers.authorization?.slice('Bearer '.length) ?? '' })
})

export const forgotPassword = asyncHandler(async (_req: Request, res: Response) => {
  res.status(204).send()
})

export const resetPassword = asyncHandler(async (_req: Request, res: Response) => {
  res.status(204).send()
})
