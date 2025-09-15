import { defineEventHandler, getQuery } from 'h3'
import { getDb } from '../../../utils/mongo'

export default defineEventHandler(async (event) => {
  const siteId = event.context.params?.id as string
  const q = getQuery(event)
  const env = (q.env as string) || undefined
  const limit = Math.min(parseInt((q.limit as string) || '100', 10), 200)

  const db = await getDb()
  const filter: any = { 'site.id': siteId }
  if (env) filter['site.env'] = env

  const items = await db.collection('notes')
    .find(filter, { sort: { pinned: -1, updatedAt: -1 }, limit })
    .toArray()

  return { items }
})
