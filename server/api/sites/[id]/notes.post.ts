import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../../utils/mongo'
import { requireUser } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const { id: userId, user } = await requireUser(event)
  const siteId = event.context.params?.id as string
  const body = await readBody(event) as any
  const title = (body?.title || '').toString().trim()
  const text  = (body?.body  || '').toString().trim()
  const pinned = !!body?.pinned
  const env = (body?.env || 'production').toString()

  if (!title && !text) throw createError({ statusCode: 400, statusMessage: 'Empty note' })

  const db = await getDb()
  const doc = {
    site: { id: siteId, env },
    title,
    body: text,
    pinned,
    tags: Array.isArray(body?.tags) ? body.tags.slice(0, 12).map((t:string)=>String(t).slice(0,32)) : [],
    author: { id: String(userId), email: user.email, name: user.name },
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const r = await db.collection('notes').insertOne(doc as any)
  return { ok: true, note: { ...doc, _id: r.insertedId } }
})
