declare module 'cloudflare:node' {
  type HttpServerHandler = {
    fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>
  }

  export function httpServerHandler(options: { port: number }): HttpServerHandler
}
