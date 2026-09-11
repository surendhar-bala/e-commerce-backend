import { query } from '../config/database.js'
import type { ProductMediaRow, ProductRow, ProductSpecificationRow } from '../types/index.js'
import { AppError } from '../utils/errors.js'

export type ProductResponse = {
  id: string
  slug: string
  name: string
  description: string
  categoryId: string
  price: number
  compareAtPrice?: number
  stock: number
  status: ProductRow['status']
  rating: number
  reviewCount: number
  featured: boolean
  trending: boolean
  createdAt: string
  sellerId?: string
  media: Array<{ id: string; url: string; alt: string; type: 'image' | 'video'; publicId?: string }>
  specifications: Array<{ label: string; value: string }>
}

export type ProductFilters = {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'discount'
  page?: number
  pageSize?: number
  sellerId?: string
  sellerOnly?: boolean
  includeInactive?: boolean
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function mapProduct(
  row: ProductRow,
  media: ProductMediaRow[],
  specifications: ProductSpecificationRow[],
): ProductResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    stock: row.stock,
    status: row.status,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    featured: row.featured,
    trending: row.trending,
    createdAt: row.created_at.toISOString(),
    sellerId: row.seller_id ?? undefined,
    media: media.map((item) => ({
      id: item.id,
      url: item.url,
      alt: item.alt ?? row.name,
      type: item.media_type === 'VIDEO' ? 'video' : 'image',
      publicId: item.r2_key ?? undefined,
    })),
    specifications: specifications.map((item) => ({ label: item.label, value: item.value })),
  }
}

async function loadProductDetails(productIds: string[]) {
  if (productIds.length === 0) {
    return { mediaByProduct: new Map<string, ProductMediaRow[]>(), specsByProduct: new Map() }
  }

  const mediaResult = await query<ProductMediaRow>(
    `SELECT * FROM product_media WHERE product_id = ANY($1::uuid[]) ORDER BY sort_order ASC, created_at ASC`,
    [productIds],
  )
  const specsResult = await query<ProductSpecificationRow>(
    `SELECT * FROM product_specifications WHERE product_id = ANY($1::uuid[]) ORDER BY sort_order ASC`,
    [productIds],
  )

  const mediaByProduct = new Map<string, ProductMediaRow[]>()
  for (const row of mediaResult.rows) {
    const list = mediaByProduct.get(row.product_id) ?? []
    list.push(row)
    mediaByProduct.set(row.product_id, list)
  }

  const specsByProduct = new Map<string, ProductSpecificationRow[]>()
  for (const row of specsResult.rows) {
    const list = specsByProduct.get(row.product_id) ?? []
    list.push(row)
    specsByProduct.set(row.product_id, list)
  }

  return { mediaByProduct, specsByProduct }
}

