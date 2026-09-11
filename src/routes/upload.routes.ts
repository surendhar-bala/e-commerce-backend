import { Router } from 'express'
import { uploadMiddleware, uploadProductMedia } from '../controllers/upload.controller.js'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'

const router = Router()

router.post(
  '/',
  authenticate,
  requireRoles('admin', 'seller'),
  uploadMiddleware,
  uploadProductMedia,
)

export default router
