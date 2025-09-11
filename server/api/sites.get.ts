// server/api/sites.get.ts
import { defineEventHandler } from 'h3'
import { useStorage } from 'unstorage'

export default defineEventHandler(async () => {
  const storage = useStorage()
  const keys = await storage.getKeys('data:changelogs/')
  const sites = new Map<string, Set<string>>()
  for (const k of keys) {
    // data:changelogs/<site>/<env>/<ts>.json
    const parts = k.split('/')
    if (parts.length >= 5) {
      const site = parts[1]
      const env  = parts[2]
      if (!sites.has(site)) sites.set(site, new Set())
      sites.get(site)!.add(env)
    }
  }
  return {
    sites: Array.from(sites.entries()).map(([id, envs]) => ({ id, envs: Array.from(envs) }))
  }
})
