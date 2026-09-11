const DEFAULT_ALLOWED_ORIGINS = [
  'https://e-com-frontend.balakiro89.workers.dev',
  'http://localhost:5173',
]

export function getAllowedOrigins(corsOrigin?: string): string[] {
  if (!corsOrigin?.trim()) {
    return DEFAULT_ALLOWED_ORIGINS
  }

  return corsOrigin
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function resolveCorsOrigin(request: Request, allowedOrigins: string[]): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) {
    return allowedOrigins[0] ?? null
  }

  return allowedOrigins.includes(origin) ? origin : null
}

export function buildCorsHeaders(request: Request, allowedOrigins: string[]): Headers {
  const headers = new Headers()
  const allowedOrigin = resolveCorsOrigin(request, allowedOrigins)

  if (!allowedOrigin) {
    return headers
  }

  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Vary', 'Origin')

  if (request.method === 'OPTIONS') {
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    headers.set(
      'Access-Control-Allow-Headers',
      request.headers.get('Access-Control-Request-Headers') ?? 'Content-Type, Authorization',
    )
    headers.set('Access-Control-Max-Age', '86400')
  }

  return headers
}

export function withCorsHeaders(response: Response, corsHeaders: Headers): Response {
  const headers = new Headers(response.headers)
  corsHeaders.forEach((value, key) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
