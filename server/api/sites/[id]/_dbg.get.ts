// server/api/scheduler/sites/[id]/_dbg.get.ts
import { defineEventHandler } from 'h3'
import { getDb } from '../../../utils/mongo'

export default defineEventHandler(async (event) => {
  const id = event.context.params!.id as string
  const db = await getDb()
  const doc = await db.collection('sites').findOne({ id })
  // Helpful headers & no cache
  event.node.res.setHeader('x-handler', 'dbg@v1')
  event.node.res.setHeader('Cache-Control', 'no-store')
  // Return minimal proof
  return {
    _handler: 'dbg@v1',
    id: doc?.id,
    hasGroupEmail: Object.prototype.hasOwnProperty.call(doc || {}, 'groupEmail'),
    groupEmail: doc?.groupEmail ?? '__MISSING__',
    keys: doc ? Object.keys(doc) : []
  }
})
