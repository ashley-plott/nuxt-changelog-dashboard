
# Scheduler APIs (namespaced)

New endpoints:
- POST `/api/scheduler/sites` — add/update a site and generate a 12‑month maintenance schedule (requires header `x-admin-key: NUXT_ADMIN_KEY`).
- GET  `/api/scheduler/sites` — list sites.
- GET  `/api/scheduler/maintenance` — list maintenance items (query: `site`, `env`, `from`, `to`, `limit`).

Env:
- `NUXT_ADMIN_KEY` — set a strong secret in `.env`

Data model:
- **sites**: `{ id, name, env, renewMonth }`
- **maintenance**: `{ site: {id,name,env}, date: ISO8601, labels: {preRenewal, midYear}, kind: 'maintenance', createdAt }`

Schedules:
- Anchor at one month before `renewMonth` (first of month, UTC). If in the past, use next year.
- Generate 6 events at 2‑month intervals: 0, +2, +4, +6, +8, +10.
