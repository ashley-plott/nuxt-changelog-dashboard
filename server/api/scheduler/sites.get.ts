// server/api/scheduler/sites.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { getDb } from '../../utils/mongo'

export default defineEventHandler(async (event) => {
  const { env } = getQuery(event) as { env?: string }
  const db = await getDb()

  // include groupEmail in the projection
  const sites = await db.collection('sites')
    .find(
      env ? { env } : {},
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          env: 1,
          renewMonth: 1,
          websiteUrl: 1,
          gitUrl: 1,
          groupEmail: 1,        // <-- add this
          primaryContact: 1,
          contacts: 1
        }
      }
    )
    .toArray()

  // if you transform, keep groupEmail
  const payload = sites.map(s => ({
    id: s.id,
    name: s.name,
    env: s.env,
    renewMonth: s.renewMonth,
    websiteUrl: s.websiteUrl || null,
    gitUrl: s.gitUrl || null,
    groupEmail: s.groupEmail || null,  // <-- keep this
    primaryContact: s.primaryContact ?? null,
    contacts: Array.isArray(s.contacts) ? s.contacts : []
  }))

  return { sites: payload }
})
