import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { g as getDb } from '../../../_/mongo.mjs';
import { v as verifyPassword } from '../../../_/auth.mjs';
import { s as setUserSession } from '../../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'mongodb';

const login_post = defineEventHandler(async (event) => {
  const { email: emailRaw, password } = await readBody(event);
  const email = (emailRaw || "").toString().trim().toLowerCase();
  if (!email || !password) throw createError({ statusCode: 400, statusMessage: "email and password required" });
  const db = await getDb();
  const user = await db.collection("users").findOne({ email });
  if (!user) throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  if (!verifyPassword(password, user.password)) throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  await setUserSession(event, String(user._id), user.role, 30);
  return { ok: true, user: { id: String(user._id), email: user.email, name: user.name, role: user.role } };
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
