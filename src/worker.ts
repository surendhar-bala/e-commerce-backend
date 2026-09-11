import { buildCorsHeaders, getAllowedOrigins, withCorsHeaders } from './config/cors.js'

const PORT = 8787

type ExportedHandlerFetch = {
  fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>
}

let expressHandler: ExportedHandlerFetch | null = null
let initPromise: Promise<ExportedHandlerFetch> | null = null

function readCorsOrigin(cfEnv: Record<string, unknown>): string | undefined {
  return typeof cfEnv.CORS_ORIGIN === 'string' ? cfEnv.CORS_ORIGIN : undefined
}

async function getExpressHandler(cfEnv: Record<string, unknown>): Promise<ExportedHandlerFetch> {
  if (expressHandler) {
    return expressHandler
  }

  if (!initPromise) {
    initPromise = (async () => {
      const { httpServerHandler } = await import('cloudflare:node')
      const { applyWorkerBindings } = await import('./config/worker-env.js')
      applyWorkerBindings(cfEnv)

      const { createApp } = await import('./app.js')
      const app = createApp()
      app.listen(PORT)

      const handler = httpServerHandler({ port: PORT })
      expressHandler = handler
      return handler
    })()
  }

  try {
    return await initPromise
  } catch (error) {
    initPromise = null
    expressHandler = null
    throw error
  }
}

function workerErrorResponse(error: unknown, corsHeaders: Headers): Response {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error('Worker error:', message, stack)

  const headers = new Headers(corsHeaders)
  headers.set('Content-Type', 'application/json')

  return new Response(JSON.stringify({ error: message, stack }), {
    status: 500,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const allowedOrigins = getAllowedOrigins(readCorsOrigin(env))
    const corsHeaders = buildCorsHeaders(request, allowedOrigins)

    if (request.method === 'OPTIONS') {
      if (!corsHeaders.get('Access-Control-Allow-Origin')) {
        return new Response('CORS origin not allowed', { status: 403 })
      }

      return new Response(null, { status: 204, headers: corsHeaders })
    }

    try {
      const { applyWorkerBindings } = await import('./config/worker-env.js')
      applyWorkerBindings(env)

      const handler = await getExpressHandler(env)
      const response = await handler.fetch(request, env, ctx)
      return withCorsHeaders(response, corsHeaders)
    } catch (error) {
      return workerErrorResponse(error, corsHeaders)
    }
  },
}
