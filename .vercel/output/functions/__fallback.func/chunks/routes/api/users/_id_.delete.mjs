import { g as getDb } from '../../../_/mongo.mjs';
import { a as requireRole } from '../../../_/session.mjs';
import { d as defineEventHandler, c as createError } from '../../../nitro/nitro.mjs';
import 'mongodb';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';

const _id__delete = defineEventHandler(async (event) => {
  var _a;
  await requireRole(event, ["admin"]);
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  const db = await getDb();
  const count = await db.collection("users").countDocuments();
  if (count <= 1) throw createError({ statusCode: 400, statusMessage: "Cannot delete the last user" });
  await db.collection("users").deleteOne({ _id: new (await import('mongodb')).ObjectId(id) });
  return { ok: true };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
