import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
import { a as requireRole } from '../../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

function todayISODateUTC() {
  const now = /* @__PURE__ */ new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
}
const overview_get = defineEventHandler(async (event) => {
  await requireRole(event, ["admin", "manager"]);
  const db = await getDb();
  const sites = await db.collection("sites").find({}).sort({ name: 1, id: 1 }).toArray();
  const cutoff = todayISODateUTC();
  const results = await Promise.all(
    sites.map(async (s) => {
      var _a, _b, _c, _d, _e, _f, _g;
      const next = await db.collection("maintenance").findOne(
        { "site.id": s.id, "site.env": s.env, date: { $gte: cutoff } },
        { sort: { date: 1 }, projection: { date: 1, kind: 1, labels: 1 } }
      );
      return {
        id: s.id,
        name: (_a = s.name) != null ? _a : null,
        env: (_b = s.env) != null ? _b : "production",
        renewMonth: (_c = s.renewMonth) != null ? _c : null,
        nextMaintenance: (_d = next == null ? void 0 : next.date) != null ? _d : null,
        // >>> make these visible to the dashboard <<<
        websiteUrl: (_e = s.websiteUrl) != null ? _e : null,
        gitUrl: (_f = s.gitUrl) != null ? _f : null,
        primaryContact: (_g = s.primaryContact) != null ? _g : null
      };
    })
  );
  return { sites: results };
});

export { overview_get as default };
//# sourceMappingURL=overview.get.mjs.map
