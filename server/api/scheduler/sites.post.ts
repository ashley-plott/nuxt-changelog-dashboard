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
//   Pre-renewal   = r-2 (R-2)  ← cadence anchor (every 2 months)
//   Reports due   = r-1 (R-1)  ← single month per year, not on cadence
//   Mid-year      = (pre + 6) % 12
export default defineEventHandler(async (event) => {
  await requireRole(event, ['manager', 'admin'])

  const body = await readBody(event)
  const id = (body?.id || '').trim()
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing site id' })

  const name       = (body?.name || id).trim()
  const env        = (body?.env || 'production').trim()
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

  // Window & rebuild options
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

  // ----- Build generation window -----
  const thisMonthStart = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth())
  const windowStart    = addMonths(thisMonthStart, -backfillMonths)
  const windowEnd      = addMonths(thisMonthStart,  forwardMonths)
  const stop           = firstOfMonthUTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth() + 1)

  // ----- Indices -----
  const rIdx      = (renewMonth - 1 + 12) % 12
  const preIdx    = (rIdx - 2 + 12) % 12
  const reportIdx = (rIdx - 1 + 12) % 12
  const midIdx    = (preIdx + 6) % 12

  const planned: Array<{ date: string, kind: 'maintenance'|'report', labels: any }> = []
  const ops: Promise<any>[] = []

  // ----- 1) Two-month cadence anchored to preIdx (all 'maintenance') -----
  // Find first cadence date <= windowStart at month preIdx
  let cadence = firstOfMonthUTC(windowStart.getUTCFullYear(), preIdx)
  if (cadence > windowStart) cadence = firstOfMonthUTC(windowStart.getUTCFullYear() - 1, preIdx)

  for (let d = cadence; d < stop; d = addMonths(d, 2)) {
    if (d < windowStart) continue
    const m = d.getUTCMonth()
    const labels = {
      preRenewal: m === preIdx,
      reportDue:  false,             // not on cadence
      midYear:    m === midIdx
    }
    const ev = {
      site: { id, name, env },
      date: toISODate(d),
      labels,
      kind: 'maintenance' as const,
      createdAt: now
    }
    planned.push({ date: ev.date, kind: ev.kind, labels })
    ops.push(
      db.collection('maintenance').updateOne(
        { 'site.id': id, 'site.env': env, date: ev.date },
        rebuild ? { $set: ev } : { $setOnInsert: ev },
        { upsert: true }
      )
    )
  }

  // ----- 2) Report months (R−1) as standalone 'report' items -----
  // Walk month-by-month only to hit reportIdx once per year within the window
  for (let d = firstOfMonthUTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth()); d < stop; d = addMonths(d, 1)) {
    if (d.getUTCMonth() !== reportIdx) continue
    const m = d.getUTCMonth()
    const labels = {
      preRenewal: m === preIdx,
      reportDue:  true,
      midYear:    m === midIdx
    }
    const ev = {
      site: { id, name, env },
      date: toISODate(d),
      labels,
      kind: 'report' as const,
      createdAt: now
    }
    planned.push({ date: ev.date, kind: ev.kind, labels })
    ops.push(
      db.collection('maintenance').updateOne(
        { 'site.id': id, 'site.env': env, date: ev.date },
        rebuild ? { $set: ev } : { $setOnInsert: ev },
        { upsert: true }
      )
    )
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
