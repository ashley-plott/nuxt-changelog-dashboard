// server/api/changelogs/latest.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { useStorage } from 'unstorage'

export default defineEventHandler(async (event) => {
  const { site, env = 'dev' } = getQuery(event) as { site?: string; env?: string }
  if (!site) throw createError({ statusCode: 400, statusMessage: 'site query required' })
  const storage = useStorage()
  const data = await storage.getItem(`data:latest/${site}/${env}.json`)
  return data || {}
})
