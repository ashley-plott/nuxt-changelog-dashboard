// server/utils/mongo.ts
import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB || 'nuxt_changelogs'

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined }
let clientPromise: Promise<MongoClient>

if (!globalThis._mongoClientPromise) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  globalThis._mongoClientPromise = client.connect()
}
clientPromise = globalThis._mongoClientPromise!

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  const db = client.db(dbName)

  // --- existing indexes you already had ---
  await db.collection('changelogs').createIndex(
    { 'site.id': 1, 'site.env': 1, 'run.timestamp': -1 },
    { name: 'site_env_ts_unique', unique: true }
  )
  await db.collection('changelogs').createIndex(
    { 'run.timestamp': -1 },
    { name: 'ts_desc' }
  )
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
  await db.collection('changelogs').createIndex(
    { 'site.id': 1, 'site.env': 1, receivedAt: -1 },
    { name: 'changelogs_site_env_received' }
  )
  await db.collection('form_logs').createIndex(
    { 'site.id': 1, 'site.env': 1, 'entry.created_at': -1, receivedAt: -1 },
    { name: 'formlogs_site_env_time' }
  )
  await db.collection('form_logs').createIndex(
    { 'entry.email': 1 }, 
    { name: 'formlogs_email' }
  )

  // --- NEW: maintenance indexes ---
  await db.collection('maintenance').createIndex(
    { 'site.id': 1, 'site.env': 1, date: 1 },
    { name: 'maint_site_env_date_unique', unique: true }
  )
  await db.collection('maintenance').createIndex(
    { 'site.id': 1, 'site.env': 1, 'labels.reportDue': 1, date: -1 },
    { name: 'maint_reports_by_site_env_date' }
  )
  await db.collection('maintenance').createIndex(
    { 'site.id': 1, 'site.env': 1, 'labels.preRenewal': 1, 'labels.midYear': 1, date: -1 },
    { name: 'maint_flags_by_site_env_date' }
  )

  return db
}
