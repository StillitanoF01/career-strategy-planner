import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'
import type { ServerResponse } from 'node:http'

/**
 * Dev-only bridge: serves the Vercel-style functions in `/api` during `vite dev`,
 * so the browser calls `/api/...` identically in dev and production.
 *
 * In production these same files deploy as real Vercel serverless functions —
 * this plugin never runs there, and secrets in process.env stay server-side.
 */

const apiDir = fileURLToPath(new URL('../api', import.meta.url))

function resolveHandlerFile(pathname: string): string | null {
  const rel = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '')
  if (!rel) return null
  const candidates = [
    path.join(apiDir, `${rel}.ts`),
    path.join(apiDir, rel, 'index.ts'),
  ]
  return candidates.find((c) => fs.existsSync(c)) ?? null
}

/** Add the Vercel response helpers onto a raw Node ServerResponse. */
function decorateRes(res: ServerResponse) {
  const r = res as ServerResponse & {
    status: (code: number) => typeof r
    json: (body: unknown) => typeof r
    send: (body: unknown) => typeof r
  }
  r.status = (code) => {
    r.statusCode = code
    return r
  }
  r.json = (body) => {
    if (!r.headersSent) r.setHeader('content-type', 'application/json; charset=utf-8')
    r.end(JSON.stringify(body))
    return r
  }
  r.send = (body) => {
    if (typeof body === 'object' && body !== null) return r.json(body)
    r.end(body == null ? '' : String(body))
    return r
  }
  return r
}

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-bridge',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const file = resolveHandlerFile(url.pathname)
        if (!file) {
          res.statusCode = 404
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: `No API handler for ${url.pathname}` }))
          return
        }
        try {
          const mod = await server.ssrLoadModule(file)
          const handler = mod.default
          if (typeof handler !== 'function') {
            throw new Error(`${file} has no default export handler`)
          }
          // Mimic Vercel's request/response surface used by handlers.
          ;(req as unknown as { query: Record<string, string> }).query =
            Object.fromEntries(url.searchParams)
          decorateRes(res)
          await handler(req, res)
        } catch (err) {
          server.ssrFixStacktrace?.(err as Error)
          const message = err instanceof Error ? err.message : String(err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev API error', detail: message }))
        }
      })
    },
  }
}
