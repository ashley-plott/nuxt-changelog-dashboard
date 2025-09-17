import { d as defineEventHandler, r as readBody, c as createError } from '../../../../nitro/nitro.mjs';
import { g as getDb } from '../../../../_/mongo.mjs';
import { r as requireUser } from '../../../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const notes_post = defineEventHandler(async (event) => {
  var _a;
  const { id: userId, user } = await requireUser(event);
  const siteId = (_a = event.context.params) == null ? void 0 : _a.id;
  const body = await readBody(event);
  const title = ((body == null ? void 0 : body.title) || "").toString().trim();
  const text = ((body == null ? void 0 : body.body) || "").toString().trim();
  const pinned = !!(body == null ? void 0 : body.pinned);
  const env = ((body == null ? void 0 : body.env) || "production").toString();
  if (!title && !text) throw createError({ statusCode: 400, statusMessage: "Empty note" });
  const db = await getDb();
  const doc = {
    site: { id: siteId, env },
    title,
    body: text,
    pinned,
    tags: Array.isArray(body == null ? void 0 : body.tags) ? body.tags.slice(0, 12).map((t) => String(t).slice(0, 32)) : [],
    author: { id: String(userId), email: user.email, name: user.name },
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  const r = await db.collection("notes").insertOne(doc);
  return { ok: true, note: { ...doc, _id: r.insertedId } };
});

export { notes_post as default };
//# sourceMappingURL=notes.post.mjs.map
