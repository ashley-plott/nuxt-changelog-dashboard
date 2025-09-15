// server/api/changelogs.post.ts
import { defineEventHandler, createError, getHeader, readRawBody } from 'h3'
import crypto from 'node:crypto'
import { getDb } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  // 1) Bearer
  const auth = getHeader(event, 'authorization') || ''
  const apiKey = process.env.NUXT_API_KEY || ''
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // 2) HMAC(sig = HMAC_SHA256(nonce + "." + rawBody, secret))
  const secret = process.env.NUXT_HMAC_SECRET || ''
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'Server missing HMAC secret' })

  const nonce = getHeader(event, 'x-nonce') || ''
  const sigHeader = getHeader(event, 'x-signature') || ''
  const raw = (await readRawBody(event)) || ''

  const expected = crypto.createHmac('sha256', secret).update(`${nonce}.${raw}`).digest()
  const expectedB64 = Buffer.from(expected).toString('base64')
  if (!nonce || !sigHeader || !crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expectedB64))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  // 3) Parse & basic shape check
  const payload = JSON.parse(raw)
  if (!payload?.site?.id || !payload?.run?.timestamp) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  // 4) Insert (or upsert) into Mongo
  const db = await getDb()
  await db.collection('changelogs').insertOne({
    ...payload,
    receivedAt: new Date()
  })

  return { ok: true }
})
