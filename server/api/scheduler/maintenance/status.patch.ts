// server/api/scheduler/maintenance/status.patch.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../../utils/mongo'
import { requireRole } from '../../../utils/session'

type MaintStatus =
  | 'To-Do'
  | 'In Progress'
  | 'Awaiting Form Conf'
  | 'Chased Via Email'
  | 'Chased Via Phone'
  | 'Completed'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['manager', 'admin'])

  const body = await readBody(event)
  const siteId = String(body?.siteId || '').trim()
  const env    = String(body?.env || '').trim()
  const date   = String(body?.date || '').trim()
  const status = body?.status as MaintStatus

  const ALLOWED: MaintStatus[] = [
    'To-Do','In Progress','Awaiting Form Conf','Chased Via Email','Chased Via Phone','Completed'
  ]
  if (!siteId || !env || !date) throw createError({ statusCode: 400, statusMessage: 'Missing siteId/env/date' })
  if (!ALLOWED.includes(status)) throw createError({ statusCode: 400, statusMessage: 'Invalid status' })

  const db = await getDb()
  const now = new Date()

  const res = await db.collection('maintenance').updateOne(
    { 'site.id': siteId, 'site.env': env, date },
    { $set: { status, updatedAt: now }, $push: { statusHistory: { at: now, status } } }
  )
  if (!res.matchedCount) throw createError({ statusCode: 404, statusMessage: 'Maintenance item not found' })

  return { ok: true }
})
