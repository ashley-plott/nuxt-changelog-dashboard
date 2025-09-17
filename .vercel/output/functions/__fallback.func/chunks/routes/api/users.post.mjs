import { d as defineEventHandler, r as readBody, c as createError } from '../../nitro/nitro.mjs';
import { g as getDb } from '../../_/mongo.mjs';
import { a as requireRole } from '../../_/session.mjs';
import { h as hashPassword } from '../../_/auth.mjs';
import crypto from 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'mongodb';

function genPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const users_post = defineEventHandler(async (event) => {
  await requireRole(event, ["admin"]);
  const body = await readBody(event);
  const email = ((body == null ? void 0 : body.email) || "").toString().trim().toLowerCase();
  const name = ((body == null ? void 0 : body.name) || "").toString().trim();
  const role = ((body == null ? void 0 : body.role) || "viewer").toString();
  let password = ((body == null ? void 0 : body.password) || "").toString();
  if (!email) throw createError({ statusCode: 400, statusMessage: "email required" });
  if (!["viewer", "manager", "admin"].includes(role)) throw createError({ statusCode: 400, statusMessage: "invalid role" });
  const db = await getDb();
  const exists = await db.collection("users").findOne({ email });
  if (exists) throw createError({ statusCode: 409, statusMessage: "Email already in use" });
  let tempPassword = "";
  if (!password) {
    tempPassword = genPassword();
    password = tempPassword;
  }
  if (password.length < 8) throw createError({ statusCode: 400, statusMessage: "password too short (min 8)" });
  const user = {
    email,
    name: name || email.split("@")[0],
    role,
    password: hashPassword(password),
    createdAt: /* @__PURE__ */ new Date()
  };
  const result = await db.collection("users").insertOne(user);
  return {
    ok: true,
    user: { id: String(result.insertedId), email: user.email, name: user.name, role: user.role },
    tempPassword: tempPassword || void 0
    // show only once if auto-generated
  };
});

export { users_post as default };
//# sourceMappingURL=users.post.mjs.map
