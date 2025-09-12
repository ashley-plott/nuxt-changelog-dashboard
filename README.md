
# Nuxt Changelog Dashboard — MongoDB Starter

This is a plug‑and‑play Nuxt 3 dashboard that ingests dependency changelog runs from multiple sites and stores them in **MongoDB**.

## Quick start

```bash
pnpm install
cp .env.example .env
# edit .env with your secrets and Mongo URI
pnpm dev
# open http://localhost:3000 (auto-redirects to /dashboard)
```

## API routes

- `POST /api/changelogs` — ingest (Bearer + HMAC). Upserts by `(site.id, site.env, run.timestamp)`.
- `GET  /api/changelogs?site=ID&env=ENV&limit=50&from=ISO&to=ISO&pkg=vendor/package` — list with filters.
- `GET  /api/changelogs/latest?site=ID&env=ENV` — latest single.
- `GET  /api/sites` — discover sites and environments.

## Env (.env)

```env
NUXT_API_KEY=your-bearer-key
NUXT_HMAC_SECRET=your-long-random-secret
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=nuxt_changelogs
```

## Database structure (MongoDB)

**Database:** `nuxt_changelogs` (configurable via `MONGODB_DB`)

**Collection:** `changelogs`

**Document shape:** see `db_schema.json`. Typical document:

```json
{
  "site": { "id": "cc-london", "name": "Clements & Church", "env": "production" },
  "run":  { "timestamp": "2025-09-12T10:41:00Z", "php_version": "8.3.10", "composer": "2.7.7", "git_sha": "abc123", "git_branch": "main", "ci_url": "https://ci/build/123" },
  "summary": { "updated_count": 2, "added_count": 0, "removed_count": 1, "has_changes": true },
  "changes": {
    "updated": [{ "name": "vendor/a", "old": "1.0.0", "new": "1.1.0" }],
    "added":   [{ "name": "vendor/b", "new": "0.9.0" }],
    "removed": [{ "name": "vendor/c", "old": "2.3.4" }]
  },
  "_createdAt": "2025-09-12T10:41:02.123Z"
}
```

### Indexes (created automatically on first connection)

1. **Unique per site/env/timestamp** (also useful for newest-first queries with equality on site+env):
   ```js
   { "site.id": 1, "site.env": 1, "run.timestamp": -1 }, unique: true
   ```

2. **Global newest-first**:
   ```js
   { "run.timestamp": -1 }
   ```

3. **Package name search** (multikey). Separate single-field indexes (Mongo disallows multiple array fields in one compound index):
   ```js
   { "changes.updated.name": 1 }
   { "changes.added.name": 1 }
   { "changes.removed.name": 1 }
   ```

> These support the dashboard queries and the `pkg` filter.

## Securing ingestion

- **Bearer:** `Authorization: Bearer $NUXT_API_KEY`
- **HMAC:** `X-Nonce` + `X-Signature` where signature = `base64(hmac_sha256(NUXT_HMAC_SECRET, nonce + '.' + rawJson))`

## PHP sender (example)

```php
$api = getenv('NUXT_API_URL') ?: 'http://localhost:3000/api/changelogs';
$key = getenv('NUXT_API_KEY');
$secret = getenv('NUXT_HMAC_SECRET');
$payload = ['site'=>['id'=>'cc-london','name'=>'Clements & Church','env'=>'production'],'run'=>['timestamp'=>gmdate('c')],'summary'=>['updated_count'=>1,'added_count'=>0,'removed_count'=>0,'has_changes'=>true],'changes'=>['updated'=>[['name'=>'vendor/a','old'=>'1.0','new'=>'1.1']], 'added'=>[], 'removed'=>[]]];
$body = json_encode($payload);
$nonce = bin2hex(random_bytes(16));
$sig = base64_encode(hash_hmac('sha256', $nonce.'.'.$body, $secret, true));
$ch = curl_init($api);
curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer '.$key,'X-Nonce: '.$nonce,'X-Signature: '.$sig],CURLOPT_POSTFIELDS=>$body]);
$res = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
echo "HTTP $http\n$res\n";
```

## Deploying

- **Local dev:** `pnpm dev`
- **Build for prod:** `pnpm build` then `pnpm start`
- **Vercel/Netlify:** Works out of the box. Set the same `.env` variables in your host. MongoDB Atlas recommended.

## Notes

- If you need to attach big files later, add an S3 bucket and store file URLs in the doc (bucket name + key).
- To prune old runs, add a scheduled job to delete documents older than N days for non-production envs.
