// server/api/maintenance/complete.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../utils/mongo'
import { requireRole, getSessionUser } from '../../utils/session'
import { sendMail } from '../../utils/postmark'

function toISO(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0,10)
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['manager','admin'])

  const body = await readBody(event)
  const siteId = String(body?.siteId || '').trim()
  const env    = String(body?.env || 'production').trim()
  const date   = String(body?.date || '').slice(0,10) // yyyy-mm-dd

  if (!siteId || !date) {
    throw createError({ statusCode: 400, statusMessage: 'siteId and date are required' })
  }

  const db = await getDb()
  const now = new Date()
  const user = await getSessionUser(event).catch(() => null)

  // 1) Update maintenance item to Completed (record history)
  const item = await db.collection('maintenance').findOne({ 'site.id': siteId, 'site.env': env, date })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Maintenance item not found' })

  const fromStatus = item.status || 'To-Do'
  await db.collection('maintenance').updateOne(
    { 'site.id': siteId, 'site.env': env, date },
    {
      $set: {
        status: 'Completed',
        completedAt: now,
        updatedAt: now,
        completedBy: user ? { id: user.id, email: user.email, name: user.name } : null,
      },
      $push: {
        statusHistory: {
          at: now,
          by: user ? { id: user.id, email: user.email, name: user.name } : null,
          from: fromStatus,
          to: 'Completed',
          note: body?.note || null,
        }
      }
    }
  )

  // 2) Load site for recipients / subject
  const site = await db.collection('sites').findOne({ id: siteId }) || { id: siteId, env }
  const recipient =
    (site?.primaryContact?.email && site.primaryContact.email.trim()) ||
    process.env.MAIL_TO || // optional global testing fallback
    null

  // 3) Gather package changes close to that date (±30 days)
  const dt = new Date(date + 'T00:00:00.000Z')
  const from = new Date(dt); from.setUTCDate(from.getUTCDate() - 30)
  const to   = new Date(dt); to.setUTCDate(to.getUTCDate() + 7)

  // Find changes by run.timestamp or receivedAt within window
  const changes = await db.collection('changelogs')
    .find({
      'site.id': siteId,
      'site.env': env,
      $or: [
        { 'run.timestamp': { $gte: from.toISOString(), $lte: to.toISOString() } },
        {  receivedAt:     { $gte: from.toISOString(), $lte: to.toISOString() } },
      ]
    })
    .sort({ 'run.timestamp': -1, receivedAt: -1 })
    .limit(100)
    .toArray()

  // Flatten package lists
  type Row = { type: 'updated'|'added'|'removed'; name: string; old?: string; new?: string }
  const rows: Row[] = []
  for (const c of changes) {
    if (c?.changes?.updated) {
      for (const p of c.changes.updated) rows.push({ type: 'updated', name: p.name, old: p.old, new: p.new })
    }
    if (c?.changes?.added) {
      for (const p of c.changes.added) rows.push({ type: 'added', name: p.name, new: p.new })
    }
    if (c?.changes?.removed) {
      for (const p of c.changes.removed) rows.push({ type: 'removed', name: p.name, old: p.old })
    }
  }

  // Build email HTML
  const fmt = (d: string) => new Date(d+'T00:00:00Z').toLocaleDateString()
  const subject = `Maintenance completed — ${site?.name || siteId} (${env}) on ${fmt(date)}`
  const pkgHtml = rows.length
    ? `
      <ul>
        ${rows.map(r => {
          if (r.type === 'updated') return `<li>🔄 <b>${r.name}</b>: ${r.old} → <b>${r.new}</b></li>`
          if (r.type === 'added')   return `<li>➕ <b>${r.name}</b>: <b>${r.new}</b></li>`
          return `<li>➖ <b>${r.name}</b>: ${r.old}</li>`
        }).join('')}
      </ul>
    `
    : '<p>No package changes found in the last 30 days.</p>'

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <h2 style="margin:0 0 6px">Maintenance completed</h2>
      <p style="margin:0 0 12px">
        <b>Site:</b> ${site?.name || siteId} (${siteId})<br/>
        <b>Environment:</b> ${env}<br/>
        <b>Date:</b> ${fmt(date)}<br/>
        ${site?.websiteUrl ? `<b>Website:</b> <a href="${site.websiteUrl}">${site.websiteUrl}</a><br/>` : ''}
        ${site?.gitUrl ? `<b>Repo:</b> <a href="${site.gitUrl}">${site.gitUrl}</a><br/>` : ''}
      </p>
      <h3 style="margin:16px 0 8px">Packages changed around this maintenance</h3>
      ${pkgHtml}
      <p style="margin-top:16px;color:#666;font-size:12px">Triggered by ${user?.name || user?.email || 'system'} at ${new Date().toLocaleString()}.</p>
    </div>
  `

  if (recipient) {
    await sendMail({
      to: recipient,
      subject,
      html
    })
  }

  return {
    ok: true,
    mailed: !!recipient,
    to: recipient || null,
    packageRows: rows.length
  }
})
