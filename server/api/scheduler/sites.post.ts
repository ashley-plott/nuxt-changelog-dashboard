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
function normalizeUrl(u?: string): string {
  const s = (u || '').trim()
  if (!s) return ''
  try { return new URL(s.startsWith('http') ? s : `https://${s}`).toString() }
  catch { return s }
}

// Cadence:
//   Renewal month R (1..12) -> index r = R-1 (0..11)
//   Reports due   = r-1 (R-1)
//   Pre-renewal   = r-2 (R-2)
//   Mid-year      = (pre + 6) % 12
export default defineEventHandler(async (event) => {
  await requireRole(event, ['manager', 'admin'])

  const body = await readBody(event)
  const id = (body?.id || '').trim()
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing site id' })

  const name = (body?.name || id).trim()
  const env = (body?.env || 'production').trim()
  const renewMonth = coerceRenewMonth(body?.renewMonth)

  // Optionals
  const websiteUrl = normalizeUrl(typeof body?.websiteUrl === 'string' ? body.websiteUrl : '')
  const gitUrl     = normalizeUrl(typeof body?.gitUrl === 'string' ? body.gitUrl : '')
  const primaryContact = body?.primaryContact && typeof body.primaryContact === 'object'
    ? {
        name:  (body.primaryContact.name  || '').trim(),
        email: (body.primaryContact.email || '').trim(),
        phone: (body.primaryContact.phone || '').trim(),
      }
    : null

  // Rebuild window options
  const rebuild        = !!body?.rebuild
  const backfillMonths = Math.max(0, Math.min(60, Number(body?.backfillMonths ?? 12)))
  const forwardMonths  = Math.max(0, Math.min(60, Number(body?.forwardMonths  ?? 14)))

  const db  = await getDb()
  const now = new Date()

  // Upsert site (clear empty fields with $unset)
  const siteSet: any = { id, name, env, renewMonth, updatedAt: now }
  const siteUnset: any = {}

  if (body.hasOwnProperty('websiteUrl')) {
    if (websiteUrl) siteSet.websiteUrl = websiteUrl
    else siteUnset.websiteUrl = ''
  }
  if (body.hasOwnProperty('gitUrl')) {
    if (gitUrl) siteSet.gitUrl = gitUrl
    else siteUnset.gitUrl = ''
  }
  if (body.hasOwnProperty('primaryContact')) {
    const has = !!(primaryContact?.name || primaryContact?.email || primaryContact?.phone)
    if (has) siteSet.primaryContact = primaryContact
    else siteUnset.primaryContact = ''
  }

  const update: any = { $set: siteSet, $setOnInsert: { createdAt: now } }
  if (Object.keys(siteUnset).length) update.$unset = siteUnset
  await db.collection('sites').updateOne({ id }, update, { upsert: true })

  // Rebuild = wipe all existing items for this site/env
  if (rebuild) {
    await db.collection('maintenance').deleteMany({ 'site.id': id, 'site.env': env })
  }

  // Build generation window (month start)
  const thisMonthStart = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth())
  const windowStart    = addMonths(thisMonthStart, -backfillMonths)
  const windowEnd      = addMonths(thisMonthStart,  forwardMonths)

  // Indices
  const rIdx      = (renewMonth - 1 + 12) % 12
  const reportIdx = (rIdx - 1 + 12) % 12
  const preIdx    = (rIdx - 2 + 12) % 12
  const midIdx    = (preIdx + 6) % 12

  // Walk month-by-month from first-of-windowStart to first-of-(windowEnd+1)
  const planned: Array<{ date: string, kind: 'maintenance'|'report', labels: any }> = []
  const ops: Promise<any>[] = []

  let cursor = firstOfMonthUTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth())
  const stop = firstOfMonthUTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth() + 1)

  while (cursor < stop) {
    const m = cursor.getUTCMonth()
    const onPre    = m === preIdx
    const onReport = m === reportIdx
    const onMid    = m === midIdx

    if (onPre || onReport || onMid) {
      const dISO = toISODate(cursor)
      const labels = { preRenewal: onPre, reportDue: onReport, midYear: onMid }
      const ev = {
        site: { id, name, env },
        date: dISO,
        labels,
        kind: onReport ? 'report' : 'maintenance',
        createdAt: now
      }
      planned.push({ date: dISO, kind: ev.kind, labels })
      ops.push(
        db.collection('maintenance').updateOne(
          { 'site.id': id, 'site.env': env, date: dISO },
          rebuild ? { $set: ev } : { $setOnInsert: ev },
          { upsert: true }
        )
      )
    }

    cursor = addMonths(cursor, 1)
  }

  await Promise.all(ops)

  // Return site (including optionals)
  const savedSite = await db.collection('sites').findOne({ id })
  return {
    ok: true,
    site: {
      id,
      name,
      env,
      renewMonth,
      websiteUrl: savedSite?.websiteUrl || null,
      gitUrl: savedSite?.gitUrl || null,
      primaryContact: savedSite?.primaryContact || null
    },
    scheduleWindow: {
      from: toISODate(windowStart),
      to:   toISODate(windowEnd),
      count: planned.length
    },
    dates: planned
  }
})
