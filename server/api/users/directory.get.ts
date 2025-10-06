// server/api/users/directory.get.ts
import { defineEventHandler } from 'h3'
import { getDb } from '../../utils/mongo'

// returns [{ id?, name?, email? }]
export default defineEventHandler(async () => {
  const db = await getDb()
  const users = await db.collection('users')
    .find({}, { projection: { email: 1, name: 1 } })
    .toArray()
  return users.map(u => ({ id: String(u._id), name: u.name || '', email: u.email || '' }))
})
