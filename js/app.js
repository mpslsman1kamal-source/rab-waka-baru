/* app.js — cangkang aplikasi: bootstrap, navigasi per peran, bilah atas, sesi */
(function () {
  'use strict';
  const R = U.ROLE, html = U.html;
  const BOOT_KEY = 'rabwaka.boot';

  const NAV = {};
  const COMMON_END = [['rekap', 'Rekap & Grafik', 'bar_chart', '/rekap'], ['cetak', 'Cetak RAB', 'print', '/cetak']];
  NAV[R.WAKA] = NAV[R.STAF] = [
    ['Utama'], ['dash', 'Dasbor', 'dashboard', '/'], ['rab', 'RAB Saya', 'description', '/rab'], ['baru', 'Buat RAB Baru', 'add_circle', '/rab/baru'], ['revisi', 'Perlu Revisi', 'rate_review', '/revisi', true],
    ['Laporan']].concat(COMMON_END);
  NAV[R.BEND] = [['Utama'], ['dash', 'Dasbor', 'dashboard', '/'], ['antrean', 'Antrean Pemeriksaan', 'fact_check', '/persetujuan', true], ['rab', 'Semua RAB', 'description', '/rab'], ['Laporan']].concat(COMMON_END);
  NAV[R.KEPSEK] = [['Utama'], ['dash', 'Dasbor', 'dashboard', '/'], ['antrean', 'Persetujuan', 'approval', '/persetujuan', true], ['rab', 'Semua RAB', 'description', '/rab'], ['Laporan']].concat(COMMON_END);
  NAV[R.ADMIN] = [['Utama'], ['dash', 'Dasbor', 'dashboard', '/'], ['rab', 'Semua RAB', 'description', '/rab'], ['Pengaturan'],
    ['users', 'Pengguna', 'group', '/admin/users'], ['pagu', 'Pagu Anggaran', 'account_balance_wallet', '/admin/pagu'], ['ssh', 'Standar Harga (SSH)', 'inventory_2', '/admin/ssh'], ['notif', 'Notifikasi & Log', 'notifications_active', '/admin/notif'],
    ['Laporan']].concat(COMMON_END.slice(0, 1));

  const App = {
    state: null,

    boot: function () {
      Api.onAuthLost = function (msg) { App.logout(msg || 'Sesi berakhir. Silakan masuk kembali.'); };
      Auth.initLogin();
      UI_bindShell();
      if (!Api.configured()) { App.showLogin(); Auth.setStatus('off', 'GAS_URL belum diisi'); Auth.showError('Alamat server belum dikonfigurasi. Isi GAS_URL pada berkas js/config.js sesuai panduan instalasi.'); return; }
      Api.loadToken();
      const cached = U.store.get(BOOT_KEY, null);
      if (Api.token && cached && cached.d && cached.d.user) {
        // Tampilkan cangkang dari cache segera, validasi token di latar belakang
        Api.userId = cached.d.user.id_user;
        App.enter(cached.d);
        Api.call('app.bootstrap').then(function (d) { U.store.set(BOOT_KEY, { d: d }); App.state = d; App.paintShell(); App.refreshBadges(); }, function (e) { if (e.code !== 'AUTH' && e.code !== 'NETWORK') UI.error(e); });
      } else if (Api.token) {
        Api.call('app.bootstrap').then(function (d) { Api.userId = d.user.id_user; U.store.set(BOOT_KEY, { d: d }); App.enter(d); }, function () { Api.clearToken(); App.showLogin(); Auth.ping(); });
      } else { App.showLogin(); Auth.ping(); }
    },

    enter: function (d) {
      App.state = d;
      U.$('#login').classList.remove('on');
      U.$('#app').classList.add('on');
      App.paintShell();
      if (d.user.ganti_sandi) Auth.forceChangePassword();
      if (!location.hash || location.hash === '#') location.hash = '#/';
      Router.start();
    },

    showLogin: function () {
      U.$('#app').classList.remove('on');
      U.$('#login').classList.add('on');
      const s = U.store.get('rabwaka.sekolah', '');
      if (s) U.$('#lg-sekolah').textContent = s;
    },

    paintShell: function () {
      const st = App.state, u = st.user;
      U.store.set('rabwaka.sekolah', st.sekolah.nama);
      U.$('#sb-sekolah').textContent = st.sekolah.nama;
      U.$('#tb-sekolah').textContent = st.sekolah.nama;
      U.$('#tb-ta').textContent = 'RAB BOSP TA ' + st.sekolah.tahun_ajaran;
      U.$('#tb-peran').textContent = u.peran + (u.bidang_waka ? ' · ' + u.bidang_waka : '');
      U.$('#u-nama').textContent = u.nama;
      U.$('#u-sub').textContent = u.jabatan || u.peran;
      U.$('#u-av').textContent = U.initials(u.nama);
      const items = NAV[u.peran] || [];
      U.$('#nav').innerHTML = String(html`${items.map(function (it) {
        if (it.length === 1) return html`<h6>${it[0]}</h6>`;
        return html`<a href="#${it[3]}" data-nav="${it[0]}"><span class="material-symbols-outlined">${it[2]}</span>${it[1]}${it[4] ? html`<span class="count" data-badge hidden>0</span>` : ''}</a>`;
      })}`);
      App.markNav(Router.current() ? (Router.current().def.nav || '') : '');
      App.refreshBadges();
    },

    markNav: function (key) {
      U.$$('#nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === key); });
    },

    refreshBadges: function () {
      const n = (App.state && App.state.badges && App.state.badges.antrean) || 0;
      U.$$('#nav [data-badge]').forEach(function (b) { b.textContent = n; b.hidden = !n; });
      const dot = U.$('#bell-dot'); dot.textContent = n; dot.hidden = !n;
    },
    // Segarkan jumlah antrean dari server (setelah aksi alur)
    reloadBadges: function () {
      return Api.call('app.bootstrap').then(function (d) { App.state.badges = d.badges; U.store.set(BOOT_KEY, { d: Object.assign({}, App.state) }); App.refreshBadges(); }, function () {});
    },

    closeMenus: function () {
      U.$('#sidebar').classList.remove('open'); U.$('#scrim').classList.remove('on'); U.$('#pop').hidden = true;
    },

    logout: function (msg) {
      Api.clearToken(); Api.dropCache(); Engine.reset(); U.store.del(BOOT_KEY);
      App.state = null; Api.userId = '';
      location.hash = '';
      App.showLogin(); Auth.reset(); Auth.ping();
      if (msg) Auth.showError(msg, 'Sesi berakhir');
    }
  };
  window.App = App;

  function UI_bindShell() {
    U.$('#burger').onclick = function () { U.$('#sidebar').classList.toggle('open'); U.$('#scrim').classList.toggle('on'); };
    U.$('#scrim').onclick = App.closeMenus;
    U.$('#btn-logout').onclick = function (e) { e.preventDefault(); if (Engine.pendingTotal() > 0 && !confirm('Masih ada perubahan yang sedang disimpan. Keluar sekarang?')) return; App.logout(); };
    U.$('#btn-user').onclick = function (e) { e.stopPropagation(); Auth.userMenu(); };
    U.$('#btn-bell').onclick = function (e) { e.stopPropagation(); Auth.bellMenu(); };
    document.addEventListener('click', function (e) { const p = U.$('#pop'); if (!p.hidden && !p.contains(e.target)) p.hidden = true; });
  }

  document.addEventListener('DOMContentLoaded', App.boot);
})();
