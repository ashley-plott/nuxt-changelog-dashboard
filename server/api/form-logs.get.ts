// server/api/form-logs.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { getDb } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const site  = (q.site as string) || ''
  const env   = (q.env  as string) || ''
  const email = ((q.email as string) || '').trim()
  const limit = Math.min(parseInt((q.limit as string) || '50', 10), 200)
  const from  = q.from ? new Date(String(q.from)) : null
  const to    = q.to   ? new Date(String(q.to))   : null

  const filter: any = {}
  if (site) filter['site.id'] = site
  if (env)  filter['site.env'] = env
  if (email) filter['entry.email'] = { $regex: email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  if (from || to) {
    filter.receivedAt = {}
    if (from) filter.receivedAt.$gte = from
    if (to)   filter.receivedAt.$lte = to
  }

  const db = await getDb()
  const items = await db.collection('form_logs')
    .find(filter, { sort: { receivedAt: -1, 'entry.created_at': -1 }, limit })
    .toArray()

  return { items }
})
