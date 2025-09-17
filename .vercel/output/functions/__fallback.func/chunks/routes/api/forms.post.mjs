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

const forms_post = defineEventHandler(async (event) => {
  var _a, _b;
  const configured = (process.env.NUXT_API_KEY || "").trim();
  const auth = (getHeader(event, "authorization") || "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!configured || token !== configured) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  const secret = (process.env.NUXT_HMAC_SECRET || "").trim();
  const nonce = (getHeader(event, "x-nonce") || "").trim();
  const sig = (getHeader(event, "x-signature") || "").trim();
  const raw = await readRawBody(event) || "";
  const expected = crypto.createHmac("sha256", secret).update(`${nonce}.${raw}`).digest("base64");
  if (!nonce || !sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
  }
  const payload = JSON.parse(raw.toString());
  if (!((_a = payload == null ? void 0 : payload.entry) == null ? void 0 : _a.email) || !((_b = payload == null ? void 0 : payload.site) == null ? void 0 : _b.id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }
  const db = await getDb();
  await db.collection("form_logs").insertOne({ ...payload, receivedAt: /* @__PURE__ */ new Date() });
  return { ok: true };
});

export { forms_post as default };
//# sourceMappingURL=forms.post.mjs.map
