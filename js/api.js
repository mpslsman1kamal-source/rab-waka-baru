/* api.js — klien REST untuk Google Apps Script (fetch POST text/plain, tanpa preflight CORS) */
(function () {
  'use strict';
  const TKEY = 'rabwaka.token';
  const PFX = 'rabwaka.c.';

  class ApiError extends Error {
    constructor(message, code, extra) { super(message); this.name = 'ApiError'; this.code = code || 'SERVER'; this.extra = extra || null; }
  }

  const Api = {
    token: '',
    userId: '',
    onAuthLost: null,

    configured: function () { const u = String(APP_CONFIG.GAS_URL || ''); return /^https?:\/\//.test(u) && u.indexOf('GANTI_') < 0; },

    loadToken: function () {
      let t = '';
      try { t = sessionStorage.getItem(TKEY) || localStorage.getItem(TKEY) || ''; } catch (e) {}
      Api.token = t; return t;
    },
    saveToken: function (t, ingat) {
      Api.token = t;
      try { sessionStorage.removeItem(TKEY); localStorage.removeItem(TKEY); (ingat ? localStorage : sessionStorage).setItem(TKEY, t); } catch (e) {}
    },
    clearToken: function () {
      Api.token = '';
      try { sessionStorage.removeItem(TKEY); localStorage.removeItem(TKEY); } catch (e) {}
    },

    // Panggil satu aksi. opts: { timeout, silent }
    call: function (action, data, opts) {
      opts = opts || {};
      if (!Api.configured()) return Promise.reject(new ApiError('Alamat server (GAS_URL) belum diisi di js/config.js.', 'CONFIG'));
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const to = setTimeout(function () { if (ctl) ctl.abort(); }, opts.timeout || 60000);
      return fetch(APP_CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, data: data || {}, token: Api.token }),
        redirect: 'follow',
        signal: ctl ? ctl.signal : undefined
      }).then(function (r) {
        clearTimeout(to);
        return r.text();
      }).then(function (txt) {
        let j;
        try { j = JSON.parse(txt); } catch (e) { throw new ApiError('Respons server tidak dapat dibaca. Pastikan URL Web App benar dan akses "Anyone".', 'NETWORK'); }
        if (!j.success) {
          if (j.code === 'AUTH' && action !== 'auth.login' && Api.onAuthLost) Api.onAuthLost(j.message);
          throw new ApiError(j.message || 'Terjadi kesalahan.', j.code, j.extra);
        }
        return j.data;
      }, function (err) {
        clearTimeout(to);
        if (err instanceof ApiError) throw err;
        throw new ApiError(err && err.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'NETWORK');
      });
    },

    // Cek kesehatan + pemanasan server (GET)
    ping: function () {
      if (!Api.configured()) return Promise.reject(new ApiError('GAS_URL belum diisi.', 'CONFIG'));
      return fetch(APP_CONFIG.GAS_URL, { method: 'GET', redirect: 'follow' }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.success) throw new ApiError('Server tidak merespons dengan benar.', 'NETWORK');
        return j.data;
      }, function () { throw new ApiError('Server tidak dapat dihubungi.', 'NETWORK'); });
    },

    // Stale-while-revalidate: tampilkan cache lokal lebih dulu, lalu segarkan dari server.
    // render(data, dariCache) dipanggil 1–2 kali. Mengembalikan Promise data segar.
    swr: function (action, data, key, render, opts) {
      const ck = PFX + (Api.userId || '-') + '.' + key;
      const c = U.store.get(ck, null);
      let shown = false;
      if (c && c.d !== undefined && (!opts || !opts.noCache)) { shown = true; try { render(c.d, true); } catch (e) { console.error(e); } }
      return Api.call(action, data).then(function (d) {
        U.store.set(ck, { t: Date.now(), d: d });
        try { render(d, false); } catch (e) { console.error(e); }
        return d;
      }).catch(function (e) { if (shown && e.code === 'NETWORK') return null; throw e; });
    },
    dropCache: function () { U.store.clearPrefix(PFX); }
  };
  window.Api = Api;
  window.ApiError = ApiError;
})();
