// server/api/scheduler/sites/[id].get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { getDb } from '../../../utils/mongo'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id as string
  const { env } = getQuery(event) as { env?: string }

  const db = await getDb()
  const site = await db.collection('sites').findOne({ id })
  if (!site) throw createError({ statusCode: 404, statusMessage: 'Site not found' })

  const filter: any = { 'site.id': id }
  filter['site.env'] = env || site.env

  const items = await db.collection('maintenance')
    .find(filter, { sort: { date: 1 } })
    .toArray()

  return {
    site: { id: site.id, name: site.name, env: site.env, renewMonth: site.renewMonth },
    items
  }
})
