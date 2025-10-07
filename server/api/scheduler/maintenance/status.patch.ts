// server/api/scheduler/maintenance/status.patch.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../../utils/mongo'

type MaintStatus =
  | 'To-Do' | 'In Progress' | 'Awaiting Form Conf'
  | 'Chased Via Email' | 'Chased Via Phone' | 'Completed'

export default defineEventHandler(async (event) => {
  try {
    const { siteId, env, date, status, from, by } = await readBody<{
      siteId: string; env: string; date: string; status: MaintStatus
      from?: MaintStatus | null
      by?: { id?: string; name?: string; email?: string } | null
    }>(event)

    if (!siteId || !env || !date || !status) {
      throw createError({ statusCode: 400, statusMessage: 'siteId, env, date, status required' })
    }

    const db = await getDb()
    const it = await db.collection('maintenance').findOne({ 'site.id': siteId, 'site.env': env, date })
    if (!it) throw createError({ statusCode: 404, statusMessage: 'Maintenance item not found' })

    const now = new Date()
    const prev = (it.status ?? 'To-Do') as MaintStatus

    await db.collection('maintenance').updateOne(
      { _id: it._id },
      {
        $set: { status, updatedAt: now, updatedBy: by ?? null },
        $push: { statusHistory: { at: now, from: from ?? prev, to: status, by: by ?? null } }
      }
    )

    // Optionally send the email here when transitioning to Completed
    // (use fresh read so the new history entry is included)
    if (status === 'Completed' && prev !== 'Completed') {
      const [fresh, siteDoc] = await Promise.all([
        db.collection('maintenance').findOne({ _id: it._id }),
        db.collection('sites').findOne({ id: siteId })
      ])
      // await sendCompletionEmail({ site: siteDoc, item: fresh })
    }

    return { ok: true, previous: prev, status }
  } catch (err: any) {
    console.error('[maintenance/status] error:', err)
    if (err?.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Failed to set status' })
  }
})
