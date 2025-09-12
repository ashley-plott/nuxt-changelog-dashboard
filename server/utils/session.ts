
// server/utils/session.ts
import { getCookie, setCookie, deleteCookie, H3Event, createError } from 'h3'
import crypto from 'node:crypto'
import { getDb } from './mongo'

const COOKIE_NAME = 'dash_session'

function b64url(input: Buffer | string) {
  const b = typeof input === 'string' ? Buffer.from(input) : input
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function unb64url(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64')
}

function sign(data: string, secret: string) {
  return b64url(crypto.createHmac('sha256', secret).update(data).digest())
}

type SessionPayload = {
  sub: string,     // user id
  role: 'admin' | 'manager' | 'viewer',
  iat: number,
  exp: number,
  v: 1
}

export function createSessionToken(payload: SessionPayload, secret: string) {
  const body = b64url(JSON.stringify(payload))
  const sig = sign(body, secret)
  return `${body}.${sig}`
}

export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [body, sig] = token.split('.', 2)
  if (!body || !sig) return null
  const expected = sign(body, secret)
  if (expected !== sig) return null
  try {
    const payload = JSON.parse(unb64url(body).toString()) as SessionPayload
    if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export async function setUserSession(event: H3Event, userId: string, role: 'admin'|'manager'|'viewer', days = 30) {
  const secret = process.env.NUXT_HMAC_SECRET || process.env.NUXT_ADMIN_KEY || ''
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'Server missing signing secret' })
  const now = Math.floor(Date.now() / 1000)
  const token = createSessionToken({ sub: userId, role, iat: now, exp: now + days*24*3600, v: 1 }, secret)
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: days * 24 * 3600
  })
}

export function clearUserSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function requireUser(event: H3Event) {
  const secret = process.env.NUXT_HMAC_SECRET || process.env.NUXT_ADMIN_KEY || ''
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'Server missing signing secret' })
  const token = getCookie(event, COOKIE_NAME) || ''
  const payload = verifySessionToken(token, secret)
  if (!payload) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  const db = await getDb()
  const user = await db.collection('users').findOne({ _id: new (await import('mongodb')).ObjectId(payload.sub) }, { projection: { password: 0 } })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'User not found' })
  return { id: payload.sub, role: payload.role, user }
}

const roleRank: Record<'viewer'|'manager'|'admin', number> = { viewer: 1, manager: 5, admin: 10 }

export async function requireRole(event: H3Event, allowed: Array<'admin'|'manager'|'viewer'>) {
  const session = await requireUser(event)
  const maxNeeded = Math.max(...allowed.map(r => roleRank[r]))
  if (roleRank[session.role as keyof typeof roleRank] < maxNeeded) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return session
}

export function isAuthed(event: H3Event) {
  const secret = process.env.NUXT_HMAC_SECRET || process.env.NUXT_ADMIN_KEY || ''
  const token = getCookie(event, COOKIE_NAME) || ''
  return !!(secret && verifySessionToken(token, secret))
}
