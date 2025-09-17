import { d as defineEventHandler, c as createError, r as readBody } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
import { h as hashPassword } from '../../../_/auth.mjs';
import { s as setUserSession } from '../../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const register_post = defineEventHandler(async (event) => {
  const db = await getDb();
  const usersCount = await db.collection("users").countDocuments();
  const disabled = process.env.DISABLE_REGISTER === "1";
  if (disabled || usersCount > 0) {
    throw createError({ statusCode: 403, statusMessage: "Registration is disabled" });
  }
  const body = await readBody(event);
  const emailRaw = ((body == null ? void 0 : body.email) || "").toString().trim().toLowerCase();
  const name = ((body == null ? void 0 : body.name) || "").toString().trim();
  const password = ((body == null ? void 0 : body.password) || "").toString();
  if (!emailRaw || !password) throw createError({ statusCode: 400, statusMessage: "email and password required" });
  const existing = await db.collection("users").findOne({ email: emailRaw });
  if (existing) throw createError({ statusCode: 409, statusMessage: "Email already in use" });
  const user = {
    email: emailRaw,
    name: name || emailRaw.split("@")[0],
    role: "admin",
    // first user is admin
    password: hashPassword(password),
    createdAt: /* @__PURE__ */ new Date()
  };
  const result = await db.collection("users").insertOne(user);
  await setUserSession(event, String(result.insertedId), "admin", 30);
  return { ok: true, user: { id: String(result.insertedId), email: user.email, name: user.name, role: user.role } };
});

export { register_post as default };
//# sourceMappingURL=register.post.mjs.map
