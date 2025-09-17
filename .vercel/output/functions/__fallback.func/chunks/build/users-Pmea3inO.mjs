import { v as vueExports, s as serverRenderer_cjs_prodExports } from './server.mjs';
import { u as useFetch } from './fetch-B97h_p_l.mjs';
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
import 'perfect-debounce';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "users",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const roles = ["viewer", "manager", "admin"];
    const { data, refresh, pending, error } = ([__temp, __restore] = vueExports.withAsyncContext(() => useFetch("/api/users", "$UyU86ksozc")), __temp = await __temp, __restore(), __temp);
    const form = vueExports.reactive({ email: "", name: "", role: "viewer", password: "" });
    const creating = vueExports.ref(false);
    const createMsg = vueExports.ref(null);
    const createErr = vueExports.ref(null);
    const revealPass = vueExports.ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      var _a;
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "p-6 space-y-6" }, _attrs))}><div class="flex items-center gap-3"><h1 class="text-2xl font-bold">Users</h1></div><div class="rounded-2xl border bg-white p-5 shadow-sm"><h2 class="text-lg font-semibold mb-3">Add user</h2><div class="grid grid-cols-1 md:grid-cols-4 gap-3"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(form).email)} type="email" placeholder="Email" class="border rounded px-3 py-2 w-full"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(form).name)} placeholder="Name" class="border rounded px-3 py-2 w-full"><select class="border rounded px-3 py-2 w-full"><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(roles, (r) => {
        _push(`<option${serverRenderer_cjs_prodExports.ssrRenderAttr("value", r)}${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(form).role) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(form).role, r) : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(form).role, r)) ? " selected" : ""}>${serverRenderer_cjs_prodExports.ssrInterpolate(r)}</option>`);
      });
      _push(`<!--]--></select><div class="flex items-center gap-2"><input${serverRenderer_cjs_prodExports.ssrRenderDynamicModel(vueExports.unref(revealPass) ? "text" : "password", vueExports.unref(form).password, null)}${serverRenderer_cjs_prodExports.ssrRenderAttr("type", vueExports.unref(revealPass) ? "text" : "password")} placeholder="Password (optional)" class="border rounded px-3 py-2 w-full"><button class="text-xs underline">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(revealPass) ? "Hide" : "Show")}</button></div></div><div class="mt-3 flex items-center gap-3"><button${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(creating)) ? " disabled" : ""} class="px-4 py-2 rounded bg-black text-white">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(creating) ? "Creating\u2026" : "Create user")}</button>`);
      if (vueExports.unref(createMsg)) {
        _push(`<p class="text-emerald-700 text-sm">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(createMsg))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(createErr)) {
        _push(`<p class="text-red-600 text-sm">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(createErr))}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><p class="text-xs text-gray-500 mt-2"> If no password is provided, a temporary one will be generated and shown once. </p></div>`);
      if (vueExports.unref(pending)) {
        _push(`<div>Loading\u2026</div>`);
      } else if (vueExports.unref(error)) {
        _push(`<div class="text-red-600">Failed to load users.</div>`);
      } else {
        _push(`<table class="min-w-full text-sm border rounded-xl bg-white overflow-hidden"><thead class="bg-gray-50"><tr class="text-left"><th class="py-2 px-3">Email</th><th class="py-2 px-3">Name</th><th class="py-2 px-3">Role</th><th class="py-2 px-3"></th></tr></thead><tbody><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(((_a = vueExports.unref(data)) == null ? void 0 : _a.users) || [], (u) => {
          _push(`<tr class="border-t"><td class="py-2 px-3">${serverRenderer_cjs_prodExports.ssrInterpolate(u.email)}</td><td class="py-2 px-3">${serverRenderer_cjs_prodExports.ssrInterpolate(u.name)}</td><td class="py-2 px-3"><select${serverRenderer_cjs_prodExports.ssrRenderAttr("value", u.role)} class="border rounded px-2 py-1"><!--[-->`);
          serverRenderer_cjs_prodExports.ssrRenderList(roles, (r) => {
            _push(`<option${serverRenderer_cjs_prodExports.ssrRenderAttr("value", r)}>${serverRenderer_cjs_prodExports.ssrInterpolate(r)}</option>`);
          });
          _push(`<!--]--></select></td><td class="py-2 px-3 text-right"><button class="text-red-600 text-sm">Delete</button></td></tr>`);
        });
        _push(`<!--]--></tbody></table>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin/users.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=users-Pmea3inO.mjs.map
