import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { AppError, isAppError } from '../utils/errors.js'
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found', code: 'NOT_FOUND' })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: error.errors[0]?.message ?? 'Validation failed',
      code: 'VALIDATION_ERROR',
    })
    return
  }

  if (isAppError(error)) {
    res.status(error.status).json({ message: error.message, code: error.code })
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error(error instanceof Error ? (error.stack ?? error.message) : error)

  const isDatabaseError =
    message.includes('relation') ||
    message.includes('password') ||
    message.includes('ECONNREFUSED') ||
    message.includes('connect') ||
    message.includes('SSL') ||
    message.includes('Hyperdrive')

  res.status(500).json({
    message: isDatabaseError ? message : 'Internal server error',
    code: isDatabaseError ? 'DATABASE_ERROR' : 'INTERNAL_ERROR',
  })
}

export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}
