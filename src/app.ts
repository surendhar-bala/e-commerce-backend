import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/error.middleware.js'
import authRoutes from './routes/auth.routes.js'
import orderRoutes from './routes/order.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import productRoutes from './routes/product.routes.js'
import uploadRoutes from './routes/upload.routes.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((value) => value.trim()),
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'e-commerce-backend' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/upload', uploadRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/payments', paymentRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
