import { defineEventHandler, createError, getHeader, readRawBody } from 'h3'
import crypto from 'node:crypto'
import { getDb } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  // Auth (Bearer)
  const configured = (process.env.NUXT_API_KEY || '').trim()
  const auth = (getHeader(event, 'authorization') || '').trim()
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!configured || token !== configured) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // HMAC
  const secret = (process.env.NUXT_HMAC_SECRET || '').trim()
  const nonce  = (getHeader(event, 'x-nonce') || '').trim()
  const sig    = (getHeader(event, 'x-signature') || '').trim()
  const raw    = (await readRawBody(event)) || ''
  const expected = crypto.createHmac('sha256', secret).update(`${nonce}.${raw}`).digest('base64')
  if (!nonce || !sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  const payload = JSON.parse(raw.toString())
  if (!payload?.entry?.email || !payload?.site?.id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const db = await getDb()
  await db.collection('form_logs').insertOne({ ...payload, receivedAt: new Date() })
  return { ok: true }
})
