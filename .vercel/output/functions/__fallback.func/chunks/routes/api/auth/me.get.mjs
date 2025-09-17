import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { i as isAuthed, r as requireUser } from '../../../_/session.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../_/mongo.mjs';
import 'mongodb';

const me_get = defineEventHandler(async (event) => {
  if (!isAuthed(event)) return { authenticated: false };
  const { user, role, id } = await requireUser(event);
  return { authenticated: true, user: { id, email: user.email, name: user.name, role } };
});

export { me_get as default };
//# sourceMappingURL=me.get.mjs.map
