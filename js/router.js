/* router.js — router berbasis hash (#/rab/abc) dengan pembatasan peran dan pembersihan halaman */
(function () {
  'use strict';
  const routes = [];
  let cleanup = null, token = 0, current = null;

  function compile(pattern) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-z_]+)/g, function (m, k) { keys.push(k); return '([^/]+)'; }) + '$');
    return { re: re, keys: keys };
  }

  const Router = {
    // def: {roles?, nav?, title, render(params, ctx) → (opsional) fungsi pembersih}
    add: function (pattern, def) { const c = compile(pattern); routes.push({ pattern: pattern, re: c.re, keys: c.keys, def: def }); },
    path: function () { return (location.hash || '#/').slice(1) || '/'; },
    go: function (path, replace) {
      if (replace) location.replace('#' + path); else location.hash = '#' + path;
    },
    current: function () { return current; },
    resolve: function (path) {
      const clean = path.split('?')[0];
      for (let i = 0; i < routes.length; i++) {
        const m = routes[i].re.exec(clean);
        if (m) { const p = {}; routes[i].keys.forEach(function (k, j) { p[k] = decodeURIComponent(m[j + 1]); }); return { route: routes[i], params: p }; }
      }
      return null;
    },
    query: function () {
      const q = {}, s = (Router.path().split('?')[1] || '');
      s.split('&').forEach(function (kv) { if (!kv) return; const a = kv.split('='); q[decodeURIComponent(a[0])] = decodeURIComponent(a[1] || ''); });
      return q;
    },
    // Tujuan klik baris RAB sesuai peran & status
    rabHref: function (r) {
      const peran = App.state.user.peran, S = U.ST;
      if ((peran === U.ROLE.WAKA || peran === U.ROLE.STAF) && r.bisa_edit) return '#/rab/' + r.id_rab;
      if (peran === U.ROLE.BEND && (r.status === S.KE_BEND || r.status === S.DIPERIKSA)) return '#/review/' + r.id_rab;
      if (peran === U.ROLE.KEPSEK && r.status === S.KE_KEPSEK) return '#/validasi/' + r.id_rab;
      return '#/detail/' + r.id_rab;
    },
    render: function () {
      if (!App.state || !App.state.user) return;
      if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
      const my = ++token;
      const path = Router.path();
      const hit = Router.resolve(path) || Router.resolve('/404');
      const user = App.state.user;
      current = { path: path, params: hit.params, def: hit.route.def };
      const def = hit.route.def;
      if (def.roles && def.roles.indexOf(user.peran) < 0) {
        UI.mount(UI.empty('lock', 'Akses ditolak', 'Peran ' + user.peran + ' tidak memiliki akses ke halaman ini.', U.html`<a class="btn btn-primary" href="#/">Ke Dasbor</a>`));
        App.markNav(''); return;
      }
      document.title = (def.title || 'RAB Waka') + ' — RAB Waka';
      App.markNav(def.nav || '');
      App.closeMenus();
      window.scrollTo(0, 0);
      const ctx = { alive: function () { return my === token; }, query: Router.query() };
      try {
        const r = def.render(hit.params, ctx);
        if (r && typeof r.then === 'function') r.then(function (c) { if (typeof c === 'function') { if (ctx.alive()) cleanup = c; else c(); } }, function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e, Router.render)); });
        else if (typeof r === 'function') cleanup = r;
      } catch (e) { console.error(e); UI.mount(UI.errorBox(e, Router.render)); }
    },
    start: function () { window.addEventListener('hashchange', Router.render); Router.render(); }
  };
  window.Router = Router;
})();
