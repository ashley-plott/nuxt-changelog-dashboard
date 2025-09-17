import { d as defineEventHandler, r as readBody, c as createError } from '../../../../../nitro/nitro.mjs';
import { g as getDb } from '../../../../../_/mongo.mjs';
import { r as requireUser } from '../../../../../_/session.mjs';
import { ObjectId } from 'mongodb';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

const _noteId__patch = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const { id: userId, role } = await requireUser(event);
  const siteId = (_a = event.context.params) == null ? void 0 : _a.id;
  const noteId = (_b = event.context.params) == null ? void 0 : _b.noteId;
  const body = await readBody(event);
  const db = await getDb();
  const note = await db.collection("notes").findOne({ _id: new ObjectId(noteId), "site.id": siteId });
  if (!note) throw createError({ statusCode: 404, statusMessage: "Note not found" });
  const isOwner = String((_c = note.author) == null ? void 0 : _c.id) === String(userId);
  const canAdmin = role === "admin" || role === "manager";
  if (!isOwner && !canAdmin) throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  const update = { updatedAt: /* @__PURE__ */ new Date() };
  if ("title" in body) update.title = String(body.title || "");
  if ("body" in body) update.body = String(body.body || "");
  if ("pinned" in body) update.pinned = !!body.pinned;
  if ("tags" in body && Array.isArray(body.tags)) update.tags = body.tags.slice(0, 12).map((t) => String(t).slice(0, 32));
  await db.collection("notes").updateOne({ _id: new ObjectId(noteId) }, { $set: update });
  return { ok: true };
});

export { _noteId__patch as default };
//# sourceMappingURL=_noteId_.patch.mjs.map
