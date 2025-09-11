// server/api/changelogs.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { useStorage } from 'unstorage'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const site = (q.site as string) || null
  const env  = (q.env as string) || null
  const limit = Math.min(parseInt((q.limit as string) || '50', 10), 200)

  const storage = useStorage()
  const base = site
    ? (env ? `data:changelogs/${site}/${env}/` : `data:changelogs/${site}/`)
    : 'data:changelogs/'

  const keys = await storage.getKeys(base)
  const sorted = keys.sort().reverse().slice(0, limit)
  const items = await Promise.all(sorted.map(k => storage.getItem(k)))
  return { items }
})
