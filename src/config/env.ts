import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const runtimeEnv = new Map<string, string>()

/** Load .env for local `npm run dev` only — not called on Cloudflare Workers. */
export function loadLocalEnv() {
  const moduleUrl = import.meta.url
  if (!moduleUrl) {
    dotenv.config()
    return
  }

  const rootDir = path.resolve(path.dirname(fileURLToPath(moduleUrl)), '../..')
  dotenv.config({ path: path.join(rootDir, '.env') })
}

/** Apply Cloudflare Worker bindings inside a fetch handler (not at module scope). */
export function setRuntimeEnv(key: string, value: string) {
  runtimeEnv.set(key, value.trim())
}

function readEnv(name: string): string | undefined {
  return runtimeEnv.get(name) ?? process.env[name]
}

function required(name: string, fallback?: string): string {
  const raw = readEnv(name)
  const value = raw?.trim() ? raw.trim() : fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string): string {
  return readEnv(name)?.trim() ?? ''
}

function resolveDatabaseUrl(): string {
  const databaseUrl = required('DATABASE_URL', 'postgresql://postgres@localhost:5432/ecommerce')
  if (databaseUrl.includes('USER:PASSWORD')) {
    throw new Error(
      'DATABASE_URL still contains placeholder values (USER:PASSWORD). Copy .env.example to .env and set your real PostgreSQL credentials.',
    )
  }
  return databaseUrl
}

export const env = {
  get nodeEnv() {
    return readEnv('NODE_ENV') ?? 'development'
  },
  get port() {
    return Number(readEnv('PORT') ?? 5000)
  },
  get databaseUrl() {
    return resolveDatabaseUrl()
  },
  get jwtSecret() {
    return required('JWT_SECRET', 'dev-secret-change-me')
  },
  get jwtExpiresIn() {
    return readEnv('JWT_EXPIRES_IN') ?? '7d'
  },
  get corsOrigin() {
    return readEnv('CORS_ORIGIN') ?? 'http://localhost:5173'
  },
  get razorpayKeyId() {
    return optional('RAZORPAY_KEY_ID')
  },
  get razorpayKeySecret() {
    return optional('RAZORPAY_KEY_SECRET')
  },
  get r2AccountId() {
    return optional('R2_ACCOUNT_ID')
  },
  get r2AccessKeyId() {
    return optional('R2_ACCESS_KEY_ID')
  },
  get r2SecretAccessKey() {
    return optional('R2_SECRET_ACCESS_KEY')
  },
  get r2BucketName() {
    return optional('R2_BUCKET_NAME')
  },
  get r2PublicUrl() {
    return optional('R2_PUBLIC_URL')
  },
}

export function isRazorpayConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret)
}

export function isS3R2Configured(): boolean {
  return getS3R2MissingVars().length === 0
}

/** @deprecated Use isR2UploadReady from config/r2.js for upload checks. */
export function isR2Configured(): boolean {
  return isS3R2Configured()
}

export function getS3R2MissingVars(): string[] {
  const missing: string[] = []
  if (!env.r2AccountId) missing.push('R2_ACCOUNT_ID')
  if (!env.r2AccessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!env.r2SecretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!env.r2BucketName) missing.push('R2_BUCKET_NAME')
  if (!env.r2PublicUrl) missing.push('R2_PUBLIC_URL')
  return missing
}

export function getR2MissingVars(): string[] {
  return getS3R2MissingVars()
}
