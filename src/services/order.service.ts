import { query } from '../config/database.js'
import type { OrderItemRow, OrderRow } from '../types/index.js'
import { AppError } from '../utils/errors.js'
import { getProductById } from './product.service.js'

export type CreateOrderInput = {
  buyerId?: string
  customerEmail?: string
  customerPhone?: string
  items: Array<{ productId: string; quantity: number }>
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  subtotal: number
  shipping: number
  total: number
}

export type OrderResponse = {
  id: string
  placedAt: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
    imageUrl: string
  }>
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  customerEmail?: string
  customerPhone?: string
  subtotal: number
  shipping: number
  total: number
}

function mapOrder(row: OrderRow, items: OrderItemRow[]): OrderResponse {
  return {
    id: row.id,
    placedAt: row.created_at.toISOString(),
    status: row.status as OrderResponse['status'],
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.name,
      price: Number(item.unit_price),
      quantity: item.quantity,
      imageUrl: item.image_url ?? '',
    })),
    shippingAddress: {
      fullName: row.shipping_full_name,
      line1: row.shipping_line1,
      line2: row.shipping_line2 ?? undefined,
      city: row.shipping_city,
      state: row.shipping_state,
      postalCode: row.shipping_postal_code,
      country: row.shipping_country,
    },
    customerEmail: row.customer_email ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total_amount),
  }
}

async function loadOrderItems(orderIds: string[]) {
  if (orderIds.length === 0) {
    return new Map<string, OrderItemRow[]>()
  }
  const result = await query<OrderItemRow>(
    'SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY id ASC',
    [orderIds],
  )
  const map = new Map<string, OrderItemRow[]>()
  for (const row of result.rows) {
    const list = map.get(row.order_id) ?? []
    list.push(row)
    map.set(row.order_id, list)
  }
  return map
}

export async function listOrders(buyerId?: string) {
  const result = buyerId
    ? await query<OrderRow>(
        'SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC',
        [buyerId],
      )
    : await query<OrderRow>('SELECT * FROM orders ORDER BY created_at DESC')

  const itemsByOrder = await loadOrderItems(result.rows.map((row) => row.id))
  return result.rows.map((row) => mapOrder(row, itemsByOrder.get(row.id) ?? []))
}

export async function listOrdersForSeller(sellerId: string) {
  const result = await query<OrderRow>(
    `SELECT o.*
     FROM orders o
     WHERE o.id IN (
       SELECT order_id FROM order_items WHERE seller_id = $1
     )
     ORDER BY o.created_at DESC`,
    [sellerId],
  )

  const itemsByOrder = await loadOrderItems(result.rows.map((row) => row.id))
  return result.rows.map((row) => {
    const items = (itemsByOrder.get(row.id) ?? []).filter((item) => item.seller_id === sellerId)
    return mapOrder(row, items)
  })
}

export async function getOrderById(id: string, buyerId?: string) {
  const result = buyerId
    ? await query<OrderRow>('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2 LIMIT 1', [
        id,
        buyerId,
      ])
    : await query<OrderRow>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id])

  const row = result.rows[0]
  if (!row) {
    return null
  }
  const itemsByOrder = await loadOrderItems([row.id])
  return mapOrder(row, itemsByOrder.get(row.id) ?? [])
}

export async function getOrderByIdForSeller(id: string, sellerId: string) {
  const result = await query<OrderRow>(
    `SELECT o.*
     FROM orders o
     WHERE o.id = $1
       AND EXISTS (
         SELECT 1 FROM order_items oi
         WHERE oi.order_id = o.id AND oi.seller_id = $2
       )
     LIMIT 1`,
    [id, sellerId],
  )

  const row = result.rows[0]
  if (!row) {
    return null
  }

  const itemsByOrder = await loadOrderItems([row.id])
  const items = (itemsByOrder.get(row.id) ?? []).filter((item) => item.seller_id === sellerId)
  return mapOrder(row, items)
}

export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new AppError('Order must contain at least one item.', 400, 'EMPTY_ORDER')
  }

  const orderResult = await query<OrderRow>(
    `INSERT INTO orders (
      buyer_id, total_amount, subtotal, shipping, status,
      customer_email, customer_phone,
      shipping_full_name, shipping_line1, shipping_line2,
      shipping_city, shipping_state, shipping_postal_code, shipping_country
    ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      input.buyerId ?? null,
      input.total,
      input.subtotal,
      input.shipping,
      input.customerEmail ?? null,
      input.customerPhone ?? null,
      input.shippingAddress.fullName,
      input.shippingAddress.line1,
      input.shippingAddress.line2 ?? null,
      input.shippingAddress.city,
      input.shippingAddress.state,
      input.shippingAddress.postalCode,
      input.shippingAddress.country,
    ],
  )

  const order = orderResult.rows[0]

  for (const item of input.items) {
    const product = await getProductById(item.productId)
    if (!product) {
      throw new AppError(`Product ${item.productId} not found.`, 404, 'PRODUCT_NOT_FOUND')
    }
    const unitPrice = product.price
    const totalPrice = unitPrice * item.quantity
    await query(
      `INSERT INTO order_items (
        order_id, product_id, seller_id, name, image_url, quantity, unit_price, total_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        order.id,
        product.id,
        product.sellerId ?? null,
        product.name,
        product.media[0]?.url ?? null,
        item.quantity,
        unitPrice,
        totalPrice,
      ],
    )
  }

  const created = await getOrderById(order.id, input.buyerId)
  if (!created) {
    throw new AppError('Failed to create order.', 500, 'CREATE_FAILED')
  }
  return created
}

export async function markOrderPaid(orderId: string, razorpayOrderId: string) {
  await query(
    `UPDATE orders SET status = 'paid', razorpay_order_id = $2, updated_at = NOW() WHERE id = $1`,
    [orderId, razorpayOrderId],
  )
}
