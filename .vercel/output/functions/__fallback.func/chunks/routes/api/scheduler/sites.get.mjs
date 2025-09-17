import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
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
  const docs = await db.collection("sites").find({}, { sort: { id: 1 } }).toArray();
  return {
    sites: docs.map((s) => {
      var _a, _b, _c;
      return {
        id: s.id,
        name: s.name,
        // keep your existing shape if other code expects envs[]
        envs: [s.env],
        renewMonth: s.renewMonth,
        // >>> add these <<<
        websiteUrl: (_a = s.websiteUrl) != null ? _a : null,
        gitUrl: (_b = s.gitUrl) != null ? _b : null,
        primaryContact: (_c = s.primaryContact) != null ? _c : null
      };
    })
  };
});

export { sites_get as default };
//# sourceMappingURL=sites.get.mjs.map
