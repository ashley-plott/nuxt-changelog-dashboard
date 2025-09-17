import { _ as __nuxt_component_0 } from './nuxt-link.mjs';
import { v as vueExports, s as serverRenderer_cjs_prodExports } from './server.mjs';
import { u as useFetch } from './fetch.mjs';
import '../nitro/nitro.mjs';
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
import 'perfect-debounce';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "dashboard",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data, pending, error, refresh } = ([__temp, __restore] = vueExports.withAsyncContext(() => useFetch("/api/scheduler/overview", "$lE-HAwt7tD")), __temp = await __temp, __restore(), __temp);
    const tab = vueExports.ref("overview");
    const q = vueExports.ref("");
    const sortBy = vueExports.ref("az");
    const envFilter = vueExports.ref("all");
    function ordinal(n) {
      const s = ["th", "st", "nd", "rd"], v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    function formatRenew(d) {
      if (!d) return "\u2014";
      const dt = new Date(d);
      return `${ordinal(dt.getDate())} ${dt.toLocaleString(void 0, { month: "long" })} ${dt.getFullYear()}`;
    }
    function monthName(m) {
      if (!m) return "";
      return new Date(2e3, (m || 1) - 1, 1).toLocaleString(void 0, { month: "long" });
    }
    const sites = vueExports.computed(() => {
      var _a;
      return ((_a = data.value) == null ? void 0 : _a.sites) || [];
    });
    const filtered = vueExports.computed(() => {
      const term = q.value.trim().toLowerCase();
      let list = sites.value.filter((s) => {
        const matchesQ = !term || String(s.name || "").toLowerCase().includes(term) || String(s.id || "").toLowerCase().includes(term) || String(s.domain || "").toLowerCase().includes(term);
        const matchesEnv = envFilter.value === "all" || String(s.env || "").toLowerCase() === envFilter.value;
        return matchesQ && matchesEnv;
      });
      if (sortBy.value === "az") {
        list = list.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
      } else if (sortBy.value === "renew-asc") {
        list = list.sort((a, b) => new Date(a.nextMaintenance || 0).getTime() - new Date(b.nextMaintenance || 0).getTime());
      } else {
        list = list.sort((a, b) => new Date(b.nextMaintenance || 0).getTime() - new Date(a.nextMaintenance || 0).getTime());
      }
      return list;
    });
    const now = /* @__PURE__ */ new Date();
    const startMonthIdx = now.getUTCMonth();
    const startYear = now.getUTCFullYear();
    const idx = (m) => (Number(m || 0) - 1 + 12) % 12;
    const preIdxOf = (m) => (idx(m) - 2 + 12) % 12;
    const reportIdxOf = (m) => (idx(m) - 1 + 12) % 12;
    const midIdxOf = (m) => (preIdxOf(m) + 6) % 12;
    const monthsOverview = vueExports.computed(() => {
      const out = [];
      const list = sites.value;
      for (let i = 0; i < 12; i++) {
        const monthIdx = (startMonthIdx + i) % 12;
        const year = startYear + Math.floor((startMonthIdx + i) / 12);
        const label = new Date(Date.UTC(year, monthIdx, 1)).toLocaleString(void 0, { month: "long", year: "numeric" });
        const renewals = list.filter((s) => Number(s.renewMonth) === monthIdx + 1);
        const maintenance = list.filter((s) => preIdxOf(Number(s.renewMonth)) === monthIdx || midIdxOf(Number(s.renewMonth)) === monthIdx).map((s) => ({
          ...s,
          preRenewal: preIdxOf(Number(s.renewMonth)) === monthIdx,
          midYear: midIdxOf(Number(s.renewMonth)) === monthIdx
        }));
        const reports = list.filter((s) => reportIdxOf(Number(s.renewMonth)) === monthIdx);
        out.push({ key: `${year}-${monthIdx}`, label, year, monthIdx, renewals, maintenance, reports });
      }
      return out;
    });
    const thisMonth = vueExports.computed(() => monthsOverview.value[0]);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "p-6 space-y-6" }, _attrs))}><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold">Sites</h1><p class="text-sm text-gray-500 mt-1">Search and browse environments</p></div><div class="flex items-center gap-3"><button class="px-4 py-2 rounded-lg bg-black text-white shadow-sm disabled:opacity-60"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(pending)) ? " disabled" : ""}>Refresh</button>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
        to: "/sites",
        class: "px-4 py-2 rounded-lg bg-black text-white shadow-sm"
      }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Add Site`);
          } else {
            return [
              vueExports.createTextVNode("Add Site")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div><div class="inline-flex rounded-xl border bg-gray-50 p-1"><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "overview" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Overview</button><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "months" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Months</button><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "sites" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Sites</button></div>`);
      if (vueExports.unref(pending)) {
        _push(`<div>Loading\u2026</div>`);
      } else if (vueExports.unref(error)) {
        _push(`<div class="text-red-600">Failed to load sites.</div>`);
      } else {
        _push(`<!--[--><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "overview" ? null : { display: "none" })}" class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="rounded-2xl border bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h2 class="text-base font-semibold">Maintenance this month</h2><span class="text-xs rounded-full bg-gray-100 px-2 py-1">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(thisMonth).maintenance.length)}</span></div>`);
        if (vueExports.unref(thisMonth).maintenance.length) {
          _push(`<div class="mt-3 space-y-2"><!--[-->`);
          serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(thisMonth).maintenance, (s) => {
            _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
              key: s.id,
              to: `/site/${s.id}`,
              class: "flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50"
            }, {
              default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
                if (_push2) {
                  _push2(`<div class="min-w-0"${_scopeId}><div class="truncate font-medium"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</div><div class="text-xs text-gray-500 truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.id)} \u2022 <span class="capitalize"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.env)}</span></div></div><div class="flex gap-2 text-xs"${_scopeId}>`);
                  if (s.preRenewal) {
                    _push2(`<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100"${_scopeId}>Pre-renewal</span>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  if (s.midYear) {
                    _push2(`<span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100"${_scopeId}>Mid-year</span>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`</div>`);
                } else {
                  return [
                    vueExports.createVNode("div", { class: "min-w-0" }, [
                      vueExports.createVNode("div", { class: "truncate font-medium" }, vueExports.toDisplayString(s.name || s.id), 1),
                      vueExports.createVNode("div", { class: "text-xs text-gray-500 truncate" }, [
                        vueExports.createTextVNode(vueExports.toDisplayString(s.id) + " \u2022 ", 1),
                        vueExports.createVNode("span", { class: "capitalize" }, vueExports.toDisplayString(s.env), 1)
                      ])
                    ]),
                    vueExports.createVNode("div", { class: "flex gap-2 text-xs" }, [
                      s.preRenewal ? (vueExports.openBlock(), vueExports.createBlock("span", {
                        key: 0,
                        class: "px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100"
                      }, "Pre-renewal")) : vueExports.createCommentVNode("", true),
                      s.midYear ? (vueExports.openBlock(), vueExports.createBlock("span", {
                        key: 1,
                        class: "px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100"
                      }, "Mid-year")) : vueExports.createCommentVNode("", true)
                    ])
                  ];
                }
              }),
              _: 2
            }, _parent));
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<p class="text-sm text-gray-500">No maintenance scheduled this month.</p>`);
        }
        _push(`</div><div class="rounded-2xl border bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h2 class="text-base font-semibold">Reports due this month</h2><span class="text-xs rounded-full bg-gray-100 px-2 py-1">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(thisMonth).reports.length)}</span></div>`);
        if (vueExports.unref(thisMonth).reports.length) {
          _push(`<div class="mt-3 space-y-2"><!--[-->`);
          serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(thisMonth).reports, (s) => {
            _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
              key: s.id,
              to: `/site/${s.id}`,
              class: "flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50"
            }, {
              default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
                if (_push2) {
                  _push2(`<div class="min-w-0"${_scopeId}><div class="truncate font-medium"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</div><div class="text-xs text-gray-500 truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.id)} \u2022 <span class="capitalize"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.env)}</span></div></div><span class="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"${_scopeId}>Report</span>`);
                } else {
                  return [
                    vueExports.createVNode("div", { class: "min-w-0" }, [
                      vueExports.createVNode("div", { class: "truncate font-medium" }, vueExports.toDisplayString(s.name || s.id), 1),
                      vueExports.createVNode("div", { class: "text-xs text-gray-500 truncate" }, [
                        vueExports.createTextVNode(vueExports.toDisplayString(s.id) + " \u2022 ", 1),
                        vueExports.createVNode("span", { class: "capitalize" }, vueExports.toDisplayString(s.env), 1)
                      ])
                    ]),
                    vueExports.createVNode("span", { class: "text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100" }, "Report")
                  ];
                }
              }),
              _: 2
            }, _parent));
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<p class="text-sm text-gray-500">No reports due this month.</p>`);
        }
        _push(`</div><div class="rounded-2xl border bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h2 class="text-base font-semibold">Renewals this month</h2><span class="text-xs rounded-full bg-gray-100 px-2 py-1">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(thisMonth).renewals.length)}</span></div>`);
        if (vueExports.unref(thisMonth).renewals.length) {
          _push(`<div class="mt-3 space-y-2"><!--[-->`);
          serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(thisMonth).renewals, (s) => {
            _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
              key: s.id,
              to: `/site/${s.id}`,
              class: "flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50"
            }, {
              default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
                if (_push2) {
                  _push2(`<div class="min-w-0"${_scopeId}><div class="truncate font-medium"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</div><div class="text-xs text-gray-500 truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.id)} \u2022 <span class="capitalize"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.env)}</span></div></div><span class="text-xs text-gray-600"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(monthName(s.renewMonth))}</span>`);
                } else {
                  return [
                    vueExports.createVNode("div", { class: "min-w-0" }, [
                      vueExports.createVNode("div", { class: "truncate font-medium" }, vueExports.toDisplayString(s.name || s.id), 1),
                      vueExports.createVNode("div", { class: "text-xs text-gray-500 truncate" }, [
                        vueExports.createTextVNode(vueExports.toDisplayString(s.id) + " \u2022 ", 1),
                        vueExports.createVNode("span", { class: "capitalize" }, vueExports.toDisplayString(s.env), 1)
                      ])
                    ]),
                    vueExports.createVNode("span", { class: "text-xs text-gray-600" }, vueExports.toDisplayString(monthName(s.renewMonth)), 1)
                  ];
                }
              }),
              _: 2
            }, _parent));
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<p class="text-sm text-gray-500">No renewals this month.</p>`);
        }
        _push(`</div></div><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "months" ? null : { display: "none" })}" class="space-y-3"><h2 class="text-lg font-semibold">Month-by-month overview</h2><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(monthsOverview), (m) => {
          _push(`<div class="rounded-2xl border bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h3 class="text-base font-semibold">${serverRenderer_cjs_prodExports.ssrInterpolate(m.label)}</h3><div class="flex items-center gap-2 text-xs"><span class="rounded-full bg-gray-100 px-2 py-0.5">Maint: ${serverRenderer_cjs_prodExports.ssrInterpolate(m.maintenance.length)}</span><span class="rounded-full bg-gray-100 px-2 py-0.5">Reports: ${serverRenderer_cjs_prodExports.ssrInterpolate(m.reports.length)}</span><span class="rounded-full bg-gray-100 px-2 py-0.5">Renew: ${serverRenderer_cjs_prodExports.ssrInterpolate(m.renewals.length)}</span></div></div><div class="mt-4 space-y-3"><div><div class="text-xs font-medium text-gray-600 mb-1">Maintenance</div>`);
          if (m.maintenance.length) {
            _push(`<div class="space-y-1"><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(m.maintenance, (s) => {
              _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
                key: s.id,
                to: `/site/${s.id}`,
                class: "flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              }, {
                default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
                  if (_push2) {
                    _push2(`<div class="truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</div><div class="flex gap-2 text-[11px]"${_scopeId}>`);
                    if (s.preRenewal) {
                      _push2(`<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100"${_scopeId}>Pre</span>`);
                    } else {
                      _push2(`<!---->`);
                    }
                    if (s.midYear) {
                      _push2(`<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100"${_scopeId}>Mid</span>`);
                    } else {
                      _push2(`<!---->`);
                    }
                    _push2(`</div>`);
                  } else {
                    return [
                      vueExports.createVNode("div", { class: "truncate" }, vueExports.toDisplayString(s.name || s.id), 1),
                      vueExports.createVNode("div", { class: "flex gap-2 text-[11px]" }, [
                        s.preRenewal ? (vueExports.openBlock(), vueExports.createBlock("span", {
                          key: 0,
                          class: "px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100"
                        }, "Pre")) : vueExports.createCommentVNode("", true),
                        s.midYear ? (vueExports.openBlock(), vueExports.createBlock("span", {
                          key: 1,
                          class: "px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100"
                        }, "Mid")) : vueExports.createCommentVNode("", true)
                      ])
                    ];
                  }
                }),
                _: 2
              }, _parent));
            });
            _push(`<!--]--></div>`);
          } else {
            _push(`<div class="text-xs text-gray-500">No maintenance.</div>`);
          }
          _push(`</div><div><div class="text-xs font-medium text-gray-600 mb-1">Reports</div>`);
          if (m.reports.length) {
            _push(`<div class="space-y-1"><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(m.reports, (s) => {
              _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
                key: s.id,
                to: `/site/${s.id}`,
                class: "flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              }, {
                default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
                  if (_push2) {
                    _push2(`<div class="truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</div><span class="text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100"${_scopeId}>Report</span>`);
                  } else {
                    return [
                      vueExports.createVNode("div", { class: "truncate" }, vueExports.toDisplayString(s.name || s.id), 1),
                      vueExports.createVNode("span", { class: "text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100" }, "Report")
                    ];
                  }
                }),
                _: 2
              }, _parent));
            });
            _push(`<!--]--></div>`);
          } else {
            _push(`<div class="text-xs text-gray-500">No reports.</div>`);
          }
          _push(`</div><div><div class="text-xs font-medium text-gray-600 mb-1">Renewals</div>`);
          if (m.renewals.length) {
            _push(`<div class="space-y-1"><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(m.renewals, (s) => {
              _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
                key: s.id,
                to: `/site/${s.id}`,
                class: "flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              }, {
                default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
                  if (_push2) {
                    _push2(`<div class="truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</div><span class="text-[11px] text-gray-600"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(monthName(s.renewMonth))}</span>`);
                  } else {
                    return [
                      vueExports.createVNode("div", { class: "truncate" }, vueExports.toDisplayString(s.name || s.id), 1),
                      vueExports.createVNode("span", { class: "text-[11px] text-gray-600" }, vueExports.toDisplayString(monthName(s.renewMonth)), 1)
                    ];
                  }
                }),
                _: 2
              }, _parent));
            });
            _push(`<!--]--></div>`);
          } else {
            _push(`<div class="text-xs text-gray-500">No renewals.</div>`);
          }
          _push(`</div></div></div>`);
        });
        _push(`<!--]--></div></div><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "sites" ? null : { display: "none" })}" class="space-y-4"><div class="grid grid-cols-1 lg:grid-cols-12 gap-3"><div class="lg:col-span-6"><div class="relative"><label class="block text-xs text-gray-500 mb-1">Search Client</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(q))} type="search" placeholder="Search sites\u2026" class="w-full border rounded-xl px-4 py-2.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10"></div></div><div class="lg:col-span-3"><label class="block text-xs text-gray-500 mb-1">Sort</label><select class="w-full border rounded-xl px-3 py-2.5 bg-white shadow-sm"><option value="az"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(sortBy)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(sortBy), "az") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(sortBy), "az")) ? " selected" : ""}>A\u2013Z</option><option value="renew-asc"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(sortBy)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(sortBy), "renew-asc") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(sortBy), "renew-asc")) ? " selected" : ""}>Next maintenance \u2191</option><option value="renew-desc"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(sortBy)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(sortBy), "renew-desc") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(sortBy), "renew-desc")) ? " selected" : ""}>Next maintenance \u2193</option></select></div><div class="lg:col-span-1"><label class="block text-xs text-gray-500 mb-1">Env</label><select class="w-full border rounded-xl px-3 py-2.5 bg-white shadow-sm"><option value="all"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(envFilter)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(envFilter), "all") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(envFilter), "all")) ? " selected" : ""}>All</option><option value="production"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(envFilter)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(envFilter), "production") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(envFilter), "production")) ? " selected" : ""}>prod</option><option value="staging"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(envFilter)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(envFilter), "staging") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(envFilter), "staging")) ? " selected" : ""}>stage</option><option value="dev"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(envFilter)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(envFilter), "dev") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(envFilter), "dev")) ? " selected" : ""}>dev</option><option value="test"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(envFilter)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(envFilter), "test") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(envFilter), "test")) ? " selected" : ""}>test</option></select></div></div><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(filtered), (s) => {
          _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
            key: s.id,
            to: `/site/${s.id}`,
            class: "group block rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition"
          }, {
            default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
              var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
              if (_push2) {
                _push2(`<div class="flex items-start justify-between gap-3"${_scopeId}><div class="flex items-center gap-3"${_scopeId}><div class="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center border"${_scopeId}><span class="text-sm font-semibold text-gray-600"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate((s.name || s.id || "?").slice(0, 1).toUpperCase())}</span></div><div${_scopeId}><h3 class="text-base font-semibold leading-tight"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.name || s.id)}</h3><div class="flex items-center gap-2 text-[11px] text-gray-500 truncate mt-0.5"${_scopeId}>`);
                if (s.websiteUrl) {
                  _push2(`<span${_scopeId}><a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", s.websiteUrl)} target="_blank" class="hover:underline"${_scopeId}>Website</a></span>`);
                } else {
                  _push2(`<!---->`);
                }
                if (s.gitUrl) {
                  _push2(`<span${_scopeId}>`);
                  if (s.websiteUrl) {
                    _push2(`<span class="opacity-50"${_scopeId}>\u2022</span>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`<a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", s.gitUrl)} target="_blank" class="hover:underline"${_scopeId}>Repo</a></span>`);
                } else {
                  _push2(`<!---->`);
                }
                if (((_a = s.primaryContact) == null ? void 0 : _a.email) || ((_b = s.primaryContact) == null ? void 0 : _b.name) || ((_c = s.primaryContact) == null ? void 0 : _c.phone)) {
                  _push2(`<span${_scopeId}>`);
                  if (s.websiteUrl || s.gitUrl) {
                    _push2(`<span class="opacity-50"${_scopeId}>\u2022</span>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`<span class="truncate"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(((_d = s.primaryContact) == null ? void 0 : _d.name) || "Contact")} `);
                  if ((_e = s.primaryContact) == null ? void 0 : _e.email) {
                    _push2(`<!--[--> \u2014 <a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", `mailto:${s.primaryContact.email}`)} class="hover:underline"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.primaryContact.email)}</a><!--]-->`);
                  } else if ((_f = s.primaryContact) == null ? void 0 : _f.phone) {
                    _push2(`<!--[--> \u2014 <a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", `tel:${s.primaryContact.phone}`)} class="hover:underline"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.primaryContact.phone)}</a><!--]-->`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`</span></span>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div><div class="flex items-center gap-2 text-xs text-gray-500"${_scopeId}><span${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.id)}</span><span class="h-1 w-1 rounded-full bg-gray-300"${_scopeId}></span><span class="capitalize"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(s.env)}</span></div></div></div><div class="text-right"${_scopeId}><div class="text-xs text-gray-500"${_scopeId}>Next maintenance</div><div class="text-sm font-medium"${_scopeId}>`);
                if (s.nextMaintenance) {
                  _push2(`<span${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(formatRenew(s.nextMaintenance))}</span>`);
                } else {
                  _push2(`<span class="text-gray-500"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(monthName(s.renewMonth))}</span>`);
                }
                _push2(`</div></div></div><div class="mt-4 flex items-center justify-between text-xs text-gray-500"${_scopeId}><span class="inline-flex items-center gap-1 group-hover:text-gray-700"${_scopeId}>Open details \u2192</span>`);
                if ((_g = s.tags) == null ? void 0 : _g.length) {
                  _push2(`<span class="inline-flex gap-1"${_scopeId}><!--[-->`);
                  serverRenderer_cjs_prodExports.ssrRenderList(s.tags.slice(0, 3), (t) => {
                    _push2(`<span class="px-2 py-0.5 rounded-full bg-gray-100 border"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(t)}</span>`);
                  });
                  _push2(`<!--]--></span>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div>`);
              } else {
                return [
                  vueExports.createVNode("div", { class: "flex items-start justify-between gap-3" }, [
                    vueExports.createVNode("div", { class: "flex items-center gap-3" }, [
                      vueExports.createVNode("div", { class: "h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center border" }, [
                        vueExports.createVNode("span", { class: "text-sm font-semibold text-gray-600" }, vueExports.toDisplayString((s.name || s.id || "?").slice(0, 1).toUpperCase()), 1)
                      ]),
                      vueExports.createVNode("div", null, [
                        vueExports.createVNode("h3", { class: "text-base font-semibold leading-tight" }, vueExports.toDisplayString(s.name || s.id), 1),
                        vueExports.createVNode("div", { class: "flex items-center gap-2 text-[11px] text-gray-500 truncate mt-0.5" }, [
                          s.websiteUrl ? (vueExports.openBlock(), vueExports.createBlock("span", { key: 0 }, [
                            vueExports.createVNode("a", {
                              href: s.websiteUrl,
                              target: "_blank",
                              class: "hover:underline"
                            }, "Website", 8, ["href"])
                          ])) : vueExports.createCommentVNode("", true),
                          s.gitUrl ? (vueExports.openBlock(), vueExports.createBlock("span", { key: 1 }, [
                            s.websiteUrl ? (vueExports.openBlock(), vueExports.createBlock("span", {
                              key: 0,
                              class: "opacity-50"
                            }, "\u2022")) : vueExports.createCommentVNode("", true),
                            vueExports.createVNode("a", {
                              href: s.gitUrl,
                              target: "_blank",
                              class: "hover:underline"
                            }, "Repo", 8, ["href"])
                          ])) : vueExports.createCommentVNode("", true),
                          ((_h = s.primaryContact) == null ? void 0 : _h.email) || ((_i = s.primaryContact) == null ? void 0 : _i.name) || ((_j = s.primaryContact) == null ? void 0 : _j.phone) ? (vueExports.openBlock(), vueExports.createBlock("span", { key: 2 }, [
                            s.websiteUrl || s.gitUrl ? (vueExports.openBlock(), vueExports.createBlock("span", {
                              key: 0,
                              class: "opacity-50"
                            }, "\u2022")) : vueExports.createCommentVNode("", true),
                            vueExports.createVNode("span", { class: "truncate" }, [
                              vueExports.createTextVNode(vueExports.toDisplayString(((_k = s.primaryContact) == null ? void 0 : _k.name) || "Contact") + " ", 1),
                              ((_l = s.primaryContact) == null ? void 0 : _l.email) ? (vueExports.openBlock(), vueExports.createBlock(vueExports.Fragment, { key: 0 }, [
                                vueExports.createTextVNode(" \u2014 "),
                                vueExports.createVNode("a", {
                                  href: `mailto:${s.primaryContact.email}`,
                                  class: "hover:underline"
                                }, vueExports.toDisplayString(s.primaryContact.email), 9, ["href"])
                              ], 64)) : ((_m = s.primaryContact) == null ? void 0 : _m.phone) ? (vueExports.openBlock(), vueExports.createBlock(vueExports.Fragment, { key: 1 }, [
                                vueExports.createTextVNode(" \u2014 "),
                                vueExports.createVNode("a", {
                                  href: `tel:${s.primaryContact.phone}`,
                                  class: "hover:underline"
                                }, vueExports.toDisplayString(s.primaryContact.phone), 9, ["href"])
                              ], 64)) : vueExports.createCommentVNode("", true)
                            ])
                          ])) : vueExports.createCommentVNode("", true)
                        ]),
                        vueExports.createVNode("div", { class: "flex items-center gap-2 text-xs text-gray-500" }, [
                          vueExports.createVNode("span", null, vueExports.toDisplayString(s.id), 1),
                          vueExports.createVNode("span", { class: "h-1 w-1 rounded-full bg-gray-300" }),
                          vueExports.createVNode("span", { class: "capitalize" }, vueExports.toDisplayString(s.env), 1)
                        ])
                      ])
                    ]),
                    vueExports.createVNode("div", { class: "text-right" }, [
                      vueExports.createVNode("div", { class: "text-xs text-gray-500" }, "Next maintenance"),
                      vueExports.createVNode("div", { class: "text-sm font-medium" }, [
                        s.nextMaintenance ? (vueExports.openBlock(), vueExports.createBlock("span", { key: 0 }, vueExports.toDisplayString(formatRenew(s.nextMaintenance)), 1)) : (vueExports.openBlock(), vueExports.createBlock("span", {
                          key: 1,
                          class: "text-gray-500"
                        }, vueExports.toDisplayString(monthName(s.renewMonth)), 1))
                      ])
                    ])
                  ]),
                  vueExports.createVNode("div", { class: "mt-4 flex items-center justify-between text-xs text-gray-500" }, [
                    vueExports.createVNode("span", { class: "inline-flex items-center gap-1 group-hover:text-gray-700" }, "Open details \u2192"),
                    ((_n = s.tags) == null ? void 0 : _n.length) ? (vueExports.openBlock(), vueExports.createBlock("span", {
                      key: 0,
                      class: "inline-flex gap-1"
                    }, [
                      (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(s.tags.slice(0, 3), (t) => {
                        return vueExports.openBlock(), vueExports.createBlock("span", {
                          key: t,
                          class: "px-2 py-0.5 rounded-full bg-gray-100 border"
                        }, vueExports.toDisplayString(t), 1);
                      }), 128))
                    ])) : vueExports.createCommentVNode("", true)
                  ])
                ];
              }
            }),
            _: 2
          }, _parent));
        });
        _push(`<!--]--></div></div><!--]-->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/dashboard.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=dashboard.mjs.map