export async function listProducts(filters: ProductFilters = {}) {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 12
  const conditions: string[] = []
  const params: unknown[] = []

  if (!filters.includeInactive) {
    conditions.push(`p.status = 'active'`)
  }
  if (filters.sellerId) {
    params.push(filters.sellerId)
    conditions.push(`p.seller_id = $${params.length}`)
  } else if (filters.sellerOnly) {
    conditions.push(`p.seller_id IS NOT NULL`)
  }
  if (filters.query) {
    params.push(`%${filters.query.toLowerCase()}%`)
    conditions.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`)
  }
  if (filters.category) {
    params.push(filters.category)
    conditions.push(`p.category_id = $${params.length}`)
  }
  if (filters.minPrice !== undefined) {
    params.push(filters.minPrice)
    conditions.push(`p.price >= $${params.length}`)
  }
  if (filters.maxPrice !== undefined) {
    params.push(filters.maxPrice)
    conditions.push(`p.price <= $${params.length}`)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  let orderBy = 'p.featured DESC, p.created_at DESC'
  switch (filters.sort) {
    case 'price-asc':
      orderBy = 'p.price ASC'
      break
    case 'price-desc':
      orderBy = 'p.price DESC'
      break
    case 'newest':
      orderBy = 'p.created_at DESC'
      break
    case 'discount':
      orderBy =
        'CASE WHEN p.compare_at_price > p.price THEN (p.compare_at_price - p.price) / p.compare_at_price ELSE 0 END DESC, p.created_at DESC'
      break
    default:
      break
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM products p ${whereClause}`,
    params,
  )
  const total = Number(countResult.rows[0]?.count ?? 0)

  params.push(pageSize, (page - 1) * pageSize)
  const result = await query<ProductRow>(
    `SELECT p.* FROM products p ${whereClause} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )

  const productIds = result.rows.map((row) => row.id)
  const { mediaByProduct, specsByProduct } = await loadProductDetails(productIds)

  return {
    items: result.rows.map((row) =>
      mapProduct(row, mediaByProduct.get(row.id) ?? [], specsByProduct.get(row.id) ?? []),
    ),
    total,
    page,
    pageSize,
  }
}

export async function getProductById(id: string) {
  const result = await query<ProductRow>('SELECT * FROM products WHERE id = $1 LIMIT 1', [id])
  const row = result.rows[0]
  if (!row) {
    return null
  }
  const { mediaByProduct, specsByProduct } = await loadProductDetails([row.id])
  return mapProduct(row, mediaByProduct.get(row.id) ?? [], specsByProduct.get(row.id) ?? [])
}

export async function getProductBySlug(slug: string) {
  const result = await query<ProductRow>('SELECT * FROM products WHERE slug = $1 LIMIT 1', [slug])
  const row = result.rows[0]
  if (!row) {
    return null
  }
  const { mediaByProduct, specsByProduct } = await loadProductDetails([row.id])
  return mapProduct(row, mediaByProduct.get(row.id) ?? [], specsByProduct.get(row.id) ?? [])
}

export async function getRelatedProducts(productId: string) {
  const current = await getProductById(productId)
  if (!current) {
    return []
  }
  const result = await listProducts({
    category: current.categoryId,
    page: 1,
    pageSize: 5,
  })
  return result.items.filter((item) => item.id !== productId).slice(0, 4)
}

const CATEGORIES = [
  {
    id: 'cat-art',
    slug: 'painting-materials',
    name: 'Painting materials',
    description: 'Colours, brushes, and canvas for home and class.',
    image: {
      id: 'cat-art-img',
      url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      alt: 'Open tubes of paint and brushes on a wooden table',
    },
  },
  {
    id: 'cat-toys',
    slug: 'kids-toys',
    name: "Kids' toys",
    description: 'Play, puzzles, and gifts for little ones.',
    image: {
      id: 'cat-toys-img',
      url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1',
      alt: 'Colourful wooden toys arranged on a table',
    },
  },
  {
    id: 'cat-everyday',
    slug: 'everyday',
    name: 'Everyday products',
    description: 'Kitchen, cleaning, and daily home essentials.',
    image: {
      id: 'cat-everyday-img',
      url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
      alt: 'Kitchen shelves with everyday jars and utensils',
    },
  },
] as const

export async function listCategories() {
  return [...CATEGORIES]
}

export type ProductDraft = {
  name: string
  description: string
  categoryId: string
  price: number
  compareAtPrice?: number
  stock: number
  imageUrl?: string
  imageUrls?: string[]
  videoUrl?: string
  mediaItems?: Array<{ url: string; r2Key?: string; type: 'image' | 'video' }>
  sellerId?: string
  status?: ProductRow['status']
}

function r2KeyFromUrl(url: string): string | null {
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  if (!publicBase || !url.startsWith(`${publicBase}/`)) {
    return null
  }
  return url.slice(publicBase.length + 1)
}

async function replaceMedia(productId: string, sellerId: string | null, draft: ProductDraft) {
  await query('DELETE FROM product_media WHERE product_id = $1', [productId])

  type MediaEntry = { url: string; r2Key: string | null; mediaType: 'IMAGE' | 'VIDEO'; sortOrder: number }

  const entries: MediaEntry[] = []

  if (draft.mediaItems?.length) {
    draft.mediaItems.slice(0, 6).forEach((item, index) => {
      entries.push({
        url: item.url,
        r2Key: item.r2Key ?? r2KeyFromUrl(item.url),
        mediaType: item.type === 'video' ? 'VIDEO' : 'IMAGE',
        sortOrder: index,
      })
    })
  } else {
    const imageUrls = [...(draft.imageUrls ?? []).filter(Boolean)]
    if (draft.imageUrl) {
      imageUrls.unshift(draft.imageUrl)
    }
    const uniqueImages = [...new Set(imageUrls)].slice(0, 5)

    if (uniqueImages.length === 0) {
      uniqueImages.push('https://images.unsplash.com/photo-1441986300917-64674bd600d8')
    }

    uniqueImages.forEach((url, index) => {
      entries.push({
        url,
        r2Key: r2KeyFromUrl(url),
        mediaType: 'IMAGE',
        sortOrder: index,
      })
    })

    if (draft.videoUrl) {
      entries.push({
        url: draft.videoUrl,
        r2Key: r2KeyFromUrl(draft.videoUrl),
        mediaType: 'VIDEO',
        sortOrder: entries.length,
      })
    }
  }

  for (const entry of entries) {
    await query(
      `INSERT INTO product_media (product_id, seller_id, media_type, url, r2_key, alt, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        productId,
        sellerId,
        entry.mediaType,
        entry.url,
        entry.r2Key,
        draft.name,
        entry.sortOrder,
      ],
    )
  }
}

