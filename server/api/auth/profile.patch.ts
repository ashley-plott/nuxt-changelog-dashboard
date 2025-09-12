
// server/api/auth/profile.patch.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../utils/mongo'
import { requireUser } from '../../utils/session'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler( async (event) => {
  const { id } = await requireUser(event)
  const body = await readBody(event) as any
  const update:any = {}
  if (body?.name) update.name = String(body.name)
  if (body?.password) {
    const pw = String(body.password)
    if (pw.length < 8) throw createError({ statusCode: 400, statusMessage: 'Password too short' })
    update.password = hashPassword(pw)
  }
  if (!Object.keys(update).length) return { ok: true }
  const db = await getDb()
  await db.collection('users').updateOne({ _id: new (await import('mongodb')).ObjectId(id) }, { $set: update })
  return { ok: true }
})
