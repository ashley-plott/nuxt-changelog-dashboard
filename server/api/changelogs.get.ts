
// server/api/changelogs.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { getDb } from '../utils/mongo'

export default defineEventHandler( async (event) => {
  const q = getQuery(event)
  const site = (q.site as string) || null
  const env  = (q.env as string) || null
  const limit = Math.min(parseInt((q.limit as string) || '50', 10), 200)
  const from = (q.from as string) || null
  const to   = (q.to as string) || null
  const pkg  = (q.pkg as string) || null // optional: filter by package name

  const db = await getDb()
  const coll = db.collection('changelogs')

  const filter: any = {}
  if (site) filter['site.id'] = site
  if (env)  filter['site.env'] = env
  if (from || to) {
    filter['run.timestamp'] = {}
    if (from) filter['run.timestamp'].$gte = from
    if (to)   filter['run.timestamp'].$lte = to
  }
  if (pkg) {
    filter.$or = [
      { 'changes.updated.name': pkg },
      { 'changes.added.name': pkg },
      { 'changes.removed.name': pkg },
    ]
  }

  const items = await coll
    .find(filter, { sort: { 'run.timestamp': -1 }, limit })
    .toArray()

  return { items }
})
