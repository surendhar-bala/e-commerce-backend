/** Native Cloudflare R2 bucket binding (Workers). Set per request in worker-env. */
let nativeR2Bucket: R2Bucket | null = null

export function setNativeR2Bucket(bucket: R2Bucket | null) {
  nativeR2Bucket = bucket
}

export function getNativeR2Bucket(): R2Bucket | null {
  return nativeR2Bucket
}

export function hasNativeR2Bucket(): boolean {
  return nativeR2Bucket !== null
}
