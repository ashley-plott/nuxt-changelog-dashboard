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

const formLogs_get = defineEventHandler(async (event) => {
  const q = getQuery(event);
  const site = q.site || "";
  const env = q.env || "";
  const email = (q.email || "").trim();
  const limit = Math.min(parseInt(q.limit || "50", 10), 200);
  const from = q.from ? new Date(String(q.from)) : null;
  const to = q.to ? new Date(String(q.to)) : null;
  const filter = {};
  if (site) filter["site.id"] = site;
  if (env) filter["site.env"] = env;
  if (email) filter["entry.email"] = { $regex: email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (from || to) {
    filter.receivedAt = {};
    if (from) filter.receivedAt.$gte = from;
    if (to) filter.receivedAt.$lte = to;
  }
  const db = await getDb();
  const items = await db.collection("form_logs").find(filter, { sort: { receivedAt: -1, "entry.created_at": -1 }, limit }).toArray();
  return { items };
});

export { formLogs_get as default };
//# sourceMappingURL=form-logs.get.mjs.map
