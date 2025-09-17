import { d as defineEventHandler, g as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const latest_get = defineEventHandler(async (event) => {
  const { site, env = "dev" } = getQuery(event);
  if (!site) throw createError({ statusCode: 400, statusMessage: "site query required" });
  const db = await getDb();
  const doc = await db.collection("changelogs").findOne(
    { "site.id": site, "site.env": env },
    { sort: { "run.timestamp": -1 } }
  );
  return doc || {};
});

export { latest_get as default };
//# sourceMappingURL=latest.get.mjs.map
