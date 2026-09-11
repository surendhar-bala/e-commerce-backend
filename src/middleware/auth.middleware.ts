import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'seller' | 'customer'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'))
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser
    req.user = payload
    next()
  } catch {
    next(new AppError('Invalid or expired token.', 401, 'UNAUTHORIZED'))
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser
    req.user = payload
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}

export function requireRoles(...roles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('You do not have permission for this action.', 403, 'FORBIDDEN'))
      return
    }
    next()
  }
}
