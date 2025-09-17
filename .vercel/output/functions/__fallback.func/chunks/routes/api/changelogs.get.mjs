import { d as defineEventHandler, g as getQuery } from '../../nitro/nitro.mjs';
import { g as getDb } from '../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const changelogs_get = defineEventHandler(async (event) => {
  const q = getQuery(event);
  const site = q.site || "";
  const env = q.env || "";
  const pkg = q.pkg || "";
  const limit = Math.min(parseInt(q.limit || "50", 10), 200);
  const from = q.from ? new Date(String(q.from)) : null;
  const to = q.to ? new Date(String(q.to)) : null;
  const filter = {};
  if (site) filter["site.id"] = site;
  if (env) filter["site.env"] = env;
  if (from || to) {
    filter.receivedAt = {};
    if (from) filter.receivedAt.$gte = from;
    if (to) filter.receivedAt.$lte = to;
  }
  if (pkg) {
    const rx = new RegExp(pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { "changes.updated.name": rx },
      { "changes.added.name": rx },
      { "changes.removed.name": rx }
    ];
  }
  const db = await getDb();
  const items = await db.collection("changelogs").find(filter, { sort: { receivedAt: -1, "run.timestamp": -1 }, limit }).toArray();
  return { items };
});

export { changelogs_get as default };
//# sourceMappingURL=changelogs.get.mjs.map
