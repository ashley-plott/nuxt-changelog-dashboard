import { d as defineEventHandler, g as getQuery } from '../../../../nitro/nitro.mjs';
import { g as getDb } from '../../../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const notes_get = defineEventHandler(async (event) => {
  var _a;
  const siteId = (_a = event.context.params) == null ? void 0 : _a.id;
  const q = getQuery(event);
  const env = q.env || void 0;
  const limit = Math.min(parseInt(q.limit || "100", 10), 200);
  const db = await getDb();
  const filter = { "site.id": siteId };
  if (env) filter["site.env"] = env;
  const items = await db.collection("notes").find(filter, { sort: { pinned: -1, updatedAt: -1 }, limit }).toArray();
  return { items };
});

export { notes_get as default };
//# sourceMappingURL=notes.get.mjs.map
