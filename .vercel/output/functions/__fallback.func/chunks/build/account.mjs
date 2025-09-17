import { v as vueExports, s as serverRenderer_cjs_prodExports } from './server.mjs';
import 'node:http';
import 'node:https';
import 'node:zlib';
import 'node:stream';
import 'node:buffer';
import 'node:util';
import 'node:url';
import 'node:net';
import 'node:fs';
import 'node:path';
import '../nitro/nitro.mjs';
import 'node:events';
import 'node:crypto';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'vue/server-renderer';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'vue';
import 'unhead/plugins';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "account",
  __ssrInlineRender: true,
  async setup(__props) {
    var _a, _b, _c;
    let __temp, __restore;
    const me = ([__temp, __restore] = vueExports.withAsyncContext(() => $fetch("/api/auth/me")), __temp = await __temp, __restore(), __temp);
    const name = vueExports.ref(((_a = me == null ? void 0 : me.user) == null ? void 0 : _a.name) || "");
    const email = (_b = me == null ? void 0 : me.user) == null ? void 0 : _b.email;
    const role = (_c = me == null ? void 0 : me.user) == null ? void 0 : _c.role;
    const pass1 = vueExports.ref("");
    const pass2 = vueExports.ref("");
    const msg = vueExports.ref(null);
    const err = vueExports.ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "p-6 max-w-2xl space-y-6" }, _attrs))}><div class="flex items-center gap-3"><h1 class="text-2xl font-bold">Account</h1><button class="ml-auto text-sm underline">Logout</button></div><div class="border rounded-xl p-5 space-y-4 bg-white"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Email</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(email))} disabled class="border rounded px-3 py-2 w-full bg-gray-50"></div><div><label class="block text-sm font-medium">Role</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(role))} disabled class="border rounded px-3 py-2 w-full bg-gray-50"></div><div class="md:col-span-2"><label class="block text-sm font-medium">Name</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(name))} class="border rounded px-3 py-2 w-full"></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">New password</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(pass1))} type="password" class="border rounded px-3 py-2 w-full"></div><div><label class="block text-sm font-medium">Confirm password</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(pass2))} type="password" class="border rounded px-3 py-2 w-full"></div></div><div class="flex gap-3"><button class="px-4 py-2 rounded bg-black text-white">Save</button>`);
      if (vueExports.unref(msg)) {
        _push(`<p class="text-emerald-700 text-sm">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(msg))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(err)) {
        _push(`<p class="text-red-600 text-sm">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(err))}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=account.mjs.map
