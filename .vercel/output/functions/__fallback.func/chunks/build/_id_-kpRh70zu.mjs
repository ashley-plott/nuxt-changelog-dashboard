import { _ as __nuxt_component_0 } from './nuxt-link-y97orbN_.mjs';
import { v as vueExports, u as useRoute, a as useRequestHeaders, s as serverRenderer_cjs_prodExports } from './server.mjs';
import { u as useFetch, a as useAsyncData } from './fetch-B97h_p_l.mjs';
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
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props, { expose: __expose }) {
    let __temp, __restore;
    const route = useRoute();
    const id = route.params.id;
    const headers = useRequestHeaders(["cookie"]);
    function firstOfMonthUTC(d = /* @__PURE__ */ new Date()) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
    function formatMonth(d) {
      return d.toLocaleString(void 0, { month: "long", year: "numeric" });
    }
    const start = firstOfMonthUTC(/* @__PURE__ */ new Date());
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      return { start: d, end };
    });
    function inMonth(it, m) {
      const t = it.dateObj.getTime();
      return t >= m.start.getTime() && t < m.end.getTime();
    }
    const toISOOrUndefined = (s) => s ? new Date(s).toISOString() : void 0;
    const { data, pending, error, refresh: refreshSite } = ([__temp, __restore] = vueExports.withAsyncContext(() => useFetch(
      `/api/scheduler/sites/${id}`,
      { headers, key: `site-${id}` },
      "$bbReuBHqlH"
    )), __temp = await __temp, __restore(), __temp);
    const site = vueExports.computed(() => {
      var _a;
      return (_a = data.value) == null ? void 0 : _a.site;
    });
    const items = vueExports.computed(() => {
      var _a;
      return (((_a = data.value) == null ? void 0 : _a.items) || []).map((it) => ({ ...it, dateObj: new Date(it.date) }));
    });
    const tab = vueExports.ref("calendar");
    const me = ([__temp, __restore] = vueExports.withAsyncContext(() => $fetch("/api/auth/me", { headers }).catch(() => ({ authenticated: false }))), __temp = await __temp, __restore(), __temp);
    const authed = !!(me == null ? void 0 : me.authenticated);
    const my = authed ? me.user : null;
    const displayWebsiteUrl = vueExports.computed(() => {
      const s = site.value;
      return (s == null ? void 0 : s.websiteUrl) || (s == null ? void 0 : s.url) || "";
    });
    const displayGitUrl = vueExports.computed(() => {
      var _a;
      return ((_a = site.value) == null ? void 0 : _a.gitUrl) || "";
    });
    const displayContact = vueExports.computed(() => {
      var _a;
      return ((_a = site.value) == null ? void 0 : _a.primaryContact) || null;
    });
    function isRenewalMonthUTC(monthStartUTC) {
      var _a;
      const r = Number(((_a = site.value) == null ? void 0 : _a.renewMonth) || 0);
      if (!r) return false;
      return monthStartUTC.getUTCMonth() === r - 1;
    }
    const selectedEnv = vueExports.ref("");
    vueExports.watchEffect(() => {
      if (site.value && selectedEnv.value === "") selectedEnv.value = site.value.env || "";
    });
    const clLimit = vueExports.ref(20);
    const clPkg = vueExports.ref("");
    const clFrom = vueExports.ref("");
    const clTo = vueExports.ref("");
    const { data: clData, pending: clPending, refresh: clRefresh } = ([__temp, __restore] = vueExports.withAsyncContext(() => useAsyncData(
      `site-changelogs-${id}`,
      () => $fetch("/api/changelogs", { query: {
        site: id,
        env: selectedEnv.value || void 0,
        limit: clLimit.value,
        pkg: clPkg.value || void 0,
        from: toISOOrUndefined(clFrom.value),
        to: toISOOrUndefined(clTo.value)
      }, headers }),
      { watch: [selectedEnv, clLimit, clPkg, clFrom, clTo] }
    )), __temp = await __temp, __restore(), __temp);
    const flLimit = vueExports.ref(20);
    const flEmail = vueExports.ref("");
    const flFrom = vueExports.ref("");
    const flTo = vueExports.ref("");
    const { data: flData, pending: flPending, refresh: flRefresh } = ([__temp, __restore] = vueExports.withAsyncContext(() => useAsyncData(
      `site-formlogs-${id}`,
      () => $fetch("/api/form-logs", { query: {
        site: id,
        env: selectedEnv.value || void 0,
        limit: flLimit.value,
        email: flEmail.value || void 0,
        from: toISOOrUndefined(flFrom.value),
        to: toISOOrUndefined(flTo.value)
      }, headers }),
      { watch: [selectedEnv, flLimit, flEmail, flFrom, flTo] }
    )), __temp = await __temp, __restore(), __temp);
    const notes = vueExports.ref(null);
    async function loadNotes() {
      var _a;
      notes.value = await $fetch(`/api/sites/${id}/notes`, { query: { env: (_a = site.value) == null ? void 0 : _a.env }, headers });
    }
    vueExports.watch(tab, (t) => {
      if (t === "notes" && !notes.value) loadNotes();
    });
    const noteForm = vueExports.reactive({ title: "", body: "", pinned: false });
    const noteSaving = vueExports.ref(false);
    function canEditNote(n) {
      var _a;
      if (!authed) return false;
      return my.role === "admin" || my.role === "manager" || String((_a = n.author) == null ? void 0 : _a.id) === String(my.id);
    }
    const canManageSite = vueExports.computed(() => authed && ((my == null ? void 0 : my.role) === "admin" || (my == null ? void 0 : my.role) === "manager"));
    const det = vueExports.reactive({ name: "", env: "production", renewMonth: 1, websiteUrl: "", gitUrl: "", contactName: "", contactEmail: "", contactPhone: "" });
    vueExports.watchEffect(() => {
      var _a, _b, _c;
      const s = site.value;
      if (!s) return;
      det.name = s.name || "";
      det.env = s.env || "production";
      det.renewMonth = Number(s.renewMonth || 1);
      det.websiteUrl = s.websiteUrl || s.url || "";
      det.gitUrl = s.gitUrl || "";
      det.contactName = ((_a = s.primaryContact) == null ? void 0 : _a.name) || "";
      det.contactEmail = ((_b = s.primaryContact) == null ? void 0 : _b.email) || "";
      det.contactPhone = ((_c = s.primaryContact) == null ? void 0 : _c.phone) || "";
    });
    const detSaving = vueExports.ref(false);
    const detMsg = vueExports.ref(null);
    const detErr = vueExports.ref(null);
    const rb = vueExports.reactive({ backfillMonths: 12, forwardMonths: 14 });
    const rebuilding = vueExports.ref(false);
    const rbMsg = vueExports.ref(null);
    const rbErr = vueExports.ref(null);
    const siteInitial = vueExports.computed(() => {
      var _a, _b;
      return (((_a = site.value) == null ? void 0 : _a.name) || ((_b = site.value) == null ? void 0 : _b.id) || id).slice(0, 1).toUpperCase();
    });
    const siteHostname = vueExports.computed(() => {
      const raw = displayWebsiteUrl.value;
      try {
        return raw ? new URL(raw).hostname : "";
      } catch {
        return "";
      }
    });
    const favPrimary = vueExports.computed(() => siteHostname.value ? `https://www.google.com/s2/favicons?sz=64&domain=${siteHostname.value}` : "");
    const favFallback = vueExports.computed(() => siteHostname.value ? `https://icons.duckduckgo.com/ip3/${siteHostname.value}.ico` : "");
    const favTriedFallback = vueExports.ref(false);
    const favHide = vueExports.ref(false);
    __expose({ refreshSite });
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "space-y-6 md:space-y-8 p-4 sm:p-6" }, _attrs))}><div class="rounded-2xl border bg-white p-5 shadow-sm"><div class="flex items-start gap-4"><div class="h-12 w-12 rounded-2xl border bg-gray-50 flex items-center justify-center overflow-hidden">`);
      if (vueExports.unref(siteHostname) && !vueExports.unref(favHide)) {
        _push(`<img${serverRenderer_cjs_prodExports.ssrRenderAttr("src", vueExports.unref(favTriedFallback) ? vueExports.unref(favFallback) : vueExports.unref(favPrimary))}${serverRenderer_cjs_prodExports.ssrRenderAttr("alt", ((_a = vueExports.unref(site)) == null ? void 0 : _a.name) || ((_b = vueExports.unref(site)) == null ? void 0 : _b.id) || "Site")} class="h-6 w-6" decoding="async" loading="eager">`);
      } else {
        _push(`<span class="text-sm font-semibold text-gray-600">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(siteInitial))}</span>`);
      }
      _push(`</div><div class="min-w-0"><h1 class="text-2xl font-bold truncate">${serverRenderer_cjs_prodExports.ssrInterpolate(((_c = vueExports.unref(site)) == null ? void 0 : _c.name) || ((_d = vueExports.unref(site)) == null ? void 0 : _d.id) || vueExports.unref(id))}</h1><p class="mt-1 text-xs text-gray-500 truncate">${serverRenderer_cjs_prodExports.ssrInterpolate(((_e = vueExports.unref(site)) == null ? void 0 : _e.id) || vueExports.unref(id))} `);
      if ((_f = vueExports.unref(site)) == null ? void 0 : _f.env) {
        _push(`<span> \u2022 <span class="capitalize">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(site).env)}</span></span>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(displayWebsiteUrl)) {
        _push(`<span> \u2022 <a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", vueExports.unref(displayWebsiteUrl))} target="_blank" class="hover:underline">Website</a></span>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(displayGitUrl)) {
        _push(`<span> \u2022 <a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", vueExports.unref(displayGitUrl))} target="_blank" class="hover:underline">Repo</a></span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</p>`);
      if (((_g = vueExports.unref(displayContact)) == null ? void 0 : _g.name) || ((_h = vueExports.unref(displayContact)) == null ? void 0 : _h.email) || ((_i = vueExports.unref(displayContact)) == null ? void 0 : _i.phone)) {
        _push(`<p class="mt-1 text-xs text-gray-500 truncate"> Contact: `);
        if ((_j = vueExports.unref(displayContact)) == null ? void 0 : _j.name) {
          _push(`<span>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayContact).name)}</span>`);
        } else {
          _push(`<!---->`);
        }
        if ((_k = vueExports.unref(displayContact)) == null ? void 0 : _k.email) {
          _push(`<span> \u2022 <a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", `mailto:${vueExports.unref(displayContact).email}`)} class="hover:underline">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayContact).email)}</a></span>`);
        } else {
          _push(`<!---->`);
        }
        if ((_l = vueExports.unref(displayContact)) == null ? void 0 : _l.phone) {
          _push(`<span> \u2022 <a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", `tel:${vueExports.unref(displayContact).phone}`)} class="hover:underline">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayContact).phone)}</a></span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="ml-auto flex flex-wrap items-center gap-2">`);
      if (vueExports.unref(site)) {
        _push(`<span class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs bg-gray-50"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Renew: ${serverRenderer_cjs_prodExports.ssrInterpolate(new Date(2e3, (vueExports.unref(site).renewMonth || 1) - 1, 1).toLocaleString(void 0, { month: "long" }))}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
        to: "/dashboard",
        class: "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2190 Back`);
          } else {
            return [
              vueExports.createTextVNode("\u2190 Back")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div><div class="mt-5"><div class="inline-flex rounded-xl border bg-gray-50 p-1"><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "calendar" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Calendar</button><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "changelog" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Changelog</button><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "forms" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Forms</button><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "notes" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Notes</button><button class="${serverRenderer_cjs_prodExports.ssrRenderClass(["px-4 py-2 rounded-lg text-sm transition", vueExports.unref(tab) === "details" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60"])}">Details</button></div></div></div>`);
      if (vueExports.unref(pending)) {
        _push(`<div class="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">Loading\u2026</div>`);
      } else if (vueExports.unref(error)) {
        _push(`<div class="rounded-2xl border bg-white p-8 text-center text-sm text-red-600 shadow-sm">Failed to load site.</div>`);
      } else {
        _push(`<div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "calendar" ? null : { display: "none" })}" class="space-y-3"><h2 class="text-lg font-semibold">Maintenance calendar</h2><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(months), (m) => {
          _push(`<div class="rounded-2xl border bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h3 class="text-base font-semibold">${serverRenderer_cjs_prodExports.ssrInterpolate(formatMonth(m.start))}</h3>`);
          if (isRenewalMonthUTC(m.start)) {
            _push(`<span class="rounded-full border px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700">Renewal</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div><div class="mt-4 space-y-2"><!--[-->`);
          serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(items).filter((it) => inMonth(it, m)), (ev) => {
            var _a2, _b2, _c2, _d2;
            _push(`<div class="rounded-xl border px-3 py-2 flex items-center justify-between hover:bg-gray-50"><div><div class="font-medium">${serverRenderer_cjs_prodExports.ssrInterpolate(new Date(ev.date).toLocaleDateString())}</div><div class="text-xs text-gray-500">${serverRenderer_cjs_prodExports.ssrInterpolate(ev.kind === "report" || ((_a2 = ev.labels) == null ? void 0 : _a2.reportDue) ? "Report due" : "Maintenance")}</div></div><div class="flex gap-2">`);
            if ((_b2 = ev.labels) == null ? void 0 : _b2.reportDue) {
              _push(`<span class="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-100">Report</span>`);
            } else {
              _push(`<!---->`);
            }
            if ((_c2 = ev.labels) == null ? void 0 : _c2.preRenewal) {
              _push(`<span class="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-100">Pre-renewal</span>`);
            } else {
              _push(`<!---->`);
            }
            if ((_d2 = ev.labels) == null ? void 0 : _d2.midYear) {
              _push(`<span class="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-800 border border-blue-100">Mid-year</span>`);
            } else {
              _push(`<!---->`);
            }
            _push(`</div></div>`);
          });
          _push(`<!--]-->`);
          if (!vueExports.unref(items).some((it) => inMonth(it, m))) {
            _push(`<div class="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500"> No maintenance scheduled. </div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div>`);
        });
        _push(`<!--]--></div></div>`);
      }
      _push(`<div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "changelog" ? null : { display: "none" })}" class="space-y-3"><h2 class="text-lg font-semibold">Changelog</h2><div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4"><div class="grid grid-cols-1 md:grid-cols-5 gap-3"><div class="md:col-span-1"><label class="block text-xs font-medium text-gray-600 mb-1">Environment</label><select class="w-full rounded-lg border px-3 py-2"><option value=""${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(selectedEnv)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(selectedEnv), "") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(selectedEnv), "")) ? " selected" : ""}>All</option><option${serverRenderer_cjs_prodExports.ssrRenderAttr("value", (_m = vueExports.unref(site)) == null ? void 0 : _m.env)}${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(selectedEnv)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(selectedEnv), (_n = vueExports.unref(site)) == null ? void 0 : _n.env) : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(selectedEnv), (_o = vueExports.unref(site)) == null ? void 0 : _o.env)) ? " selected" : ""}>${serverRenderer_cjs_prodExports.ssrInterpolate((_p = vueExports.unref(site)) == null ? void 0 : _p.env)}</option></select></div><div class="md:col-span-1"><label class="block text-xs font-medium text-gray-600 mb-1">Package</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(clPkg))} placeholder="vendor/package" class="w-full rounded-lg border px-3 py-2"></div><div class="md:col-span-1"><label class="block text-xs font-medium text-gray-600 mb-1">From</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(clFrom))} type="datetime-local" class="w-full rounded-lg border px-3 py-2"></div><div class="md:col-span-1"><label class="block text-xs font-medium text-gray-600 mb-1">To</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(clTo))} type="datetime-local" class="w-full rounded-lg border px-3 py-2"></div><div class="md:col-span-1 flex items-end gap-2"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(clLimit))} type="number" min="1" class="w-24 rounded-lg border px-3 py-2"><button class="ml-auto inline-flex items-center rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(clPending)) ? " disabled" : ""}>Refresh</button></div></div>`);
      if (vueExports.unref(clPending)) {
        _push(`<div class="text-sm text-gray-500">Loading changes\u2026</div>`);
      } else if ((((_q = vueExports.unref(clData)) == null ? void 0 : _q.items) || []).length === 0) {
        _push(`<div class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No changelog entries.</div>`);
      } else {
        _push(`<div class="space-y-4"><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(((_r = vueExports.unref(clData)) == null ? void 0 : _r.items) || [], (entry, idx) => {
          var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2, _l2;
          _push(`<div class="rounded-xl border p-4"><div class="flex items-center justify-between gap-3"><div><div class="font-medium">${serverRenderer_cjs_prodExports.ssrInterpolate(new Date(((_a2 = entry.run) == null ? void 0 : _a2.timestamp) || entry.receivedAt).toLocaleString())}</div><div class="text-xs text-gray-500">${serverRenderer_cjs_prodExports.ssrInterpolate((_b2 = entry.site) == null ? void 0 : _b2.env)} `);
          if ((_c2 = entry.run) == null ? void 0 : _c2.git_branch) {
            _push(`<span> \u2022 ${serverRenderer_cjs_prodExports.ssrInterpolate(entry.run.git_branch)}</span>`);
          } else {
            _push(`<!---->`);
          }
          if ((_d2 = entry.run) == null ? void 0 : _d2.git_sha) {
            _push(`<span> (${serverRenderer_cjs_prodExports.ssrInterpolate(entry.run.git_sha)})</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div><div class="flex flex-wrap gap-2"><span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">Updated: ${serverRenderer_cjs_prodExports.ssrInterpolate(((_e2 = entry.summary) == null ? void 0 : _e2.updated_count) || 0)}</span><span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Added: ${serverRenderer_cjs_prodExports.ssrInterpolate(((_f2 = entry.summary) == null ? void 0 : _f2.added_count) || 0)}</span><span class="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">Removed: ${serverRenderer_cjs_prodExports.ssrInterpolate(((_g2 = entry.summary) == null ? void 0 : _g2.removed_count) || 0)}</span></div></div>`);
          if ((_h2 = entry.summary) == null ? void 0 : _h2.has_changes) {
            _push(`<div class="mt-3 overflow-auto rounded-lg border"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr class="text-left"><th class="py-2 pl-3 pr-4 font-medium text-gray-600">Package</th><th class="py-2 pr-4 font-medium text-gray-600">Old</th><th class="py-2 pr-4 font-medium text-gray-600">New</th></tr></thead><tbody><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(((_i2 = entry.changes) == null ? void 0 : _i2.updated) || [], (p) => {
              _push(`<tr class="border-t"><td class="py-2 pl-3 pr-4 font-medium">${serverRenderer_cjs_prodExports.ssrInterpolate(p.name)}</td><td class="py-2 pr-4"><code>${serverRenderer_cjs_prodExports.ssrInterpolate(p.old)}</code></td><td class="py-2 pr-4"><code>${serverRenderer_cjs_prodExports.ssrInterpolate(p.new)}</code></td></tr>`);
            });
            _push(`<!--]--><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(((_j2 = entry.changes) == null ? void 0 : _j2.added) || [], (p) => {
              _push(`<tr class="border-t"><td class="py-2 pl-3 pr-4 font-medium text-emerald-700">${serverRenderer_cjs_prodExports.ssrInterpolate(p.name)}</td><td class="py-2 pr-4"><em>\u2014</em></td><td class="py-2 pr-4"><code>${serverRenderer_cjs_prodExports.ssrInterpolate(p.new)}</code></td></tr>`);
            });
            _push(`<!--]--><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(((_k2 = entry.changes) == null ? void 0 : _k2.removed) || [], (p) => {
              _push(`<tr class="border-t"><td class="py-2 pl-3 pr-4 font-medium text-rose-700">${serverRenderer_cjs_prodExports.ssrInterpolate(p.name)}</td><td class="py-2 pr-4"><code>${serverRenderer_cjs_prodExports.ssrInterpolate(p.old)}</code></td><td class="py-2 pr-4"><em>\u2014</em></td></tr>`);
            });
            _push(`<!--]--></tbody></table></div>`);
          } else {
            _push(`<div class="mt-3 text-sm text-gray-500">No dependency changes.</div>`);
          }
          _push(`<div class="mt-2">`);
          if ((_l2 = entry.run) == null ? void 0 : _l2.ci_url) {
            _push(`<a${serverRenderer_cjs_prodExports.ssrRenderAttr("href", entry.run.ci_url)} target="_blank" class="text-blue-600 hover:underline text-sm">CI build</a>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div>`);
        });
        _push(`<!--]--><div class="flex justify-center"><button class="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Load more</button></div></div>`);
      }
      _push(`</div></div><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "forms" ? null : { display: "none" })}" class="space-y-3"><h2 class="text-lg font-semibold">Forms</h2><div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4"><div class="grid grid-cols-1 md:grid-cols-5 gap-3"><div><label class="block text-xs font-medium text-gray-600 mb-1">Environment</label><select class="w-full rounded-lg border px-3 py-2"><option value=""${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(selectedEnv)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(selectedEnv), "") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(selectedEnv), "")) ? " selected" : ""}>All</option><option${serverRenderer_cjs_prodExports.ssrRenderAttr("value", (_s = vueExports.unref(site)) == null ? void 0 : _s.env)}${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(selectedEnv)) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(selectedEnv), (_t = vueExports.unref(site)) == null ? void 0 : _t.env) : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(selectedEnv), (_u = vueExports.unref(site)) == null ? void 0 : _u.env)) ? " selected" : ""}>${serverRenderer_cjs_prodExports.ssrInterpolate((_v = vueExports.unref(site)) == null ? void 0 : _v.env)}</option></select></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Email</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(flEmail))} placeholder="name@plott.co.uk" class="w-full rounded-lg border px-3 py-2"></div><div><label class="block text-xs font-medium text-gray-600 mb-1">From</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(flFrom))} type="datetime-local" class="w-full rounded-lg border px-3 py-2"></div><div><label class="block text-xs font-medium text-gray-600 mb-1">To</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(flTo))} type="datetime-local" class="w-full rounded-lg border px-3 py-2"></div><div class="flex items-end gap-2"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(flLimit))} type="number" min="1" class="w-24 rounded-lg border px-3 py-2"><button class="ml-auto inline-flex items-center rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(flPending)) ? " disabled" : ""}>Refresh</button></div></div>`);
      if (vueExports.unref(flPending)) {
        _push(`<div class="text-sm text-gray-500">Loading submissions\u2026</div>`);
      } else if ((((_w = vueExports.unref(flData)) == null ? void 0 : _w.items) || []).length === 0) {
        _push(`<div class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No form submissions.</div>`);
      } else {
        _push(`<div class="space-y-4"><!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(((_x = vueExports.unref(flData)) == null ? void 0 : _x.items) || [], (log, i) => {
          var _a2, _b2, _c2, _d2, _e2, _f2;
          _push(`<div class="rounded-xl border p-4"><div class="flex items-start justify-between gap-3"><div><div class="font-medium">${serverRenderer_cjs_prodExports.ssrInterpolate(new Date(((_a2 = log.entry) == null ? void 0 : _a2.created_at) || log.receivedAt).toLocaleString())}</div><div class="text-xs text-gray-500">${serverRenderer_cjs_prodExports.ssrInterpolate(((_b2 = log.form) == null ? void 0 : _b2.title) || "Form")} \u2022 ${serverRenderer_cjs_prodExports.ssrInterpolate((_c2 = log.entry) == null ? void 0 : _c2.email)}</div></div><span class="px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700">GF submission</span></div><div class="mt-3 overflow-auto rounded-lg border"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr class="text-left"><th class="py-2 pl-3 pr-4 font-medium text-gray-600">Field</th><th class="py-2 pr-4 font-medium text-gray-600">Value</th></tr></thead><tbody><!--[-->`);
          serverRenderer_cjs_prodExports.ssrRenderList(log.fields || {}, (val, label) => {
            _push(`<tr class="border-t align-top"><td class="py-2 pl-3 pr-4 font-medium">${serverRenderer_cjs_prodExports.ssrInterpolate(label)}</td><td class="py-2 pr-4 break-all">${serverRenderer_cjs_prodExports.ssrInterpolate(val)}</td></tr>`);
          });
          _push(`<!--]--></tbody></table></div><p class="text-xs text-gray-500 mt-2"> PHP ${serverRenderer_cjs_prodExports.ssrInterpolate((_d2 = log.run) == null ? void 0 : _d2.php_version)} \u2022 WP ${serverRenderer_cjs_prodExports.ssrInterpolate((_e2 = log.run) == null ? void 0 : _e2.wp_version)} \u2022 GF ${serverRenderer_cjs_prodExports.ssrInterpolate((_f2 = log.run) == null ? void 0 : _f2.gf_version)}</p></div>`);
        });
        _push(`<!--]--><div class="flex justify-center"><button class="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Load more</button></div></div>`);
      }
      _push(`</div></div><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "notes" ? null : { display: "none" })}" class="space-y-3"><h2 class="text-lg font-semibold">Notes</h2>`);
      if (authed) {
        _push(`<div class="rounded-2xl border bg-white p-5 shadow-sm space-y-3"><div class="grid grid-cols-1 md:grid-cols-6 gap-3"><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(noteForm).title)} placeholder="Title" class="border rounded-lg px-3 py-2 md:col-span-3"><label class="inline-flex items-center gap-2 text-sm md:col-span-1"><input type="checkbox"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(noteForm).pinned) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(noteForm).pinned, null) : vueExports.unref(noteForm).pinned) ? " checked" : ""}> Pinned </label></div><textarea rows="4" placeholder="Write a note\u2026" class="border rounded-lg px-3 py-2 w-full">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(noteForm).body)}</textarea><div class="flex gap-3"><button${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(noteSaving)) ? " disabled" : ""} class="rounded-lg bg-black px-4 py-2 text-white">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(noteSaving) ? "Saving\u2026" : "Add note")}</button><button class="rounded-lg border px-4 py-2 hover:bg-gray-50">Refresh</button></div></div>`);
      } else {
        _push(`<div class="rounded-2xl border bg-white p-5 text-sm text-gray-500 shadow-sm"> Sign in to add and manage notes. </div>`);
      }
      _push(`<div class="space-y-3">`);
      if (!((_y = vueExports.unref(notes)) == null ? void 0 : _y.items)) {
        _push(`<div class="flex justify-center"><button class="rounded-lg border px-4 py-2 hover:bg-gray-50">Load notes</button></div>`);
      } else if (vueExports.unref(notes).items.length === 0) {
        _push(`<div class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 bg-white shadow-sm"> No notes yet. </div>`);
      } else {
        _push(`<!--[-->`);
        serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(notes).items, (n) => {
          var _a2, _b2;
          _push(`<div class="rounded-xl border bg-white p-4 shadow-sm"><div class="flex items-start justify-between gap-3"><div><div class="flex items-center gap-2"><h3 class="font-semibold">${serverRenderer_cjs_prodExports.ssrInterpolate(n.title || "Untitled")}</h3>`);
          if (n.pinned) {
            _push(`<span class="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-100">Pinned</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div><p class="whitespace-pre-wrap text-sm mt-1">${serverRenderer_cjs_prodExports.ssrInterpolate(n.body)}</p><p class="text-xs text-gray-500 mt-2"> by ${serverRenderer_cjs_prodExports.ssrInterpolate(((_a2 = n.author) == null ? void 0 : _a2.name) || ((_b2 = n.author) == null ? void 0 : _b2.email))} \u2022 ${serverRenderer_cjs_prodExports.ssrInterpolate(new Date(n.updatedAt).toLocaleString())}</p></div>`);
          if (canEditNote(n)) {
            _push(`<div class="shrink-0 flex gap-2"><button class="text-xs underline">${serverRenderer_cjs_prodExports.ssrInterpolate(n.pinned ? "Unpin" : "Pin")}</button><button class="text-xs text-red-600 underline">Delete</button></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div>`);
        });
        _push(`<!--]-->`);
      }
      _push(`</div></div><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(tab) === "details" ? null : { display: "none" })}" class="space-y-3"><h2 class="text-lg font-semibold">Site details</h2><div class="rounded-2xl border bg-white p-5 shadow-sm space-y-6"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-xs font-medium text-gray-600 mb-1">Site ID</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(id))} disabled class="w-full rounded-lg border bg-gray-50 px-3 py-2"></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Name</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).name)} class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Environment</label><select class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}><option value="production"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(det).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(det).env, "production") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(det).env, "production")) ? " selected" : ""}>production</option><option value="staging"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(det).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(det).env, "staging") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(det).env, "staging")) ? " selected" : ""}>staging</option><option value="dev"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(det).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(det).env, "dev") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(det).env, "dev")) ? " selected" : ""}>dev</option><option value="test"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(Array.isArray(vueExports.unref(det).env) ? serverRenderer_cjs_prodExports.ssrLooseContain(vueExports.unref(det).env, "test") : serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(det).env, "test")) ? " selected" : ""}>test</option></select></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Renew month (1\u201312)</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).renewMonth)} type="number" min="1" max="12" class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}><p class="mt-1 text-xs text-gray-500">Pre-renewal (R\u22122), Reports due (R\u22121), Mid-year (pre+6).</p></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-xs font-medium text-gray-600 mb-1">Website URL</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).websiteUrl)} placeholder="https://example.com" class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Git URL</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).gitUrl)} placeholder="https://github.com/org/repo" class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}></div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label class="block text-xs font-medium text-gray-600 mb-1">Contact name</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).contactName)} class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Contact email</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).contactEmail)} type="email" placeholder="name@example.com" class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Contact phone</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(det).contactPhone)} placeholder="+44 ..." class="w-full rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite)) ? " disabled" : ""}></div></div><div class="flex flex-wrap items-center gap-3">`);
      if (vueExports.unref(canManageSite)) {
        _push(`<button${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(detSaving)) ? " disabled" : ""} class="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(detSaving) ? "Saving\u2026" : "Save details")}</button>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(detMsg)) {
        _push(`<p class="text-sm text-emerald-700">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(detMsg))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(detErr)) {
        _push(`<p class="text-sm text-red-600">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(detErr))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (!vueExports.unref(canManageSite)) {
        _push(`<p class="text-sm text-gray-500">Sign in as a manager or admin to edit.</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="rounded-xl border bg-gray-50 p-4"><div class="flex flex-wrap items-end gap-3"><div><label class="block text-xs font-medium text-gray-600 mb-1">Backfill months</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(rb).backfillMonths)} type="number" min="0" max="60" class="w-28 rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite) || vueExports.unref(rebuilding)) ? " disabled" : ""}></div><div><label class="block text-xs font-medium text-gray-600 mb-1">Forward months</label><input${serverRenderer_cjs_prodExports.ssrRenderAttr("value", vueExports.unref(rb).forwardMonths)} type="number" min="0" max="60" class="w-28 rounded-lg border px-3 py-2"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(!vueExports.unref(canManageSite) || vueExports.unref(rebuilding)) ? " disabled" : ""}></div>`);
      if (vueExports.unref(canManageSite)) {
        _push(`<button${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(vueExports.unref(rebuilding)) ? " disabled" : ""} class="ml-auto rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-50" title="Deletes and regenerates Pre (R\u22122), Report (R\u22121), Mid (+6) entries">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(rebuilding) ? "Rebuilding\u2026" : "Rebuild maintenance")}</button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><p class="mt-2 text-xs text-gray-600"> Rebuild deletes existing entries for this site/env and recreates: Pre-renewal (R\u22122), Report due (R\u22121), and Mid-year (pre+6) across the selected window. </p>`);
      if (vueExports.unref(rbMsg)) {
        _push(`<p class="mt-2 text-sm text-emerald-700">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(rbMsg))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(rbErr)) {
        _push(`<p class="mt-2 text-sm text-red-600">${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(rbErr))}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/site/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-kpRh70zu.mjs.map
