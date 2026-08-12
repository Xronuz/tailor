import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Shared order store for one shop: a small JSON-over-HTTP API backed by SQLite,
 * plus the built app served from the same origin so tablets need one address.
 *
 * Orders arrive whole. Each carries `updatedAt`, and a write only lands if it
 * is newer than the copy already stored — two tablets editing at once resolve
 * to the later edit rather than whichever request happened to arrive last.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = process.env.DIST_DIR ?? join(ROOT, 'dist')
const PORT = Number(process.env.PORT ?? 4000)
// Kept outside the image in production, so orders survive a redeploy.
const DB_PATH = process.env.DB_PATH ?? join(ROOT, 'server', 'tailor.db')

const db = new DatabaseSync(DB_PATH)
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    updatedAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    body TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS counters (
    day TEXT PRIMARY KEY,
    seq INTEGER NOT NULL
  );
`)

const selectAll = db.prepare(
  'SELECT id, updatedAt, deleted, body FROM orders ORDER BY createdAt DESC',
)
const selectOne = db.prepare('SELECT updatedAt, deleted, body FROM orders WHERE id = ?')
const upsert = db.prepare(`
  INSERT INTO orders (id, updatedAt, createdAt, deleted, body)
  VALUES (?, ?, ?, 0, ?)
  ON CONFLICT(id) DO UPDATE SET
    updatedAt = excluded.updatedAt,
    createdAt = excluded.createdAt,
    deleted = 0,
    body = excluded.body
  WHERE excluded.updatedAt >= orders.updatedAt
`)
const markDeleted = db.prepare(
  'UPDATE orders SET deleted = 1, updatedAt = ?, body = ? WHERE id = ?',
)
const bumpCounter = db.prepare(`
  INSERT INTO counters (day, seq) VALUES (?, 1)
  ON CONFLICT(day) DO UPDATE SET seq = seq + 1
  RETURNING seq
`)

/** Next order number for today, handed out by the server so two tablets can
 *  never mint the same id. */
function nextId(now = new Date()) {
  const day = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const { seq } = bumpCounter.get(day)
  return `ORD-${day}-${String(seq).padStart(2, '0')}`
}

const pad = (n) => String(n).padStart(2, '0')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(body)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

async function serveStatic(req, res, pathname) {
  // Anything not under /api is the single-page app.
  const rel = pathname === '/' ? 'index.html' : normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let file = join(DIST, rel)
  try {
    const info = await stat(file)
    if (info.isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(DIST, 'index.html')
  }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found. Run `npm run build` first.')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const { pathname } = url

  // The shop's own network only — no credentials, so keep it same-origin plus
  // the dev server during development.
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  try {
    if (pathname === '/api/health') {
      return send(res, 200, { ok: true, at: Date.now() })
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      const rows = selectAll.all().map((row) => ({
        ...JSON.parse(row.body),
        updatedAt: row.updatedAt,
        deleted: Boolean(row.deleted),
      }))
      return send(res, 200, { orders: rows })
    }

    // Reserve an id without writing the order yet.
    if (pathname === '/api/orders/next-id' && req.method === 'POST') {
      return send(res, 200, { id: nextId() })
    }

    const match = /^\/api\/orders\/([^/]+)$/.exec(pathname)
    if (match) {
      const id = decodeURIComponent(match[1])

      if (req.method === 'GET') {
        const row = selectOne.get(id)
        if (!row || row.deleted) return send(res, 404, { error: 'not found' })
        return send(res, 200, { order: JSON.parse(row.body) })
      }

      if (req.method === 'PUT') {
        const order = await readBody(req)
        if (!order?.id || order.id !== id) return send(res, 400, { error: 'id mismatch' })
        const updatedAt = Number(order.updatedAt) || Date.now()
        upsert.run(id, updatedAt, Number(order.createdAt) || updatedAt, JSON.stringify(order))
        const row = selectOne.get(id)
        return send(res, 200, { order: JSON.parse(row.body), updatedAt: row.updatedAt })
      }

      if (req.method === 'DELETE') {
        const row = selectOne.get(id)
        if (row) {
          // Kept as a tombstone so other tablets learn about the deletion.
          markDeleted.run(Date.now(), row.body, id)
        }
        return send(res, 200, { ok: true })
      }
    }

    if (pathname.startsWith('/api/')) return send(res, 404, { error: 'unknown endpoint' })

    return await serveStatic(req, res, pathname)
  } catch (error) {
    console.error(error)
    return send(res, 500, { error: String(error?.message ?? error) })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tailor server on http://0.0.0.0:${PORT} (db: ${DB_PATH})`)
})

// Containers stop with a signal; close the database cleanly so no write is torn.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close()
      process.exit(0)
    })
  })
}
