import { d as defineEventHandler, g as getQuery } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const maintenance_get = defineEventHandler(async (event) => {
  const q = getQuery(event);
  const site = q.site || null;
  const env = q.env || null;
  const from = q.from || null;
  const to = q.to || null;
  const limit = Math.min(parseInt(q.limit || "100", 10), 500);
  const db = await getDb();
  const filter = {};
  if (site) filter["site.id"] = site;
  if (env) filter["site.env"] = env;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  const items = await db.collection("maintenance").find(filter, { sort: { date: 1 }, limit }).toArray();
  return { items };
});

export { maintenance_get as default };
//# sourceMappingURL=maintenance.get.mjs.map
