
// server/api/users/[id].delete.ts
import { defineEventHandler, createError } from 'h3'

import { getDb } from '#imports'
import { requireRole } from '#imports'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const id = event.context.params?.id as string
  const db = await getDb()
  const count = await db.collection('users').countDocuments()
  if (count <= 1) throw createError({ statusCode: 400, statusMessage: 'Cannot delete the last user' })
  await db.collection('users').deleteOne({ _id: new (await import('mongodb')).ObjectId(id) })
  return { ok: true }
})
