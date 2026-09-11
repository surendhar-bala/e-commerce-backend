const PORT = 8787

type ExportedHandlerFetch = {
  fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>
}

let expressHandler: ExportedHandlerFetch | null = null
let initPromise: Promise<ExportedHandlerFetch> | null = null

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

function workerErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error('Worker error:', message, stack)
  return Response.json({ error: message, stack }, { status: 500 })
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    try {
      const handler = await getExpressHandler(env)
      return await handler.fetch(request, env, ctx)
    } catch (error) {
      return workerErrorResponse(error)
    }
  },
}
