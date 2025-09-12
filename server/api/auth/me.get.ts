
// server/api/auth/me.get.ts
import { defineEventHandler } from 'h3'
import { isAuthed, requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  if (!isAuthed(event)) return { authenticated: false }
  const { user, role, id } = await requireUser(event)
  return { authenticated: true, user: { id, email: user.email, name: user.name, role } }
})
