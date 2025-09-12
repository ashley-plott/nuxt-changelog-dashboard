
// server/api/changelogs.post.ts
import { defineEventHandler, readRawBody, createError, getHeader } from 'h3'
import crypto from 'node:crypto'
import { getDb } from '../utils/mongo'

function verifyAuth(event) {
  const key = process.env.NUXT_API_KEY || ''
  const auth = getHeader(event, 'authorization') || ''
  if (!key || !auth.startsWith('Bearer ') || auth.slice(7) !== key) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}

function verifyHmac(event, bodyStr: string) {
  const secret = process.env.NUXT_HMAC_SECRET || ''
  const nonce = getHeader(event, 'x-nonce') || ''
  const signature = getHeader(event, 'x-signature') || ''
  if (!secret || !nonce || !signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing signature headers' })
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${nonce}.${bodyStr}`)
    .digest()
    .toString('base64')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw createError({ statusCode: 401, statusMessage: 'Bad signature' })
  }
}

export default defineEventHandler(async (event) => {
  verifyAuth(event)
  const rawBody = (await readRawBody(event)) || ''
  verifyHmac(event, rawBody as string)
  let body: any
  try {
    body = JSON.parse((rawBody as string) || '{}')
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }

  const site = body?.site?.id
  const env  = body?.site?.env || 'dev'
  const ts   = body?.run?.timestamp || new Date().toISOString()
  if (!site) throw createError({ statusCode: 400, statusMessage: 'Missing site.id' })

  const db = await getDb()
  const doc = { ...body, _createdAt: new Date() }
  try {
    await db.collection('changelogs').updateOne(
      { 'site.id': site, 'site.env': env, 'run.timestamp': ts },
      { $set: doc },
      { upsert: true }
    )
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: 'DB error: ' + (e?.message || e) })
  }

  return { ok: true, site, env, ts }
})
