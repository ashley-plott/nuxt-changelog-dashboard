import { defineEventHandler } from 'h3'
import { getSessionUser } from '../../utils/session'

export default defineEventHandler((event) => {
  const user = getSessionUser(event)
  return { authenticated: !!user, user: user || null }
})
