
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getDb } from '../../utils/mongo'
import { addMonths, firstOfMonthUTC, toISODate } from '../../utils/date'

function requireAdmin(event) {
  const k = process.env.NUXT_ADMIN_KEY || ''
  const h = getHeader(event, 'x-admin-key') || ''
  if (!k || h !== k) throw createError({ statusCode: 401, statusMessage: 'Unauthorized (x-admin-key missing or invalid)' })
}
function coerceRenewMonth(m?: any): number {
  const n = Number(m); if (!n || n < 1 || n > 12) return (new Date()).getUTCMonth() + 1; return n
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const id = (body?.id || '').trim()
  const name = (body?.name || id).trim()
  const env = (body?.env || 'production').trim()
  const renewMonth = coerceRenewMonth(body?.renewMonth)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing site id' })

  const db = await getDb()
  const siteDoc = { id, name, env, renewMonth, createdAt: new Date(), updatedAt: new Date() }
  await db.collection('sites').updateOne({ id }, { $set: siteDoc }, { upsert: true })

  const now = new Date(), currentYear = now.getUTCFullYear()
  const anchorMonthIdx = (renewMonth - 2 + 12) % 12
  let anchor = firstOfMonthUTC(currentYear, anchorMonthIdx)
  const monthStartNow = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth())
  if (anchor < monthStartNow) anchor = firstOfMonthUTC(currentYear + 1, anchorMonthIdx)

  const events = []
  for (let i = 0; i < 6; i++) {
    const date = addMonths(anchor, i * 2)
    events.push({
      site: { id, name, env },
      date: toISODate(date),
      labels: { preRenewal: i === 0, midYear: i === 3 },
      kind: 'maintenance',
      createdAt: new Date()
    })
  }
  for (const ev of events) {
    await db.collection('maintenance').updateOne({ 'site.id': id, date: ev.date }, { $setOnInsert: ev }, { upsert: true })
  }
  return { ok: true, site: { id, name, env, renewMonth }, schedule: events }
})
