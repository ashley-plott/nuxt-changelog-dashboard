import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
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

function toISODate(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)).toISOString();
}
function addMonths(d, n) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  date.setUTCMonth(date.getUTCMonth() + n);
  return date;
}
function firstOfMonthUTC(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0, 1));
}

function coerceRenewMonth(m) {
  const n = Number(m);
  if (!n || n < 1 || n > 12) return (/* @__PURE__ */ new Date()).getUTCMonth() + 1;
  return n;
}
function normalizeUrl(u) {
  const s = (u || "").trim();
  if (!s) return "";
  try {
    return new URL(s.startsWith("http") ? s : `https://${s}`).toString();
  } catch {
    return s;
  }
}
const sites_post = defineEventHandler(async (event) => {
  var _a, _b;
  await requireRole(event, ["manager", "admin"]);
  const body = await readBody(event);
  const id = ((body == null ? void 0 : body.id) || "").trim();
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing site id" });
  const name = ((body == null ? void 0 : body.name) || id).trim();
  const env = ((body == null ? void 0 : body.env) || "production").trim();
  const renewMonth = coerceRenewMonth(body == null ? void 0 : body.renewMonth);
  const websiteUrl = normalizeUrl(typeof (body == null ? void 0 : body.websiteUrl) === "string" ? body.websiteUrl : "");
  const gitUrl = normalizeUrl(typeof (body == null ? void 0 : body.gitUrl) === "string" ? body.gitUrl : "");
  const primaryContact = (body == null ? void 0 : body.primaryContact) && typeof body.primaryContact === "object" ? {
    name: (body.primaryContact.name || "").trim(),
    email: (body.primaryContact.email || "").trim(),
    phone: (body.primaryContact.phone || "").trim()
  } : null;
  const rebuild = !!(body == null ? void 0 : body.rebuild);
  const backfillMonths = Math.max(0, Math.min(60, Number((_a = body == null ? void 0 : body.backfillMonths) != null ? _a : 12)));
  const forwardMonths = Math.max(0, Math.min(60, Number((_b = body == null ? void 0 : body.forwardMonths) != null ? _b : 14)));
  const db = await getDb();
  const now = /* @__PURE__ */ new Date();
  const siteSet = { id, name, env, renewMonth, updatedAt: now };
  const siteUnset = {};
  if (body.hasOwnProperty("websiteUrl")) {
    if (websiteUrl) siteSet.websiteUrl = websiteUrl;
    else siteUnset.websiteUrl = "";
  }
  if (body.hasOwnProperty("gitUrl")) {
    if (gitUrl) siteSet.gitUrl = gitUrl;
    else siteUnset.gitUrl = "";
  }
  if (body.hasOwnProperty("primaryContact")) {
    const has = !!((primaryContact == null ? void 0 : primaryContact.name) || (primaryContact == null ? void 0 : primaryContact.email) || (primaryContact == null ? void 0 : primaryContact.phone));
    if (has) siteSet.primaryContact = primaryContact;
    else siteUnset.primaryContact = "";
  }
  const update = { $set: siteSet, $setOnInsert: { createdAt: now } };
  if (Object.keys(siteUnset).length) update.$unset = siteUnset;
  await db.collection("sites").updateOne({ id }, update, { upsert: true });
  if (rebuild) {
    await db.collection("maintenance").deleteMany({ "site.id": id, "site.env": env });
  }
  const thisMonthStart = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth());
  const windowStart = addMonths(thisMonthStart, -backfillMonths);
  const windowEnd = addMonths(thisMonthStart, forwardMonths);
  const rIdx = (renewMonth - 1 + 12) % 12;
  const reportIdx = (rIdx - 1 + 12) % 12;
  const preIdx = (rIdx - 2 + 12) % 12;
  const midIdx = (preIdx + 6) % 12;
  const planned = [];
  const ops = [];
  let cursor = firstOfMonthUTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth());
  const stop = firstOfMonthUTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth() + 1);
  while (cursor < stop) {
    const m = cursor.getUTCMonth();
    const onPre = m === preIdx;
    const onReport = m === reportIdx;
    const onMid = m === midIdx;
    if (onPre || onReport || onMid) {
      const dISO = toISODate(cursor);
      const labels = { preRenewal: onPre, reportDue: onReport, midYear: onMid };
      const ev = {
        site: { id, name, env },
        date: dISO,
        labels,
        kind: onReport ? "report" : "maintenance",
        createdAt: now
      };
      planned.push({ date: dISO, kind: ev.kind, labels });
      ops.push(
        db.collection("maintenance").updateOne(
          { "site.id": id, "site.env": env, date: dISO },
          rebuild ? { $set: ev } : { $setOnInsert: ev },
          { upsert: true }
        )
      );
    }
    cursor = addMonths(cursor, 1);
  }
  await Promise.all(ops);
  const savedSite = await db.collection("sites").findOne({ id });
  return {
    ok: true,
    site: {
      id,
      name,
      env,
      renewMonth,
      websiteUrl: (savedSite == null ? void 0 : savedSite.websiteUrl) || null,
      gitUrl: (savedSite == null ? void 0 : savedSite.gitUrl) || null,
      primaryContact: (savedSite == null ? void 0 : savedSite.primaryContact) || null
    },
    scheduleWindow: {
      from: toISODate(windowStart),
      to: toISODate(windowEnd),
      count: planned.length
    },
    dates: planned
  };
});

export { sites_post as default };
//# sourceMappingURL=sites.post.mjs.map
