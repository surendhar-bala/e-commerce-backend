import { createApp } from './app.js'
import { formatDatabaseStartupHint, getPool } from './config/database.js'
import { env, isRazorpayConfigured, isR2Configured, getR2MissingVars, loadLocalEnv } from './config/env.js'

loadLocalEnv()
import { seedDemoSeller } from './services/auth.service.js'
import { ensureOrderSchema } from './services/order.schema.js'
async function start() {
  await getPool().query('SELECT 1')
  await ensureOrderSchema()
  await seedDemoSeller()

  const app = createApp()
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`)
    console.log(`Razorpay: ${isRazorpayConfigured() ? 'configured' : 'not configured'}`)
    console.log(`Cloudflare R2: ${isR2Configured() ? 'configured' : `not configured (missing: ${getR2MissingVars().join(', ')})`}`)
  })
}

start().catch((error) => {
  const hint = formatDatabaseStartupHint(error)
  if (hint) {
    console.error(hint)
  }
  console.error('Failed to start server:', error)
  process.exit(1)
})
