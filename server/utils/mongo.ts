
// server/utils/mongo.ts
import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB || 'nuxt_changelogs'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

if (!globalThis._mongoClientPromise) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  })
  globalThis._mongoClientPromise = client.connect()
}

clientPromise = globalThis._mongoClientPromise!

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  const db = client.db(dbName)

  // Indexes
  // 1) Unique per site/env/timestamp (also supports desc sort on timestamp)
  await db.collection('changelogs').createIndex(
    { 'site.id': 1, 'site.env': 1, 'run.timestamp': -1 },
    { name: 'site_env_ts_unique', unique: true }
  )
  // 2) Global newest-first
  await db.collection('changelogs').createIndex(
    { 'run.timestamp': -1 },
    { name: 'ts_desc' }
  )
  // 3) Package name search (multikey indexes; separate due to parallel arrays rule)
  await db.collection('changelogs').createIndex(
    { 'changes.updated.name': 1 },
    { name: 'pkg_updated_name' }
  )
  await db.collection('changelogs').createIndex(
    { 'changes.added.name': 1 },
    { name: 'pkg_added_name' }
  )
  await db.collection('changelogs').createIndex(
    { 'changes.removed.name': 1 },
    { name: 'pkg_removed_name' }
  )

  // users indexes (moved from plugin)
  await db.collection('users').createIndex(
    { email: 1 }, 
    { name: 'user_email_unique', unique: true }
  )
  await db.collection('users').createIndex(
    { role: 1 }, 
    { name: 'user_role' }
  )

  await db.collection('notes').createIndex(
    { 'site.id': 1, pinned: -1, updatedAt: -1 },
    { name: 'notes_site_pin_updated' }
  )
  
  await db.collection('notes').createIndex(
    { 'author.id': 1, 'site.id': 1, createdAt: -1 },
    { name: 'notes_author_site_created' }
  )

  // changelogs
await db.collection('changelogs').createIndex(
  { 'site.id': 1, 'site.env': 1, receivedAt: -1 },
  { name: 'changelogs_site_env_received' }
)
  return db
}
