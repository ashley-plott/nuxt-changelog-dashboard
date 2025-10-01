import { getHeader, createError } from 'h3'
import { z } from 'zod'
import crypto from 'node:crypto'

const payloadSchema = z.object({
  form: z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional().default(''),
  }),
  entry: z.object({
    id: z.union([z.string(), z.number(), z.null()]).optional(),
    created_at: z.string().optional(),
    source_url: z.string().optional().default(''),
    ip: z.string().optional().default(''),
    user_agent: z.string().optional().default(''),
  }),
  fields: z.array(z.object({
    id: z.string(),
    label: z.string().optional().default(''),
    type: z.string().optional().default(''),
    value: z.any().nullable(),
  })),
})

function timingSafeEq(a: string, b: string) {
  const A = Buffer.from(a, 'utf8'); const B = Buffer.from(b, 'utf8')
  return A.length === B.length && crypto.timingSafeEqual(A, B)
}
function verifyHmac(sig: string | null, raw: string, secret: string) {
  if (!sig) return false
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return timingSafeEq(sig, expected)
}
function extractEmail(fields: Array<{ type?: string; value?: any }>) {
  const byType = fields.find(f => (f.type||'').toLowerCase() === 'email' && typeof f.value === 'string' && f.value.includes('@'))
  if (byType?.value) return String(byType.value).trim()
  const guess = fields.find(f => typeof f.value === 'string' && f.value.includes('@'))
  return guess ? String(guess.value).trim() : null
}
function isPlottEmail(email?: string | null) {
  if (!email) return false
  const at = email.lastIndexOf('@'); if (at === -1) return false
  return email.slice(at + 1).toLowerCase() === 'plott.co.uk'
}
function toFieldsMap(fields: Array<{ label?: string; id: string; value: any }>) {
  const map: Record<string,string> = {}
  for (const f of fields) {
    const label = (f.label || `Field ${f.id}`).trim()
    let val = f.value
    if (val == null) { map[label] = '' ; continue }
    if (Array.isArray(val)) val = val.join(', ')
    if (typeof val === 'object') val = JSON.stringify(val)
    map[label] = String(val)
  }
  return map
}

export default defineEventHandler(async (event) => {
  const secret = process.env.NUXT_GRAVITY_SECRET
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'Missing NUXT_GRAVITY_SECRET' })

  const raw = await readRawBody(event, 'utf8')
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'Empty body' })

  const sig = getHeader(event, 'x-signature')
  if (!verifyHmac(sig || null, raw, secret)) throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' }) }
  const v = payloadSchema.safeParse(parsed)
  if (!v.success) throw createError({ statusCode: 422, statusMessage: 'Invalid payload', data: v.error.flatten() })
  const payload = v.data

  // Site metadata from WP (optional but recommended)
  const siteId  = getHeader(event, 'x-site-id') || null
  const siteEnv = (getHeader(event, 'x-site-env') || 'production') as 'production'|'staging'|'dev'|'test'
  const phpVersion = getHeader(event, 'x-php-version') || ''
  const wpVersion  = getHeader(event, 'x-wp-version')  || ''
  const gfVersion  = getHeader(event, 'x-gf-version')  || ''

  // Domain gate
  const email = extractEmail(payload.fields as any)
  if (!isPlottEmail(email)) {
    return { ok: true, forwarded: false, reason: 'Not a @plott.co.uk email' }
  }

  // Build a record that your /api/form-logs will read easily
  const stored = {
    _kind: 'gf_submission',
    receivedAt: new Date().toISOString(),
    site: siteId ? { id: siteId, env: siteEnv } : undefined,
    form: { id: String(payload.form.id), title: payload.form.title || 'Form' },
    entry: { email: email || undefined, created_at: payload.entry.created_at || undefined },
    fieldsMap: toFieldsMap(payload.fields as any),
    run: { php_version: phpVersion, wp_version: wpVersion, gf_version: gfVersion },
    raw: payload, // still keep original for audits
  }

  const storage = useStorage('data:submissions')
  const key = `${Date.now()}_${payload.form.id}_${payload.entry.id ?? 'noid'}.json`
  await storage.setItem(key, stored)

  return { ok: true, forwarded: true, email, formId: String(payload.form.id), site: stored.site }
})
