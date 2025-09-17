import { d as defineEventHandler, a as getHeader, c as createError, b as readRawBody } from '../../nitro/nitro.mjs';
import crypto from 'node:crypto';
import { g as getDb } from '../../_/mongo.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'mongodb';

const changelogs_post = defineEventHandler(async (event) => {
  var _a, _b;
  const auth = getHeader(event, "authorization") || "";
  const apiKey = process.env.NUXT_API_KEY || "";
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const secret = process.env.NUXT_HMAC_SECRET || "";
  if (!secret) throw createError({ statusCode: 500, statusMessage: "Server missing HMAC secret" });
  const nonce = getHeader(event, "x-nonce") || "";
  const sigHeader = getHeader(event, "x-signature") || "";
  const raw = await readRawBody(event) || "";
  const expected = crypto.createHmac("sha256", secret).update(`${nonce}.${raw}`).digest();
  const expectedB64 = Buffer.from(expected).toString("base64");
  if (!nonce || !sigHeader || !crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expectedB64))) {
    throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
  }
  const payload = JSON.parse(raw);
  if (!((_a = payload == null ? void 0 : payload.site) == null ? void 0 : _a.id) || !((_b = payload == null ? void 0 : payload.run) == null ? void 0 : _b.timestamp)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }
  const db = await getDb();
  await db.collection("changelogs").insertOne({
    ...payload,
    receivedAt: /* @__PURE__ */ new Date()
  });
  return { ok: true };
});

export { changelogs_post as default };
//# sourceMappingURL=changelogs.post.mjs.map
