import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { c as clearUserSession } from '../../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../_/mongo.mjs';
import 'mongodb';

const logout_post = defineEventHandler((event) => {
  clearUserSession(event);
  return { ok: true };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
