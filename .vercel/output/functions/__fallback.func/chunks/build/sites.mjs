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
  __name: "sites",
  __ssrInlineRender: true,
  setup(__props) {
    const form = vueExports.reactive({ id: "", name: "", env: "production", renewMonth: (/* @__PURE__ */ new Date()).getMonth() + 1, adminKey: "" });
    const created = vueExports.ref(null);
    const errorMsg = vueExports.ref(null);
    const loading = vueExports.ref(false);
    const schedule = vueExports.ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      var _a;
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "p-6 space-y-8 max-w-3xl" }, _attrs))}><h1 class="text-2xl font-bold">Sites &amp; Maintenance</h1><div class="border rounded-xl p-5 space-y-4"><h2 class="text-lg font-semibold">Add Site</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Site ID (slug)</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(form).id)} class="border rounded px-3 py-2 w-full" placeholder="cc-london"></div><div><label class="block text-sm font-medium">Name</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(form).name)} class="border rounded px-3 py-2 w-full" placeholder="Clements &amp; Church (London)"></div><div><label class="block text-sm font-medium">Environment</label><select class="border rounded px-3 py-2 w-full"><option value="production"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(form).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(form).env, "production") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(form).env, "production")) ? " selected" : ""}>production</option><option value="staging"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(form).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(form).env, "staging") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(form).env, "staging")) ? " selected" : ""}>staging</option><option value="dev"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(form).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(form).env, "dev") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(form).env, "dev")) ? " selected" : ""}>dev</option><option value="test"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(form).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(form).env, "test") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(form).env, "test")) ? " selected" : ""}>test</option></select></div><div><label class="block text-sm font-medium">Renew Month (1-12)</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(form).renewMonth)} type="number" min="1" max="12" class="border rounded px-3 py-2 w-full"><p class="text-xs text-gray-500 mt-1">Pre\u2011renewal is one month before this.</p></div><div class="md:col-span-2"><label class="block text-sm font-medium">Admin Key</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(form).adminKey)} class="border rounded px-3 py-2 w-full" placeholder="Enter NUXT_ADMIN_KEY"></div></div><div class="flex gap-3 pt-2"><button${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(loading)) ? " disabled" : ""} class="px-4 py-2 rounded bg-black text-white">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(loading) ? "Saving\u2026" : "Save & Generate Schedule")}</button><button class="px-4 py-2 rounded border">Load Schedule</button></div>`);
      if (vueExports.unref(errorMsg)) {
        _push(`<p class="text-red-600 text-sm mt-2">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(errorMsg))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(created)) {
        _push(`<div class="mt-4 text-sm"><p class="font-medium">Created/Updated:</p><pre class="bg-gray-50 p-3 rounded overflow-auto">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(created))}</pre></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if ((_a = vueExports.unref(schedule)) == null ? void 0 : _a.items) {
        _push(`<div class="border rounded-xl p-5"><h2 class="text-lg font-semibold mb-3">Schedule</h2><table class="min-w-full text-sm"><thead><tr class="text-left border-b"><th class="py-2 pr-4">Date</th><th class="py-2 pr-4">Labels</th></tr></thead><tbody><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(schedule).items, (it) => {
          var _a2, _b;
          _push(`<tr class="border-b last:border-0"><td class="py-2 pr-4"><code>${serverRenderer_cjs_prodExports.ssrInterpolate(new Date(it.date).toLocaleDateString())}</code></td><td class="py-2 pr-4">`);
          if ((_a2 = it.labels) == null ? void 0 : _a2.preRenewal) {
            _push(`<span class="px-2 py-1 rounded text-xs bg-amber-50">Pre\u2011renewal</span>`);
          } else {
            _push(`<!---->`);
          }
          if ((_b = it.labels) == null ? void 0 : _b.midYear) {
            _push(`<span class="ml-2 px-2 py-1 rounded text-xs bg-blue-50">Mid\u2011year</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</td></tr>`);
        });
        _push(`<!--]--></tbody></table></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/sites.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=sites.mjs.map
