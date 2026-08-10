import { join, normalize } from "path"

const port = process.env.PORT ? Number(process.env.PORT) : 3000
const distDir = normalize(join(import.meta.dir, "dist"))
const indexHtml = join(distDir, "index.html")

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)
    const requestedPath = normalize(join(distDir, decodeURIComponent(url.pathname)))

    // Guard against path traversal escaping dist/ via "../" segments.
    if (!requestedPath.startsWith(distDir)) {
      return new Response("Forbidden", { status: 403 })
    }

    const file = Bun.file(requestedPath)
    // Unknown paths fall back to index.html so React Router can handle client-side routes.
    if (await file.exists()) return new Response(file)
    return new Response(Bun.file(indexHtml))
  },
})

console.log(`Client listening on http://localhost:${port}`)
