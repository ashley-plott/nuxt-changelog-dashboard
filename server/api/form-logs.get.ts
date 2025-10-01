import { z } from 'zod'

const qSchema = z.object({
  site: z.string().min(1),
  env: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  email: z.string().email().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export default defineEventHandler(async (event) => {
  const q = qSchema.parse(getQuery(event))
  const storage = useStorage('data:submissions')
  const keys = await storage.getKeys()
  const out: any[] = []

  for (const k of keys) {
    if (!k.endsWith('.json')) continue
    const rec = await storage.getItem<any>(k).catch(() => null)
    if (!rec || rec._kind !== 'gf_submission') continue

    // Filter by site/env
    if (!rec.site || String(rec.site.id) !== q.site) continue
    if (q.env && String(rec.site.env) !== String(q.env)) continue

    // Filter by email
    if (q.email && String(rec.entry?.email || '').toLowerCase() !== q.email.toLowerCase()) continue

    // Filter by date window (use entry.created_at or receivedAt)
    const ts = new Date(rec.entry?.created_at || rec.receivedAt).getTime()
    if (q.from && ts < new Date(q.from).getTime()) continue
    if (q.to && ts > new Date(q.to).getTime()) continue

    // Shape to your FormLog interface
    out.push({
      _id: k,
      site: rec.site,
      form: rec.form,
      entry: rec.entry,
      fields: rec.fieldsMap, // label → value (string)
      run: rec.run,
      receivedAt: rec.receivedAt,
    })
  }

  // Sort newest first, limit
  out.sort((a,b) => new Date(b.entry?.created_at || b.receivedAt).getTime() - new Date(a.entry?.created_at || a.receivedAt).getTime())
  return { items: out.slice(0, q.limit) }
})
