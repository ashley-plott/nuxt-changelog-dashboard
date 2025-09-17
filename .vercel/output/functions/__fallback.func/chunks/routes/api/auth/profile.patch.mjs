import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
import { r as requireUser } from '../../../_/session.mjs';
import { h as hashPassword } from '../../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const profile_patch = defineEventHandler(async (event) => {
  const { id } = await requireUser(event);
  const body = await readBody(event);
  const update = {};
  if (body == null ? void 0 : body.name) update.name = String(body.name);
  if (body == null ? void 0 : body.password) {
    const pw = String(body.password);
    if (pw.length < 8) throw createError({ statusCode: 400, statusMessage: "Password too short" });
    update.password = hashPassword(pw);
  }
  if (!Object.keys(update).length) return { ok: true };
  const db = await getDb();
  await db.collection("users").updateOne({ _id: new (await import('mongodb')).ObjectId(id) }, { $set: update });
  return { ok: true };
});

export { profile_patch as default };
//# sourceMappingURL=profile.patch.mjs.map
