import { defineEventHandler } from 'h3'
import { getDb } from '../../utils/mongo'

export default defineEventHandler(async () => {
  const db = await getDb()
  const docs = await db.collection('sites')
    .find({}, { sort: { id: 1 } })
    .toArray()

  return {
    sites: docs.map((s: any) => ({
      id: s.id,
      name: s.name,
      // keep your existing shape if other code expects envs[]
      envs: [s.env],
      renewMonth: s.renewMonth,
      // >>> add these <<<
      websiteUrl: s.websiteUrl ?? null,
      gitUrl: s.gitUrl ?? null,
      primaryContact: s.primaryContact ?? null,
    }))
  }
})
