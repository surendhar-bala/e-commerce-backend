import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/error.middleware.js'
import * as productService from '../services/product.service.js'
import { AppError } from '../utils/errors.js'
import { param } from '../utils/params.js'

const mediaItemSchema = z.object({
  url: z.string().url(),
  r2Key: z.string().optional(),
  type: z.enum(['image', 'video']),
})

const productDraftSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).max(5).optional(),
  videoUrl: z.string().url().optional(),
  mediaItems: z.array(mediaItemSchema).max(6).optional(),
  sellerId: z.string().uuid().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
})

function parseFilters(req: Request): productService.ProductFilters {
  return {
    query: typeof req.query.query === 'string' ? req.query.query : undefined,
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    sort: typeof req.query.sort === 'string' ? (req.query.sort as productService.ProductFilters['sort']) : undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    sellerId: typeof req.query.sellerId === 'string' ? req.query.sellerId : undefined,
    sellerOnly: req.query.sellerOnly === 'true',
    includeInactive: req.query.includeInactive === 'true',
  }
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.listProducts(parseFilters(req))
  res.json(result)
})

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(param(req.params.id))
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }
  res.json(product)
})

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(param(req.params.slug))
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }
  res.json(product)
})

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await productService.listCategories())
})

export const getRelated = asyncHandler(async (req: Request, res: Response) => {
  res.json(await productService.getRelatedProducts(param(req.params.id)))
})

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const draft = productDraftSchema.parse(req.body)
  const sellerId =
    req.user?.role === 'seller'
      ? req.user.id
      : draft.sellerId

  const product = await productService.createProduct(
    { ...draft, sellerId },
    req.user?.id,
  )
  res.status(201).json(product)
})

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const draft = productDraftSchema.parse(req.body)
  const existing = await productService.getProductById(param(req.params.id))
  if (!existing) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }

  if (req.user?.role === 'seller' && existing.sellerId !== req.user.id) {
    throw new AppError('You can only edit your own products.', 403, 'FORBIDDEN')
  }

  const product = await productService.updateProduct(param(req.params.id), {
    ...draft,
    sellerId: req.user?.role === 'seller' ? req.user.id : draft.sellerId ?? existing.sellerId,
  })
  res.json(product)
})

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const existing = await productService.getProductById(param(req.params.id))
  if (!existing) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }
  if (req.user?.role === 'seller' && existing.sellerId !== req.user.id) {
    throw new AppError('You can only delete your own products.', 403, 'FORBIDDEN')
  }
  await productService.deleteProduct(param(req.params.id))
  res.status(204).send()
})
