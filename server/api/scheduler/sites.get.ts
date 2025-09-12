
import { defineEventHandler } from 'h3'
import { getDb } from '../../utils/mongo'
export default defineEventHandler(async () => {
  const db = await getDb()
  const sites = await db.collection('sites').find({}, { sort: { id: 1 } }).toArray()
  return { sites: sites.map(s => ({ id: s.id, name: s.name, envs: [s.env], renewMonth: s.renewMonth })) }
})
