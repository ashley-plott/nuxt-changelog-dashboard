// server/api/sites/ping-all.post.ts
import { defineEventHandler, readBody } from 'h3'
import { getDb } from '../../utils/mongo'
import { requireRole } from '../../utils/session'
import { pingUrl } from '../../utils/ping'  // uses the ping util we added earlier

export const runtime = 'nodejs' // keep this on Node runtime
export const maxBodySize = '1mb'

type Body = {
  concurrency?: number      // how many pings at once
  delayMs?: number          // delay between pings per worker
  staleMinutes?: number     // only ping if lastPingAt older than this
  limit?: number            // cap total processed in one call
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['manager', 'admin'])

  const body = (await readBody<Body>(event)) || {}
  const concurrency = Math.max(1, Math.min(16, Number(body.concurrency ?? 4)))
  const delayMs     = Math.max(0,  Number(body.delayMs ?? 300))
  const staleMin    = Math.max(0,  Number(body.staleMinutes ?? 60))
  const limit       = Math.max(0,  Number(body.limit ?? 0))

  const db = await getDb()
  const cutoff = new Date(Date.now() - staleMin * 60_000)

  // Pull stale (or never pinged) sites
  const query = staleMin
    ? { $or: [{ lastPingAt: { $lt: cutoff } }, { lastPingAt: { $exists: false } }] }
    : {}

  const cursor = db.collection('sites')
    .find(query)
    .sort({ id: 1 })

  const sites = limit ? await cursor.limit(limit).toArray() : await cursor.toArray()

  // Simple in-process queue with N workers
  const queue = sites.slice()
  let ok = 0, fail = 0, processed = 0

  async function sleep(ms: number) {
    if (ms > 0) await new Promise(r => setTimeout(r, ms))
  }

  async function worker() {
    while (queue.length) {
      const s: any = queue.shift()
      if (!s) break

      const url = s.websiteUrl || s.url
      if (!url) {
        await db.collection('sites').updateOne(
          { id: s.id },
          { $set: { lastPingAt: new Date(), lastPing: { ok: false, error: 'No URL' } } }
        )
        fail++; processed++
        await sleep(delayMs)
        continue
      }

      const result = await pingUrl(url, { timeoutMs: 8000 }) // HEAD→GET fallback
      if (result.ok) ok++; else fail++; processed++

      await db.collection('sites').updateOne(
        { id: s.id },
        {
          $set: {
            lastPingAt: new Date(),
            lastPing: { url, ...result }
          }
        }
      )

      await sleep(delayMs)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return {
    ok: true,
    counts: { total: sites.length, processed, ok, fail },
    settings: { concurrency, delayMs, staleMinutes: staleMin, limit: limit || null }
  }
})
