import crypto from 'node:crypto'
import { query } from '../config/database.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

export type PaymentIntent = {
  clientSecret: string
  provider: 'pending' | 'razorpay'
  orderId?: string
  razorpayOrderId?: string
  amount?: number
  currency?: string
  keyId?: string
}

export async function createPaymentIntent(amount: number, currency = 'INR', orderId?: string) {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    return {
      clientSecret: `mock_${crypto.randomUUID()}`,
      provider: 'pending' as const,
      orderId,
      amount,
      currency,
    }
  }

  const amountPaise = Math.round(amount * 100)
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: orderId ?? `rcpt_${Date.now()}`,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    console.error('Razorpay order creation failed:', details)
    throw new AppError('Unable to create Razorpay order.', 502, 'PAYMENT_PROVIDER_ERROR')
  }

  const payload = (await response.json()) as { id: string }
  if (orderId) {
    await query('UPDATE orders SET razorpay_order_id = $2, updated_at = NOW() WHERE id = $1', [
      orderId,
      payload.id,
    ])
  }

  return {
    clientSecret: payload.id,
    provider: 'razorpay' as const,
    orderId,
    razorpayOrderId: payload.id,
    amount,
    currency,
    keyId: env.razorpayKeyId,
  }
}

export async function verifyPayment(input: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  amount: number
}) {
  if (!env.razorpayKeySecret) {
    throw new AppError('Razorpay is not configured.', 503, 'PAYMENT_NOT_CONFIGURED')
  }

  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex')

  if (expected !== input.razorpaySignature) {
    throw new AppError('Payment verification failed.', 400, 'INVALID_SIGNATURE')
  }

  await query(
    `INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status)
     VALUES ($1, $2, $3, $4, $5, 'success')`,
    [
      input.orderId,
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
      input.amount,
    ],
  )

  await query(`UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1`, [input.orderId])
  return { success: true }
}