export async function createProduct(draft: ProductDraft, createdBy?: string) {
  const slugBase = slugify(draft.name) || `product-${Date.now()}`
  let slug = slugBase
  let suffix = 1
  while (true) {
    const existing = await query('SELECT id FROM products WHERE slug = $1 LIMIT 1', [slug])
    if (!existing.rows[0]) {
      break
    }
    slug = `${slugBase}-${suffix++}`
  }

  const result = await query<ProductRow>(
    `INSERT INTO products (
      slug, name, description, category_id, price, compare_at_price, stock, status, seller_id, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      slug,
      draft.name,
      draft.description,
      draft.categoryId,
      draft.price,
      draft.compareAtPrice ?? null,
      draft.stock,
      draft.status ?? 'active',
      draft.sellerId ?? null,
      createdBy ?? null,
    ],
  )

  const product = result.rows[0]
  await replaceMedia(product.id, draft.sellerId ?? null, draft)
  const created = await getProductById(product.id)
  if (!created) {
    throw new AppError('Failed to create product.', 500, 'CREATE_FAILED')
  }
  return created
}

export async function updateProduct(id: string, draft: ProductDraft) {
  const existing = await getProductById(id)
  if (!existing) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }

  const slug = slugify(draft.name) || existing.slug
  await query(
    `UPDATE products SET
      slug = $2,
      name = $3,
      description = $4,
      category_id = $5,
      price = $6,
      compare_at_price = $7,
      stock = $8,
      status = $9,
      seller_id = $10,
      updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      slug,
      draft.name,
      draft.description,
      draft.categoryId,
      draft.price,
      draft.compareAtPrice ?? null,
      draft.stock,
      draft.status ?? existing.status,
      draft.sellerId ?? existing.sellerId ?? null,
    ],
  )

  await replaceMedia(id, draft.sellerId ?? existing.sellerId ?? null, draft)
  const updated = await getProductById(id)
  if (!updated) {
    throw new AppError('Failed to update product.', 500, 'UPDATE_FAILED')
  }
  return updated
}

export async function deleteProduct(id: string) {
  const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id])
  if (!result.rows[0]) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }
}

