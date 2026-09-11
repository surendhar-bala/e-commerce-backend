import { setRuntimeEnv } from './env.js'

/**
 * Maps Cloudflare Worker bindings (Hyperdrive, secrets, vars) into runtime config.
 * Must be called inside a fetch handler — not at module scope.
 */
export function applyWorkerBindings(cfEnv: Record<string, unknown>) {
  const hyperdrive = cfEnv.HYPERDRIVE as { connectionString?: string } | undefined
  if (hyperdrive?.connectionString) {
    setRuntimeEnv('DATABASE_URL', hyperdrive.connectionString)
  }

  const bindingKeys = [
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'CORS_ORIGIN',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ] as const

  for (const key of bindingKeys) {
    const value = cfEnv[key]
    if (typeof value === 'string' && value.trim()) {
      setRuntimeEnv(key, value)
    }
  }

  const nodeEnv = cfEnv.NODE_ENV
  setRuntimeEnv(
    'NODE_ENV',
    typeof nodeEnv === 'string' && nodeEnv.trim() ? nodeEnv : 'production',
  )
}
