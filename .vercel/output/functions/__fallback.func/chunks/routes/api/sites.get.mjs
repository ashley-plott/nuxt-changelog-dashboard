import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { g as getDb } from '../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const sites_get = defineEventHandler(async () => {
  const db = await getDb();
  const agg = await db.collection("changelogs").aggregate([
    { $group: { _id: "$site.id", envs: { $addToSet: "$site.env" } } },
    { $project: { _id: 0, id: "$_id", envs: 1 } },
    { $sort: { id: 1 } }
  ]).toArray();
  return { sites: agg };
});

export { sites_get as default };
//# sourceMappingURL=sites.get.mjs.map
