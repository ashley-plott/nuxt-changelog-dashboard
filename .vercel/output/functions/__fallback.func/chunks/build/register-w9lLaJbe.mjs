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
  __name: "register",
  __ssrInlineRender: true,
  setup(__props) {
    const email = vueExports.ref("");
    const name = vueExports.ref("");
    const password = vueExports.ref("");
    const errorMsg = vueExports.ref(null);
    const loading = vueExports.ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "min-h-screen flex items-center justify-center p-6 bg-gray-50" }, _attrs))}><div class="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm"><h1 class="text-xl font-semibold mb-4">Create admin</h1><p class="text-xs text-gray-600 mb-4">If any user already exists, only admins can create more.</p><div class="space-y-3"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(email))} type="email" placeholder="Email" class="border rounded px-3 py-2 w-full"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(name))} placeholder="Name" class="border rounded px-3 py-2 w-full"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(password))} type="password" placeholder="Password (min 8)" class="border rounded px-3 py-2 w-full"><button${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(loading)) ? " disabled" : ""} class="w-full px-4 py-2 rounded bg-black text-white">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(loading) ? "Creating\u2026" : "Create account")}</button>`);
      if (vueExports.unref(errorMsg)) {
        _push(`<p class="text-red-600 text-sm">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(errorMsg))}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<p class="text-xs text-gray-500">You will be signed in automatically.</p></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/register.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=register-w9lLaJbe.mjs.map
