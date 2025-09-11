// server/api/changelogs.post.ts
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { useStorage } from 'unstorage'
import crypto from 'node:crypto'

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
  const raw = await readBody(event)
  const bodyStr = JSON.stringify(raw ?? {})
  verifyHmac(event, bodyStr)

  const storage = useStorage()
  const site = raw?.site?.id
  const env  = raw?.site?.env || 'dev'
  const ts   = raw?.run?.timestamp || new Date().toISOString()
  if (!site) throw createError({ statusCode: 400, statusMessage: 'Missing site.id' })

  const key = `data:changelogs/${site}/${env}/${ts}.json`
  await storage.setItem(key, raw)

  await storage.setItem(`data:latest/${site}/${env}.json`, raw)
  await storage.setItem(`data:latest/${site}/_any.json`, raw)

  return { ok: true, site, env, ts }
})
