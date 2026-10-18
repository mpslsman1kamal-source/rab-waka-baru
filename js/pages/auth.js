/* pages/auth.js — layar masuk, ganti kata sandi, menu pengguna & lonceng */
(function () {
  'use strict';
  const html = U.html;

  const Auth = {
    initLogin: function () {
      U.$('#lg-ver').textContent = 'v' + APP_CONFIG.VERSI;
      U.$('#lg-eye').onclick = function () {
        const i = U.$('#lg-pw'), show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        this.querySelector('span').textContent = show ? 'visibility_off' : 'visibility';
        this.setAttribute('aria-label', show ? 'Sembunyikan sandi' : 'Tampilkan sandi');
      };
      U.$('#login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const email = U.$('#lg-email').value.trim(), pw = U.$('#lg-pw').value;
        Auth.hideError();
        if (!email || !pw) { Auth.showError('Email dan kata sandi wajib diisi.'); return; }
        const btn = U.$('#lg-btn');
        UI.busy(btn, Api.call('auth.login', { email: email, password: pw }), 'Memeriksa…').then(function (r) {
          Api.saveToken(r.token, U.$('#lg-ingat').checked);
          Api.userId = r.user.id_user;
          return Api.call('app.bootstrap').then(function (d) { U.store.set('rabwaka.boot', { d: d }); U.$('#lg-pw').value = ''; App.enter(d); });
        }).catch(function (e) { Auth.showError(e.message); });
      });
    },
    reset: function () { U.$('#lg-pw').value = ''; Auth.hideError(); },
    showError: function (msg, judul) {
      U.$('#lg-err').hidden = false;
      U.$('#lg-err b').textContent = judul || 'Gagal masuk';
      U.$('#lg-err-t').textContent = msg;
    },
    hideError: function () { U.$('#lg-err').hidden = true; },
    setStatus: function (kind, text) {
      U.$('#lg-dot').className = 'status-dot ' + (kind === 'ok' ? '' : kind);
      U.$('#lg-status').textContent = text;
    },
    ping: function () {
      Auth.setStatus('wait', 'Menghubungi server…');
      Api.ping().then(function (d) { Auth.setStatus('ok', 'Server terhubung'); }, function (e) { Auth.setStatus('off', e.code === 'CONFIG' ? 'GAS_URL belum diisi' : 'Server tidak terhubung'); });
    },

    // ---------- Ganti kata sandi ----------
    changePassword: function (paksa) {
      const m = UI.modal({
        title: paksa ? 'Ganti kata sandi awal' : 'Ganti kata sandi', static: !!paksa,
        body: html`<div class="stack" style="padding-top:6px">
          ${paksa ? html`<div class="alert alert-warn">${UI.ic('key')}<div><b>Kata sandi awal harus diganti</b>Demi keamanan, buat kata sandi baru sebelum melanjutkan.</div></div>` : ''}
          <div class="field"><label for="cp-lama">Kata sandi saat ini</label><input class="input" id="cp-lama" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="cp-baru">Kata sandi baru</label><input class="input" id="cp-baru" type="password" autocomplete="new-password"><span class="hint">Minimal 8 karakter, memuat huruf dan angka.</span></div>
          <div class="field"><label for="cp-ulang">Ulangi kata sandi baru</label><input class="input" id="cp-ulang" type="password" autocomplete="new-password"></div>
          <div class="err-txt" id="cp-err" hidden></div></div>`,
        foot: (paksa ? [] : [{ label: 'Batal', value: null }]).concat([{
          label: 'Simpan kata sandi', cls: 'btn-primary', click: function (close, btn) {
            const lama = U.$('#cp-lama').value, baru = U.$('#cp-baru').value, ulang = U.$('#cp-ulang').value, er = U.$('#cp-err');
            er.hidden = true;
            if (baru !== ulang) { er.hidden = false; er.textContent = 'Konfirmasi kata sandi tidak sama.'; return; }
            UI.busy(btn, Api.call('auth.changePassword', { lama: lama, baru: baru }), 'Menyimpan…').then(function (r) {
              Api.saveToken(r.token, !!localStorage.getItem('rabwaka.token'));
              App.state.user.ganti_sandi = false; close(true); UI.toast('Kata sandi berhasil diganti.');
            }).catch(function (e) { er.hidden = false; er.textContent = e.message; });
          }
        }])
      });
      return m;
    },
    forceChangePassword: function () { Auth.changePassword(true); },

    userMenu: function () {
      const p = U.$('#pop'), u = App.state.user;
      if (!p.hidden && p.dataset.k === 'user') { p.hidden = true; return; }
      p.dataset.k = 'user'; p.hidden = false; p.style.width = '260px';
      p.innerHTML = String(html`<div class="it" style="cursor:default"><b>${u.nama}</b><small>${u.email}</small><small>${u.peran}${u.bidang_waka ? ' · ' + u.bidang_waka : ''}</small></div>
        <a class="it" href="#" id="m-pw">${UI.ic('key', 'ic-sm')} Ganti kata sandi</a><a class="it" href="#" id="m-out">${UI.ic('logout', 'ic-sm')} Keluar</a>`);
      U.$('#m-pw').onclick = function (e) { e.preventDefault(); p.hidden = true; Auth.changePassword(false); };
      U.$('#m-out').onclick = function (e) { e.preventDefault(); p.hidden = true; U.$('#btn-logout').click(); };
    },

    bellMenu: function () {
      const p = U.$('#pop');
      if (!p.hidden && p.dataset.k === 'bell') { p.hidden = true; return; }
      p.dataset.k = 'bell'; p.hidden = false; p.style.width = '';
      p.innerHTML = '<div class="it" style="cursor:default"><div class="skel" style="height:14px;width:60%"></div></div>';
      const label = { diajukan: 'RAB diajukan', revisi: 'Perlu revisi', ke_kepsek: 'Menunggu persetujuan', disetujui: 'RAB disetujui', dibatalkan: 'RAB dibatalkan' };
      Api.call('notif.mine').then(function (r) {
        if (p.dataset.k !== 'bell') return;
        p.innerHTML = String(html`<div class="it" style="cursor:default"><b>Notifikasi</b></div>${r.rows.length ? r.rows.map(function (n) {
          return html`<a class="it" href="${n.id_rab ? '#/detail/' + n.id_rab : '#'}"><b>${label[n.event] || n.event}${n.nomor_rab ? ' · ' + n.nomor_rab : ''}</b><small>${n.pesan}</small><small>${U.tglJam(n.waktu)}</small></a>`;
        }) : html`<div class="it" style="cursor:default"><span class="muted">Belum ada notifikasi.</span></div>`}`);
      }, function (e) { p.innerHTML = String(html`<div class="it">${e.message}</div>`); });
    }
  };
  window.Auth = Auth;
})();
