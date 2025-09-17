import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { g as getDb } from '../../_/mongo.mjs';
import { a as requireRole } from '../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const index_get = defineEventHandler(async (event) => {
  await requireRole(event, ["admin"]);
  const db = await getDb();
  const users = await db.collection("users").find({}, { projection: { password: 0 }, sort: { createdAt: -1 } }).toArray();
  return { users: users.map((u) => ({ id: String(u._id), email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })) };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
