import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(rootDir, '.env') })

function required(name: string, fallback?: string): string {
  const raw = process.env[name]
  const value = raw?.trim() ? raw.trim() : fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const databaseUrl = required('DATABASE_URL', 'postgresql://postgres@localhost:5432/ecommerce')

if (databaseUrl.includes('USER:PASSWORD')) {
  throw new Error(
    'DATABASE_URL still contains placeholder values (USER:PASSWORD). Copy .env.example to .env and set your real PostgreSQL credentials.',
  )
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  databaseUrl,
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID?.trim() ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET?.trim() ?? '',
  r2AccountId: process.env.R2_ACCOUNT_ID?.trim() ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '',
  r2BucketName: process.env.R2_BUCKET_NAME?.trim() ?? '',
  r2PublicUrl: process.env.R2_PUBLIC_URL?.trim() ?? '',
} as const

export function isRazorpayConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret)
}

export function isR2Configured(): boolean {
  return getR2MissingVars().length === 0
}

export function getR2MissingVars(): string[] {
  const missing: string[] = []
  if (!env.r2AccountId) missing.push('R2_ACCOUNT_ID')
  if (!env.r2AccessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!env.r2SecretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!env.r2BucketName) missing.push('R2_BUCKET_NAME')
  if (!env.r2PublicUrl) missing.push('R2_PUBLIC_URL')
  return missing
}
