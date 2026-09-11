import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { buildPublicUrl, isR2UploadReady, putObject } from '../config/r2.js'
import { getR2MissingVars } from '../config/env.js'
import { hasNativeR2Bucket } from '../config/r2-binding.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

function extensionForMime(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    case 'video/mp4':
      return '.mp4'
    case 'video/webm':
      return '.webm'
    case 'video/quicktime':
      return '.mov'
    default:
      return ''
  }
}

export function validateUpload(file: Express.Multer.File, mediaType: 'image' | 'video') {
  if (!file) {
    throw new AppError('No file uploaded.', 400, 'NO_FILE')
  }

  const allowed = mediaType === 'image' ? IMAGE_TYPES : VIDEO_TYPES
  const maxSize = mediaType === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES

  if (!allowed.has(file.mimetype)) {
    throw new AppError(`Unsupported ${mediaType} type: ${file.mimetype}`, 400, 'INVALID_FILE_TYPE')
  }

  if (file.size > maxSize) {
    throw new AppError(
      `${mediaType === 'image' ? 'Image' : 'Video'} must be under ${mediaType === 'image' ? '5 MB' : '100 MB'}.`,
      400,
      'FILE_TOO_LARGE',
    )
  }
}

export async function uploadProductMedia(
  file: Express.Multer.File,
  mediaType: 'image' | 'video',
  sellerId: string,
) {
  if (!isR2UploadReady()) {
    const missing = hasNativeR2Bucket()
      ? !env.r2PublicUrl
        ? 'R2_PUBLIC_URL'
        : 'PRODUCT_MEDIA bucket binding'
      : getR2MissingVars().join(', ')
    throw new AppError(
      `Cloudflare R2 is not configured. Add these to e-commerce-backend/.env: ${missing}`,
      503,
      'R2_NOT_CONFIGURED',
    )
  }

  validateUpload(file, mediaType)

  const ext = path.extname(file.originalname) || extensionForMime(file.mimetype)
  const folder = mediaType === 'image' ? 'product-image' : 'product-videos'
  const r2Key = `${folder}/${sellerId}/${randomUUID()}${ext}`

  await putObject(r2Key, file.buffer, file.mimetype)

  return {
    url: buildPublicUrl(r2Key),
    r2Key,
    fileName: file.originalname,
    mediaType,
  }
}
