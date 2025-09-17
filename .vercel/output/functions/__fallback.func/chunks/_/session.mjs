import { c as createError, s as setCookie, e as deleteCookie, f as getCookie } from '../nitro/nitro.mjs';
import crypto from 'node:crypto';
import { g as getDb } from './mongo.mjs';

const COOKIE_NAME = "dash_session";
function b64url(input) {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}
function sign(data, secret) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}
function createSessionToken(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}
function verifySessionToken(token, secret) {
  const [body, sig] = token.split(".", 2);
  if (!body || !sig) return null;
  const expected = sign(body, secret);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(unb64url(body).toString());
    if (typeof payload.exp !== "number" || Date.now() / 1e3 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
async function setUserSession(event, userId, role, days = 30) {
  const secret = process.env.NUXT_HMAC_SECRET || process.env.NUXT_ADMIN_KEY || "";
  if (!secret) throw createError({ statusCode: 500, statusMessage: "Server missing signing secret" });
  const now = Math.floor(Date.now() / 1e3);
  const token = createSessionToken({ sub: userId, role, iat: now, exp: now + days * 24 * 3600, v: 1 }, secret);
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: days * 24 * 3600
  });
}
function clearUserSession(event) {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}
async function requireUser(event) {
  const secret = process.env.NUXT_HMAC_SECRET || process.env.NUXT_ADMIN_KEY || "";
  if (!secret) throw createError({ statusCode: 500, statusMessage: "Server missing signing secret" });
  const token = getCookie(event, COOKIE_NAME) || "";
  const payload = verifySessionToken(token, secret);
  if (!payload) throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new (await import('mongodb')).ObjectId(payload.sub) }, { projection: { password: 0 } });
  if (!user) throw createError({ statusCode: 401, statusMessage: "User not found" });
  return { id: payload.sub, role: payload.role, user };
}
const roleRank = { viewer: 1, manager: 5, admin: 10 };
async function requireRole(event, allowed) {
  const session = await requireUser(event);
  const maxNeeded = Math.max(...allowed.map((r) => roleRank[r]));
  if (roleRank[session.role] < maxNeeded) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  return session;
}
function isAuthed(event) {
  const secret = process.env.NUXT_HMAC_SECRET || process.env.NUXT_ADMIN_KEY || "";
  const token = getCookie(event, COOKIE_NAME) || "";
  return !!(secret && verifySessionToken(token, secret));
}

export { requireRole as a, clearUserSession as c, isAuthed as i, requireUser as r, setUserSession as s };
//# sourceMappingURL=session.mjs.map
