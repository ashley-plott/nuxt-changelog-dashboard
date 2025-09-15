// server/api/scheduler/sites.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../utils/mongo'
import { addMonths, firstOfMonthUTC, toISODate } from '../../utils/date'
import { requireRole } from '../../utils/session'

function coerceRenewMonth(m?: any): number {
  const n = Number(m)
  if (!n || n < 1 || n > 12) return (new Date()).getUTCMonth() + 1
  return n
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['manager', 'admin'])

  const body = await readBody(event)
  const id = (body?.id || '').trim()
  const name = (body?.name || id).trim()
  const env = (body?.env || 'production').trim()
  const renewMonth = coerceRenewMonth(body?.renewMonth)

  // New options
  const rebuild = !!body?.rebuild                                // if true, wipe and regenerate
  const backfillMonths = Math.max(0, Math.min(60, Number(body?.backfillMonths ?? 12)))
  const forwardMonths  = Math.max(0, Math.min(60, Number(body?.forwardMonths  ?? 14)))

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing site id' })

  const db = await getDb()

  // Upsert site doc, preserve createdAt
  const now = new Date()
  await db.collection('sites').updateOne(
    { id },
    {
      $set: { id, name, env, renewMonth, updatedAt: now },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  )

  // Optionally wipe existing maintenance for this site+env
  if (rebuild) {
    await db.collection('maintenance').deleteMany({ 'site.id': id, 'site.env': env })
  }

  // Window to generate (backfill + forward) from the first day of this month
  const thisMonthStart = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth())
  const windowStart = addMonths(thisMonthStart, -backfillMonths)
  const windowEnd   = addMonths(thisMonthStart,  forwardMonths)

  // Pre-renewal month index (0-11): one month before renewMonth
  const preIdx = (renewMonth - 2 + 12) % 12
  const midIdx = (preIdx + 6) % 12

  // Find the first aligned month >= windowStart on the 2-month cadence
  // Start from the pre-renewal month in (windowStart.year or previous), then step +2 until >= windowStart
  let anchor = firstOfMonthUTC(windowStart.getUTCFullYear(), preIdx)
  if (anchor > windowStart) {
    anchor = firstOfMonthUTC(windowStart.getUTCFullYear() - 1, preIdx)
  }
  while (anchor < windowStart) {
    anchor = addMonths(anchor, 2)
  }

  // Generate every 2 months up to windowEnd
  const planned: Array<{ date: string }> = []
  const ops: Promise<any>[] = []
  for (let d = anchor; d <= windowEnd; d = addMonths(d, 2)) {
    const dISO = toISODate(d) // YYYY-MM-DD (UTC)
    const monthIdx = d.getUTCMonth()
    const ev = {
      site: { id, name, env },
      date: dISO,
      labels: {
        preRenewal: monthIdx === preIdx,
        midYear:    monthIdx === midIdx
      },
      kind: 'maintenance',
      createdAt: now
    }
    planned.push({ date: dISO })

    // Ensure one per site+env+date (unique key recommended)
    ops.push(
      db.collection('maintenance').updateOne(
        { 'site.id': id, 'site.env': env, date: dISO },
        rebuild
          ? { $set: ev }          // on rebuild, overwrite
          : { $setOnInsert: ev }, // otherwise only insert if missing
        { upsert: true }
      )
    )
  }
  await Promise.all(ops)

  return {
    ok: true,
    site: { id, name, env, renewMonth },
    // Return the window we touched so you can render immediately
    scheduleWindow: {
      from: toISODate(windowStart),
      to:   toISODate(windowEnd),
      count: planned.length
    },
    dates: planned  // [{ date }]
  }
})
