import { S3Client } from '@aws-sdk/client-s3'
import { env, isR2Configured } from './env.js'

let client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured.')
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    })
  }
  return client
}

export function buildPublicUrl(r2Key: string) {
  return `${env.r2PublicUrl.replace(/\/$/, '')}/${r2Key.replace(/^\//, '')}`
}
