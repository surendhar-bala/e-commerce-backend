import type { Request, Response } from 'express'
import multer from 'multer'
import { asyncHandler } from '../middleware/error.middleware.js'
import * as storageService from '../services/storage.service.js'
import { AppError } from '../utils/errors.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

export const uploadMiddleware = upload.single('file')

export const uploadProductMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED')
  }

  const mediaType = req.query.type === 'video' ? 'video' : 'image'
  const file = req.file

  if (!file) {
    throw new AppError('No file uploaded. Use form field name "file".', 400, 'NO_FILE')
  }

  const result = await storageService.uploadProductMedia(file, mediaType, req.user.id)
  res.status(201).json(result)
})
