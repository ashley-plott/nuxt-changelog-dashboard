import { y as executeAsync } from '../nitro/nitro.mjs';
import { k as defineNuxtRouteMiddleware, a as useRequestHeaders, n as navigateTo } from './server.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:zlib';
import 'node:stream';
import 'node:util';
import 'node:url';
import 'node:net';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'vue/server-renderer';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'vue';
import 'unhead/plugins';

const guest = defineNuxtRouteMiddleware(async () => {
  let __temp, __restore;
  const headers = useRequestHeaders(["cookie"]);
  const me = ([__temp, __restore] = executeAsync(() => $fetch("/api/auth/me", { headers }).catch(() => ({ authenticated: false }))), __temp = await __temp, __restore(), __temp);
  if (me == null ? void 0 : me.authenticated) return navigateTo("/dashboard");
});

export { guest as default };
//# sourceMappingURL=guest-Dli8qfV5.mjs.map
