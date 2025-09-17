import { g as getDb } from '../../../_/mongo.mjs';
import { a as requireRole } from '../../../_/session.mjs';
import { d as defineEventHandler, r as readBody } from '../../../nitro/nitro.mjs';
import 'mongodb';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';

const _id__patch = defineEventHandler(async (event) => {
  var _a;
  await requireRole(event, ["admin"]);
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  const body = await readBody(event);
  const update = {};
  if (body == null ? void 0 : body.name) update.name = String(body.name);
  if ((body == null ? void 0 : body.role) && ["admin", "manager", "viewer"].includes(body.role)) update.role = body.role;
  const db = await getDb();
  await db.collection("users").updateOne({ _id: new (await import('mongodb')).ObjectId(id) }, { $set: update });
  return { ok: true };
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
