// server/api/scheduler/overview.get.ts
import { defineEventHandler } from 'h3'
import { getDb } from '../../utils/mongo'

function isoTodayUTC() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  return d.toISOString()
}

export default defineEventHandler(async () => {
  const db = await getDb()
  const sites = await db.collection('sites').find({}).sort({ name: 1, id: 1 }).toArray()
  const today = isoTodayUTC()

  const results = await Promise.all(
    sites.map(async (s: any) => {
      const next = await db.collection('maintenance').findOne(
        { 'site.id': s.id, 'site.env': s.env, date: { $gte: today } },
        { sort: { date: 1 } }
      )
      return {
        id: s.id,
        name: s.name,
        env: s.env,
        renewMonth: s.renewMonth,
        nextMaintenance: next?.date || null,
        nextLabels: next?.labels || null
      }
    })
  )

  return { sites: results }
})
