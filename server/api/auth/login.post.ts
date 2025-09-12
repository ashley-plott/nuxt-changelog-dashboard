
// server/api/auth/login.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../utils/mongo'
import { verifyPassword } from '../../utils/auth'
import { setUserSession } from '../../utils/session'

export default defineEventHandler( async (event) => {
  const { email: emailRaw, password } = await readBody(event) as any
  const email = (emailRaw || '').toString().trim().toLowerCase()
  if (!email || !password) throw createError({ statusCode: 400, statusMessage: 'email and password required' })
  const db = await getDb()
  const user = await db.collection('users').findOne({ email })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  if (!verifyPassword(password, user.password)) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  await setUserSession(event, String(user._id), user.role, 30)
  return { ok: true, user: { id: String(user._id), email: user.email, name: user.name, role: user.role } }
})
