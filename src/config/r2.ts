import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { env, isS3R2Configured } from './env.js'
import { getNativeR2Bucket, hasNativeR2Bucket } from './r2-binding.js'

let client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!isS3R2Configured()) {
    throw new Error('Cloudflare R2 S3 credentials are not configured.')
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

export async function putObject(
  r2Key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const bucket = getNativeR2Bucket()
  if (bucket) {
    await bucket.put(r2Key, body, {
      httpMetadata: { contentType },
    })
    return
  }

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.r2BucketName,
      Key: r2Key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export function isR2UploadReady(): boolean {
  if (hasNativeR2Bucket()) {
    return Boolean(env.r2PublicUrl)
  }
  return isS3R2Configured()
}
