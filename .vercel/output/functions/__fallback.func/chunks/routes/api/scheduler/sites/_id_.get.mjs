import { d as defineEventHandler, g as getQuery, c as createError } from '../../../../nitro/nitro.mjs';
import { g as getDb } from '../../../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const _id__get = defineEventHandler(async (event) => {
  var _a;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  const { env } = getQuery(event);
  const db = await getDb();
  const site = await db.collection("sites").findOne({ id });
  if (!site) throw createError({ statusCode: 404, statusMessage: "Site not found" });
  const filter = { "site.id": id };
  filter["site.env"] = env || site.env;
  const items = await db.collection("maintenance").find(filter, { sort: { date: 1 } }).toArray();
  return {
    site: { id: site.id, name: site.name, env: site.env, renewMonth: site.renewMonth },
    items
  };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
