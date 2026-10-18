/* pages/admin.js — Admin: pengguna, pagu, standar harga (SSH), notifikasi/log/audit/pengaturan */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE, ADM = [R.ADMIN];
  const PERAN = [R.KEPSEK, R.BEND, R.WAKA, R.STAF, R.ADMIN];

  function reveal(title, pw, nama) {
    UI.modal({ title: title, static: true, body: html`<div class="stack" style="padding-top:6px"><div class="alert alert-warn">${UI.ic('key')}<div><b>Catat sekarang — hanya ditampilkan sekali</b>Sampaikan kata sandi awal ini kepada ${nama}. Pengguna wajib menggantinya saat masuk pertama kali.</div></div>
      <div class="field"><label>Kata sandi awal</label><div class="row"><input class="input mono" id="rv-pw" readonly value="${pw}"><button class="btn" id="rv-cp">${UI.ic('content_copy')}Salin</button></div></div></div>`,
      foot: [{ label: 'Saya sudah mencatat', cls: 'btn-primary', value: true }],
      onOpen: function (el) { U.$('#rv-cp', el).onclick = function () { const i = U.$('#rv-pw', el); i.select(); try { navigator.clipboard.writeText(pw); } catch (e) { document.execCommand('copy'); } UI.toast('Disalin.'); }; } });
  }
  function head(title, sub, crumb, actions) { return UI.pageHead({ crumbs: [{ t: 'Dasbor', href: '#/' }, { t: crumb, b: true }], title: title, sub: sub, actions: actions }); }

  // ======================= PENGGUNA =======================
  Router.add('/admin/users', {
    title: 'Pengguna', nav: 'users', roles: ADM,
    render: function (p, ctx) {
      let users = [], q = '', fp = '';
      function paint() {
        const rows = users.filter(function (u) { return (!fp || u.peran === fp) && (!q || (u.nama + ' ' + u.email + ' ' + (u.nip || '') + ' ' + (u.bidang_waka || '')).toLowerCase().indexOf(q) >= 0); });
        U.$('#us-body').innerHTML = String(rows.length ? html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Bidang</th><th>Status</th><th>Terakhir masuk</th><th></th></tr></thead><tbody>${rows.map(function (u) {
          return html`<tr><td data-l="Nama"><b>${u.nama}</b><div class="small muted">${u.nip || '—'}${u.jabatan ? ' · ' + u.jabatan : ''}</div></td><td data-l="Email" class="small">${u.email}${u.no_wa ? html`<div class="muted">${u.no_wa}</div>` : ''}</td><td data-l="Peran"><span class="chip">${u.peran}</span></td><td data-l="Bidang" class="small">${u.bidang_waka || '—'}</td>
            <td data-l="Status">${u.status_aktif === 'Aktif' ? html`<span class="badge b-ok">Aktif</span>` : html`<span class="badge b-draft">Nonaktif</span>`}</td><td data-l="Terakhir" class="small muted">${u.terakhir_masuk ? U.tglJam(u.terakhir_masuk) : 'Belum pernah'}</td>
            <td class="nolabel" style="white-space:nowrap"><button class="btn btn-sm" data-act="edit" data-id="${u.id_user}">${UI.ic('edit', 'ic-sm')}Ubah</button> <button class="btn btn-sm" data-act="reset" data-id="${u.id_user}">${UI.ic('lock_reset', 'ic-sm')}Reset sandi</button></td></tr>`;
        })}</tbody></table></div>` : UI.empty('person_search', 'Tidak ada pengguna', 'Ubah pencarian atau tambah pengguna baru.'));
      }
      function form(u) {
        const edit = !!u; u = u || { peran: R.WAKA, status_aktif: 'Aktif' };
        UI.modal({
          title: edit ? 'Ubah pengguna' : 'Tambah pengguna', wide: true,
          body: html`<div class="stack" style="padding-top:6px"><div class="grid-2"><div class="field"><label for="u-n">Nama lengkap</label><input class="input" id="u-n" value="${u.nama || ''}"></div><div class="field"><label for="u-nip">NIP</label><input class="input" id="u-nip" value="${u.nip || ''}"></div>
            <div class="field"><label for="u-e">Email (untuk masuk)</label><input class="input" id="u-e" type="email" value="${u.email || ''}"></div><div class="field"><label for="u-wa">No. WhatsApp</label><input class="input" id="u-wa" inputmode="tel" value="${u.no_wa || ''}" placeholder="628xxxxxxxxxx"></div>
            <div class="field"><label for="u-p">Peran</label><select class="input" id="u-p">${PERAN.map(function (r) { return html`<option ${r === u.peran ? 'selected' : ''}>${r}</option>`; })}</select></div>
            <div class="field"><label for="u-b">Bidang <span class="faint">(wajib untuk Waka &amp; Staf)</span></label><input class="input" id="u-b" list="u-bl" value="${u.bidang_waka || ''}"><datalist id="u-bl">${App.state.bidang.map(function (b) { return html`<option value="${b}">`; })}</datalist></div>
            <div class="field"><label for="u-j">Jabatan</label><input class="input" id="u-j" value="${u.jabatan || ''}" placeholder="mis. Waka Kurikulum"></div>
            <div class="field"><label for="u-s">Status</label><select class="input" id="u-s"><option ${u.status_aktif === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${u.status_aktif === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div></div>
            ${edit ? '' : html`<div class="alert alert-info">${UI.ic('info')}<div>Kata sandi awal dibuat otomatis dan ditampilkan sekali setelah disimpan.</div></div>`}<div class="err-txt" id="u-err" hidden></div></div>`,
          foot: [{ label: 'Batal', value: null }, {
            label: 'Simpan', cls: 'btn-primary', click: function (close, btn) {
              const body = { id_user: edit ? u.id_user : '', nama: U.$('#u-n').value, nip: U.$('#u-nip').value, email: U.$('#u-e').value, no_wa: U.$('#u-wa').value, peran: U.$('#u-p').value, bidang_waka: U.$('#u-b').value, jabatan: U.$('#u-j').value, status_aktif: U.$('#u-s').value };
              UI.busy(btn, Api.call('users.save', body), 'Menyimpan…').then(function (r) { close(true); Api.dropCache(); UI.toast('Pengguna disimpan.'); if (r.sandi_awal) reveal('Akun dibuat', r.sandi_awal, body.nama); load(); refreshBoot(); }).catch(function (e) { const er = U.$('#u-err'); er.hidden = false; er.textContent = e.message; });
            }
          }]
        });
      }
      function refreshBoot() { Api.call('app.bootstrap').then(function (d) { App.state.wakas = d.wakas; App.state.stafs = d.stafs; App.state.bidang = d.bidang; }); }
      function load() { return Api.call('users.list').then(function (d) { users = d.users; if (U.$('#us-body')) paint(); }).catch(function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e, load)); }); }
      UI.mount(html`${head('Manajemen Pengguna', 'Akun, peran, dan bidang. Tidak ada pendaftaran mandiri.', 'Pengguna', html`<button class="btn btn-primary" id="us-add">${UI.ic('person_add')}Tambah pengguna</button>`)}
        <div class="stack-lg"><div class="card card-pad"><div class="row row-wrap" style="gap:12px"><div class="input-wrap grow" style="min-width:200px">${UI.ic('search')}<input class="input" id="us-q" placeholder="Cari nama, email, NIP…" aria-label="Cari"></div>
          <select class="input" id="us-p" style="width:auto" aria-label="Peran"><option value="">Semua peran</option>${PERAN.map(function (r) { return html`<option>${r}</option>`; })}</select></div></div>
        <section class="card" id="us-body">${UI.skeleton(4)}</section></div>`);
      U.$('#us-add').onclick = function () { form(null); };
      U.$('#us-q').oninput = U.debounce(function (e) { q = e.target.value.trim().toLowerCase(); paint(); }, 150);
      U.$('#us-p').onchange = function (e) { fp = e.target.value; paint(); };
      UI.on(U.$('#us-body'), 'click', '[data-act]', function (e, el) {
        const u = users.filter(function (x) { return x.id_user === el.dataset.id; })[0];
        if (el.dataset.act === 'edit') form(u);
        else UI.confirm({ title: 'Reset kata sandi?', text: 'Kata sandi ' + u.nama + ' diganti dengan sandi acak. Pengguna wajib menggantinya saat masuk berikutnya.', ok: 'Reset', cls: 'btn-primary' }).then(function (ok) { if (ok) Api.call('users.resetPassword', { id_user: u.id_user }).then(function (r) { reveal('Kata sandi baru', r.sandi_awal, u.nama); }).catch(function (er) { UI.error(er); }); });
      });
      return load();
    }
  });

  // ======================= PAGU =======================
  Router.add('/admin/pagu', {
    title: 'Pagu Anggaran', nav: 'pagu', roles: ADM,
    render: function (p, ctx) {
      let ta = App.state.sekolah.tahun_ajaran, D = null;
      function nama(id) { const w = App.state.wakas.filter(function (x) { return x.id_user === id; })[0]; return w ? w.nama : 'Sekolah (pagu induk)'; }
      function form(r) {
        const edit = !!r; r = r || { id_waka: '', semester: 'Semester 1', jenis: 'Penetapan', nominal_pagu: '' };
        UI.modal({
          title: edit ? 'Ubah pagu' : 'Tetapkan pagu', wide: true,
          body: html`<div class="stack" style="padding-top:6px"><div class="grid-2"><div class="field"><label for="pg-w">Penerima pagu</label><select class="input" id="pg-w"><option value="">Sekolah (pagu induk)</option>${App.state.wakas.map(function (w) { return html`<option value="${w.id_user}" ${w.id_user === r.id_waka ? 'selected' : ''}>${w.nama} — ${w.bidang_waka}</option>`; })}</select></div>
            <div class="field"><label for="pg-s">Periode</label><select class="input" id="pg-s">${['Semester 1', 'Semester 2', 'Tahunan'].map(function (s) { return html`<option ${s === r.semester ? 'selected' : ''}>${s}</option>`; })}</select></div>
            <div class="field"><label for="pg-n">Nominal pagu</label><div class="prefix-rp"><input class="input" id="pg-n" inputmode="numeric" value="${r.nominal_pagu ? U.n(r.nominal_pagu) : ''}"></div></div>
            <div class="field"><label for="pg-j">Jenis</label><select class="input" id="pg-j"><option ${r.jenis === 'Penetapan' ? 'selected' : ''}>Penetapan</option><option ${r.jenis === 'Top-up' ? 'selected' : ''}>Top-up</option></select></div></div>
            <div class="field"><label for="pg-d">Dasar SK / Nomor Berita Acara</label><input class="input" id="pg-d" maxlength="150" value="${r.dasar_sk || ''}" placeholder="mis. SK Kepsek No. 421/045/2026"></div>
            <div class="field"><label for="pg-c">Catatan (opsional)</label><input class="input" id="pg-c" maxlength="300" value="${r.catatan || ''}"></div>
            <div class="alert alert-info">${UI.ic('info')}<div>Total pagu seluruh Waka tidak boleh melebihi pagu induk sekolah (bila ditetapkan). Pagu tahunan tidak boleh lebih kecil dari yang telah diusulkan.</div></div><div class="err-txt" id="pg-e" hidden></div></div>`,
          onOpen: function (el) { const n = U.$('#pg-n', el); n.oninput = function () { const v = U.parseNum(n.value); if (!isNaN(v)) n.value = U.n(v); }; },
          foot: [{ label: 'Batal', value: null }, {
            label: 'Simpan', cls: 'btn-primary', click: function (close, btn) {
              const body = { id_pagu: edit ? r.id_pagu : '', tahun_ajaran: ta, id_waka: U.$('#pg-w').value, semester: U.$('#pg-s').value, nominal_pagu: U.parseNum(U.$('#pg-n').value) || 0, jenis: U.$('#pg-j').value, dasar_sk: U.$('#pg-d').value, catatan: U.$('#pg-c').value };
              UI.busy(btn, Api.call('pagu.save', body), 'Menyimpan…').then(function () { close(true); Api.dropCache(); UI.toast('Pagu disimpan.'); load(); }).catch(function (e) { const er = U.$('#pg-e'); er.hidden = false; er.textContent = e.message; });
            }
          }]
        });
      }
      function paint() {
        const d = D;
        U.$('#pg-body').innerHTML = String(html`<div class="stack-lg">
          ${d.terkunci ? html`<div class="alert alert-warn">${UI.ic('lock')}<div><b>Pagu TA ${d.ta} sedang dikunci (Lock Season)</b>Penetapan, perubahan, dan penghapusan pagu dinonaktifkan sampai kunci dibuka.</div></div>` : ''}
          <div class="grid-4"><div class="card kpi"><div class="k-top"><span class="k-lbl">Pagu induk sekolah</span><span class="k-ico">${UI.ic('account_balance')}</span></div><div class="k-val">${U.juta(d.induk)}</div></div>
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Terdistribusi ke Waka</span><span class="k-ico">${UI.ic('call_split')}</span></div><div class="k-val">${U.juta(d.didistribusi)}</div></div>
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Cadangan</span><span class="k-ico">${UI.ic('savings')}</span></div><div class="k-val" style="${d.cadangan < 0 ? 'color:var(--bad-fg)' : ''}">${U.juta(d.cadangan)}</div></div>
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Lock Season</span><span class="k-ico">${UI.ic(d.terkunci ? 'lock' : 'lock_open')}</span></div><label class="row" style="gap:10px;margin-top:4px"><span class="switch"><input type="checkbox" id="pg-lock" ${d.terkunci ? 'checked' : ''}><span></span></span><b>${d.terkunci ? 'Terkunci' : 'Terbuka'}</b></label></div></div>
          <section class="card"><div class="card-head"><h3>Pagu per Waka</h3></div><div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Waka / Bidang</th><th class="num">Semester 1</th><th class="num">Semester 2</th><th class="num">Tahunan</th><th class="num">Total</th><th class="num">Diusulkan</th><th class="num">Sisa</th></tr></thead><tbody>${d.per_waka.map(function (w) {
            return html`<tr><td data-l="Waka"><b>${w.nama}</b><div class="small muted">${w.bidang}</div></td><td class="num" data-l="Smt 1">${U.n(w.s1)}</td><td class="num" data-l="Smt 2">${U.n(w.s2)}</td><td class="num" data-l="Tahunan">${U.n(w.thn)}</td><td class="num" data-l="Total"><b>${U.n(w.pagu)}</b></td><td class="num" data-l="Diusulkan">${U.n(w.usulan)}</td><td class="num" data-l="Sisa" style="${w.sisa < 0 ? 'color:var(--bad-fg)' : ''}">${U.n(w.sisa)}</td></tr>`;
          })}</tbody></table></div></section>
          <section class="card"><div class="card-head"><h3>Riwayat penetapan &amp; top-up</h3><span class="small muted">${d.rows.length} entri</span></div>${d.rows.length ? html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Penerima</th><th>Periode</th><th>Jenis</th><th class="num">Nominal</th><th>Dasar SK</th><th>Diubah</th><th></th></tr></thead><tbody>${d.rows.map(function (r) {
            return html`<tr><td data-l="Penerima"><b>${r.nama_waka}</b>${r.bidang ? html`<div class="small muted">${r.bidang}</div>` : ''}</td><td data-l="Periode">${r.semester}</td><td data-l="Jenis"><span class="chip">${r.jenis}</span></td><td class="num" data-l="Nominal">${U.rp(r.nominal_pagu)}</td><td data-l="Dasar" class="small">${r.dasar_sk}${r.catatan ? html`<div class="muted">${r.catatan}</div>` : ''}</td><td data-l="Diubah" class="small muted">${U.tgl(r.diubah)}</td>
              <td class="nolabel" style="white-space:nowrap"><button class="btn btn-icon btn-ghost" data-act="edit" data-id="${r.id_pagu}" ${d.terkunci ? 'disabled' : ''} aria-label="Ubah">${UI.ic('edit')}</button><button class="btn btn-icon btn-ghost" data-act="del" data-id="${r.id_pagu}" ${d.terkunci ? 'disabled' : ''} aria-label="Hapus">${UI.ic('delete')}</button></td></tr>`;
          })}</tbody></table></div>` : UI.empty('account_balance_wallet', 'Belum ada pagu', 'Tetapkan pagu induk sekolah, lalu bagikan ke setiap Waka.')}</section></div>`);
        U.$('#pg-add').disabled = !!d.terkunci;
        U.$('#pg-lock').onchange = function () {
          const on = this.checked;
          UI.confirm({ title: on ? 'Kunci pagu?' : 'Buka kunci pagu?', text: on ? 'Pagu tidak dapat diubah sampai dibuka kembali.' : 'Pagu dapat diubah kembali. Perubahan tercatat di audit.', ok: on ? 'Kunci' : 'Buka kunci', cls: 'btn-primary' }).then(function (ok) {
            if (!ok) { this.checked = !on; paint(); return; }
            Api.call('pagu.lock', { ta: ta, kunci: on }).then(function () { Api.dropCache(); load(); }).catch(function (e) { UI.error(e); load(); });
          }.bind(this));
        };
      }
      function load() { return Api.call('pagu.list', { ta: ta }).then(function (d) { D = d; if (ctx.alive() && U.$('#pg-body')) paint(); }).catch(function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e, load)); }); }
      const y = parseInt(ta, 10);
      UI.mount(html`${head('Pagu Anggaran', 'Pagu induk sekolah dan alokasi per Waka per periode.', 'Pagu', html`<select class="input" id="pg-ta" style="width:auto" aria-label="Tahun ajaran">${[(y - 1) + '/' + y, ta, (y + 1) + '/' + (y + 2)].map(function (t) { return html`<option ${t === ta ? 'selected' : ''}>${t}</option>`; })}</select><button class="btn btn-primary" id="pg-add">${UI.ic('add')}Tetapkan pagu</button>`)}<div id="pg-body">${UI.skeleton(4)}</div>`);
      U.$('#pg-ta').onchange = function (e) { ta = e.target.value; U.$('#pg-body').innerHTML = String(UI.skeleton(4)); load(); };
      U.$('#pg-add').onclick = function () { form(null); };
      UI.on(U.$('#pg-body'), 'click', '[data-act]', function (e, el) {
        const r = D.rows.filter(function (x) { return x.id_pagu === el.dataset.id; })[0];
        if (el.dataset.act === 'edit') form(r);
        else UI.confirm({ title: 'Hapus pagu?', text: r.nama_waka + ' · ' + r.semester + ' · ' + U.rp(r.nominal_pagu) + '. Penghapusan ditolak bila membuat pagu lebih kecil dari usulan yang ada.', ok: 'Hapus', cls: 'btn-danger-solid' }).then(function (ok) { if (ok) Api.call('pagu.delete', { id_pagu: r.id_pagu }).then(function () { Api.dropCache(); UI.toast('Pagu dihapus.'); load(); }).catch(function (er) { UI.error(er); }); });
      });
      return load();
    }
  });

  // ======================= SSH =======================
  Router.add('/admin/ssh', {
    title: 'Standar Harga (SSH)', nav: 'ssh', roles: ADM,
    render: function (p, ctx) {
      let D = null, q = '', kat = '', sta = '';
      function paint() {
        const rows = D.rows.filter(function (r) { return (!kat || r.kategori === kat) && (!sta || r.status_aktif === sta) && (!q || (r.kode + ' ' + r.nama_item + ' ' + r.kategori).toLowerCase().indexOf(q) >= 0); });
        U.$('#sh-body').innerHTML = String(rows.length ? html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Kode</th><th>Item</th><th>Kategori</th><th>Satuan</th><th class="num">Harga SSH</th><th>Dipakai</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(function (r) {
          return html`<tr class="${r.status_aktif === 'Aktif' ? '' : 'dim'}"><td data-l="Kode" class="code">${r.kode}</td><td data-l="Item"><b>${r.nama_item}</b>${r.snp ? html`<div class="small muted">${r.snp}</div>` : ''}${r.catatan_juknis ? html`<div class="small faint">${r.catatan_juknis}</div>` : ''}</td><td data-l="Kategori" class="small">${r.kategori || '—'}</td><td data-l="Satuan">${r.satuan}</td><td class="num" data-l="Harga">${U.n(r.harga)}</td><td data-l="Dipakai" class="small">${r.dipakai} rincian</td>
            <td data-l="Status">${r.status_aktif === 'Aktif' ? html`<span class="badge b-ok">Aktif</span>` : html`<span class="badge b-draft">Nonaktif</span>`}</td><td class="nolabel"><button class="btn btn-sm" data-id="${r.id_item}">${UI.ic('edit', 'ic-sm')}Ubah</button></td></tr>`;
        })}</tbody></table></div>` : UI.empty('inventory_2', 'Tidak ada item', 'Tambah item atau impor dari CSV.'));
        U.$('#sh-cnt').textContent = rows.length + ' dari ' + D.rows.length + ' item';
      }
      function form(r) {
        const edit = !!r; r = r || { status_aktif: 'Aktif', satuan: '', kategori: '' };
        UI.modal({
          title: edit ? 'Ubah item SSH' : 'Tambah item SSH', wide: true,
          body: html`<div class="stack" style="padding-top:6px"><div class="grid-2"><div class="field"><label for="sh-k">Kode</label><input class="input mono" id="sh-k" value="${r.kode || ''}" placeholder="ATK-001"></div><div class="field"><label for="sh-c">Kategori</label><input class="input" id="sh-c" list="sh-cl" value="${r.kategori || ''}"><datalist id="sh-cl">${D.kategori.map(function (k) { return html`<option value="${k}">`; })}</datalist></div></div>
            <div class="field"><label for="sh-n">Nama item</label><input class="input" id="sh-n" value="${r.nama_item || ''}"></div>
            <div class="grid-2"><div class="field"><label for="sh-s">Satuan</label><input class="input" id="sh-s" value="${r.satuan || ''}" placeholder="Rim, Unit, Porsi…"></div><div class="field"><label for="sh-h">Harga satuan SSH</label><div class="prefix-rp"><input class="input" id="sh-h" inputmode="numeric" value="${r.harga ? U.n(r.harga) : ''}"></div></div>
              <div class="field"><label for="sh-p">SNP</label><select class="input" id="sh-p"><option value="">—</option>${D.snp.map(function (s) { return html`<option ${s === r.snp ? 'selected' : ''}>${s}</option>`; })}</select></div><div class="field"><label for="sh-st">Status</label><select class="input" id="sh-st"><option ${r.status_aktif === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${r.status_aktif === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div></div>
            <div class="field"><label for="sh-j">Catatan juknis</label><input class="input" id="sh-j" maxlength="400" value="${r.catatan_juknis || ''}"></div>
            <div class="field"><label for="sh-b">Bidang pengguna <span class="faint">(pisahkan koma; kosong = semua bidang)</span></label><input class="input" id="sh-b" value="${r.bidang_pengguna || ''}"></div>
            ${edit ? html`<div class="alert alert-info">${UI.ic('info')}<div>Perubahan harga tidak mengubah rincian RAB yang sudah ada; hanya berlaku untuk item yang dipilih setelahnya.</div></div>` : ''}<div class="err-txt" id="sh-e" hidden></div></div>`,
          onOpen: function (el) { const n = U.$('#sh-h', el); n.oninput = function () { const v = U.parseNum(n.value); if (!isNaN(v)) n.value = U.n(v); }; },
          foot: [{ label: 'Batal', value: null }, {
            label: 'Simpan', cls: 'btn-primary', click: function (close, btn) {
              const body = { id_item: edit ? r.id_item : '', kode: U.$('#sh-k').value, kategori: U.$('#sh-c').value, nama_item: U.$('#sh-n').value, satuan: U.$('#sh-s').value, harga: U.parseNum(U.$('#sh-h').value) || 0, snp: U.$('#sh-p').value, status_aktif: U.$('#sh-st').value, catatan_juknis: U.$('#sh-j').value, bidang_pengguna: U.$('#sh-b').value };
              UI.busy(btn, Api.call('ssh.save', body), 'Menyimpan…').then(function () { close(true); Api.dropCache(); UI.toast('Item SSH disimpan.'); refresh(); }).catch(function (e) { const er = U.$('#sh-e'); er.hidden = false; er.textContent = e.message; });
            }
          }]
        });
      }
      const HEAD = ['kode', 'kategori', 'nama_item', 'satuan', 'harga', 'snp', 'catatan_juknis', 'bidang_pengguna', 'status_aktif'];
      function importDialog() {
        let parsed = [];
        UI.modal({
          title: 'Impor SSH dari CSV', wide: true,
          body: html`<div class="stack" style="padding-top:6px"><p class="muted">Kolom: <span class="mono small">${HEAD.join(', ')}</span>. Kode yang sudah ada akan diperbarui; kode baru ditambahkan. Impor bersifat atomik — bila ada baris salah, tidak ada yang tersimpan.</p>
            <div class="row"><button class="btn" id="im-tpl">${UI.ic('download')}Unduh templat</button><label class="btn btn-primary" for="im-f" style="cursor:pointer">${UI.ic('upload_file')}Pilih berkas CSV</label><input type="file" id="im-f" class="sr" accept=".csv,text/csv"></div><div id="im-info"></div></div>`,
          onOpen: function (el) {
            U.$('.modal-f .btn-primary', el).disabled = true;
            U.$('#im-tpl', el).onclick = function () { U.saveBlob(new Blob([U.toCsv([HEAD, ['ATK-010', 'ATK & Perkantoran', 'Spidol whiteboard', 'Pcs', '9500', 'Standar Sarana dan Prasarana', '', '', 'Aktif']])], { type: 'text/csv;charset=utf-8' }), 'templat-ssh.csv'); };
            U.$('#im-f', el).onchange = function () {
              const f = this.files[0]; if (!f) return;
              const rd = new FileReader();
              rd.onload = function () {
                const t = U.parseCsv(String(rd.result)); if (t.length < 2) { U.$('#im-info', el).innerHTML = '<div class="alert alert-bad"><div>Berkas kosong atau tanpa baris data.</div></div>'; return; }
                const h = t[0].map(function (x) { return x.trim().toLowerCase().replace(/\s+/g, '_'); });
                parsed = t.slice(1).map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = (r[i] || '').trim(); }); if (o.harga) o.harga = U.parseNum(o.harga); return o; });
                U.$('#im-info', el).innerHTML = String(html`<div class="alert alert-info">${UI.ic('table_view')}<div><b>${parsed.length} baris siap diimpor</b>Contoh: ${parsed.slice(0, 3).map(function (r) { return r.kode + ' ' + r.nama_item; }).join('; ')}…</div></div>`);
                U.$('.modal-f .btn-primary', el).disabled = false;
              };
              rd.readAsText(f, 'utf-8');
            };
          },
          foot: [{ label: 'Batal', value: null }, {
            label: 'Impor', cls: 'btn-primary', id: 'im-go', click: function (close, btn, bg) {
              if (!parsed.length) return;
              UI.busy(btn, Api.call('ssh.import', { rows: parsed }), 'Mengimpor…').then(function (r) { close(true); Api.dropCache(); UI.toast('Impor selesai: ' + r.baru + ' baru, ' + r.diperbarui + ' diperbarui.'); refresh(); })
                .catch(function (e) { const box = U.$('#im-info', bg); box.innerHTML = String(html`<div class="alert alert-bad">${UI.ic('error')}<div><b>${e.message}</b>${e.extra && e.extra.errors ? html`<ul style="margin:6px 0 0;padding-left:18px">${e.extra.errors.map(function (x) { return html`<li>${x}</li>`; })}</ul>` : ''}</div></div>`); });
            }
          }],
        });
      }
      function refresh() { return Api.call('ssh.list').then(function (d) { D = d; App.state.items = App.state.items; paint(); Api.call('app.bootstrap').then(function (b) { App.state.items = b.items; }); }).catch(function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e, refresh)); }); }
      UI.mount(html`${head('Standar Satuan Harga (SSH)', 'Katalog harga acuan. Harga rincian RAB selalu diambil dari sini, tidak dapat diisi bebas.', 'Standar Harga', html`<button class="btn" id="sh-imp">${UI.ic('upload_file')}Impor CSV</button><button class="btn btn-primary" id="sh-add">${UI.ic('add')}Tambah item</button>`)}
        <div class="alert alert-warn" style="margin-bottom:16px">${UI.ic('warning')}<div><b>Katalog awal berisi harga CONTOH</b>Ganti atau impor SSH resmi daerah sebelum RAB digunakan.</div></div>
        <div class="stack-lg"><div class="card card-pad"><div class="row row-wrap" style="gap:12px"><div class="input-wrap grow" style="min-width:200px">${UI.ic('search')}<input class="input" id="sh-q" placeholder="Cari kode atau nama item…" aria-label="Cari"></div>
          <select class="input" id="sh-kat" style="width:auto" aria-label="Kategori"><option value="">Semua kategori</option></select><select class="input" id="sh-sta" style="width:auto" aria-label="Status"><option value="">Semua status</option><option>Aktif</option><option>Nonaktif</option></select></div></div>
        <section class="card"><div class="card-head"><span class="small muted mono" id="sh-cnt"></span></div><div id="sh-body">${UI.skeleton(4)}</div></section></div>`);
      U.$('#sh-add').onclick = function () { form(null); };
      U.$('#sh-imp').onclick = importDialog;
      U.$('#sh-q').oninput = U.debounce(function (e) { q = e.target.value.trim().toLowerCase(); paint(); }, 150);
      U.$('#sh-kat').onchange = function (e) { kat = e.target.value; paint(); };
      U.$('#sh-sta').onchange = function (e) { sta = e.target.value; paint(); };
      UI.on(U.$('#sh-body'), 'click', '[data-id]', function (e, el) { form(D.rows.filter(function (x) { return x.id_item === el.dataset.id; })[0]); });
      return Api.call('ssh.list').then(function (d) { D = d; U.$('#sh-kat').innerHTML += d.kategori.map(function (k) { return '<option>' + U.esc(k) + '</option>'; }).join(''); paint(); }).catch(function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e)); });
    }
  });

  // ======================= NOTIFIKASI, LOG, AUDIT, PENGATURAN =======================
  Router.add('/admin/notif', {
    title: 'Notifikasi & Log', nav: 'notif', roles: ADM,
    render: function (p, ctx) {
      let tab = 'log';
      const box = function () { return U.$('#nt-body'); };
      function tabs() { U.$$('#nt-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === tab); }); }
      function show(t) { tab = t; tabs(); box().innerHTML = String(UI.skeleton(3)); ({ log: tLog, audit: tAudit, cfg: tCfg })[t](); }

      function tLog() {
        let kanal = 'Semua', st = 'Semua', q = '';
        const draw = function () {
          Api.call('notif.log', { kanal: kanal, status: st, q: q }).then(function (d) {
            if (tab !== 'log' || !ctx.alive()) return;
            const r = d.ringkas;
            box().innerHTML = String(html`<div class="stack-lg"><div class="grid-4"><div class="card kpi"><div class="k-lbl">Hari ini</div><div class="k-val">${r.hari_ini}</div></div><div class="card kpi"><div class="k-lbl">Terkirim</div><div class="k-val" style="color:var(--ok-fg)">${r.terkirim}</div></div><div class="card kpi"><div class="k-lbl">Gagal</div><div class="k-val" style="color:var(--bad-fg)">${r.gagal}</div></div><div class="card kpi"><div class="k-lbl">Kuota email harian</div><div class="k-val">${r.kuota_email}</div><div class="k-sub">Email ${r.email_aktif ? 'aktif' : 'nonaktif'} · WA ${r.wa_aktif ? (r.wa_token ? 'aktif' : 'aktif, token kosong') : 'nonaktif'}</div></div></div>
              <div class="card card-pad"><div class="row row-wrap" style="gap:12px"><div class="input-wrap grow" style="min-width:200px">${UI.ic('search')}<input class="input" id="lg-q" value="${q}" placeholder="Cari penerima atau pesan…"></div><select class="input" id="lg-k" style="width:auto">${['Semua', 'Email', 'WhatsApp'].map(function (x) { return html`<option ${x === kanal ? 'selected' : ''}>${x}</option>`; })}</select><select class="input" id="lg-s" style="width:auto">${['Semua', 'Terkirim', 'Gagal'].map(function (x) { return html`<option ${x === st ? 'selected' : ''}>${x}</option>`; })}</select></div></div>
              <section class="card">${d.rows.length ? html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Waktu</th><th>Penerima</th><th>Kanal</th><th>Kejadian</th><th>Pesan</th><th>Status</th><th></th></tr></thead><tbody>${d.rows.map(function (l) {
                return html`<tr><td data-l="Waktu" class="small">${U.tglJam(l.waktu)}</td><td data-l="Penerima"><b>${l.nama_penerima}</b><div class="small muted">${l.peran_penerima}</div></td><td data-l="Kanal"><span class="chip">${l.kanal}</span></td><td data-l="Kejadian" class="small">${l.event}</td><td data-l="Pesan" class="small" style="max-width:340px">${String(l.pesan).slice(0, 120)}${l.detail ? html`<div style="color:var(--bad-fg)">${l.detail}</div>` : ''}</td>
                  <td data-l="Status">${l.status_kirim === 'Terkirim' ? html`<span class="badge b-ok">Terkirim</span>` : html`<span class="badge b-rev">Gagal</span>`}</td><td class="nolabel">${l.status_kirim === 'Gagal' ? html`<button class="btn btn-sm" data-retry="${l.id}">${UI.ic('replay', 'ic-sm')}Kirim ulang</button>` : ''}</td></tr>`; })}</tbody></table></div>` : UI.empty('mark_email_unread', 'Belum ada log', 'Log muncul setelah notifikasi dikirim.')}</section></div>`);
            U.$('#lg-q').oninput = U.debounce(function (e) { q = e.target.value.trim(); draw(); }, 400);
            U.$('#lg-k').onchange = function (e) { kanal = e.target.value; draw(); }; U.$('#lg-s').onchange = function (e) { st = e.target.value; draw(); };
            UI.on(box(), 'click', '[data-retry]', function (e, el) { UI.busy(el, Api.call('notif.retry', { id: el.dataset.retry }), '…').then(function (r) { UI.toast(r.ok ? 'Terkirim ulang.' : 'Masih gagal: ' + r.detail, r.ok ? 'ok' : 'err'); draw(); }).catch(function (er) { UI.error(er); }); });
          }).catch(function (e) { if (tab === 'log') box().innerHTML = String(UI.errorBox(e, draw)); });
        };
        draw();
      }
      function tAudit() {
        let q = '';
        const draw = function () {
          Api.call('audit.list', { q: q, limit: 150 }).then(function (d) {
            if (tab !== 'audit' || !ctx.alive()) return;
            box().innerHTML = String(html`<div class="stack-lg"><div class="card card-pad"><div class="input-wrap">${UI.ic('search')}<input class="input" id="au-q" value="${q}" placeholder="Cari pengguna, aksi, atau entitas…"></div></div>
              <section class="card"><div class="card-head"><h3>Jejak audit</h3><span class="small muted">${d.rows.length} dari ${d.total}</span></div>${d.rows.length ? html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>Detail</th></tr></thead><tbody>${d.rows.map(function (a) {
                return html`<tr><td data-l="Waktu" class="small">${U.tglJam(a.waktu)}</td><td data-l="Pengguna"><b>${a.nama}</b><div class="small muted">${a.peran}</div></td><td data-l="Aksi"><span class="chip">${a.aksi}</span></td><td data-l="Entitas" class="small mono">${a.entitas}</td><td data-l="Detail" class="small mono" style="max-width:300px;word-break:break-all">${a.detail}</td></tr>`; })}</tbody></table></div>` : UI.empty('history', 'Tidak ada catatan', '')}</section></div>`);
            U.$('#au-q').oninput = U.debounce(function (e) { q = e.target.value.trim(); draw(); }, 400);
          }).catch(function (e) { if (tab === 'audit') box().innerHTML = String(UI.errorBox(e, draw)); });
        };
        draw();
      }
      function tCfg() {
        Api.call('config.get').then(function (d) {
          if (tab !== 'cfg' || !ctx.alive()) return;
          const c = d.config;
          const fld = function (k, label, extra) { return html`<div class="field"><label for="cf-${k}">${label}</label><input class="input" id="cf-${k}" data-k="${k}" value="${c[k] || ''}" ${extra || ''}></div>`; };
          box().innerHTML = String(html`<div class="stack-lg">
            <section class="card"><div class="card-head"><h3>Identitas sekolah &amp; dokumen</h3></div><div class="card-pad stack"><div class="grid-2">${fld('NAMA_SEKOLAH', 'Nama sekolah')}${fld('NPSN', 'NPSN')}${fld('ALAMAT_SEKOLAH', 'Alamat')}${fld('KOTA_TTD', 'Kota tanda tangan')}${fld('TELP_SEKOLAH', 'Telepon')}${fld('EMAIL_SEKOLAH', 'Email sekolah')}${fld('KOP_1', 'Kop baris 1')}${fld('KOP_2', 'Kop baris 2')}${fld('TAHUN_AJARAN_AKTIF', 'Tahun ajaran aktif (2026/2027)')}${fld('AMBANG_PERINGATAN', 'Ambang peringatan serapan (%)', 'inputmode="numeric"')}${fld('DOMAIN_EMAIL', 'Batasi domain email pengguna (opsional)')}</div>${fld('REGULASI_REF', 'Acuan regulasi (tampil di dokumen)')}</div></section>
            <section class="card"><div class="card-head"><h3>Notifikasi</h3></div><div class="card-pad stack">
              <label class="row" style="gap:12px"><span class="switch"><input type="checkbox" id="cf-email" ${c.EMAIL_AKTIF === 'Ya' ? 'checked' : ''}><span></span></span><span><b>Notifikasi email</b><div class="small muted">Memakai kuota MailApp akun pemilik skrip.</div></span></label>
              <label class="row" style="gap:12px"><span class="switch"><input type="checkbox" id="cf-wa" ${c.WA_AKTIF === 'Ya' ? 'checked' : ''}><span></span></span><span><b>Notifikasi WhatsApp (Fonnte)</b><div class="small muted">Token disimpan di Script Properties, tidak pernah dikirim kembali ke browser.</div></span></label>
              <div class="grid-2"><div class="field"><label for="cf-tok">Token Fonnte ${d.wa_token_set ? html`<span class="badge b-ok" style="height:20px">tersimpan</span>` : html`<span class="badge b-draft" style="height:20px">belum diisi</span>`}</label><input class="input" id="cf-tok" type="password" autocomplete="off" placeholder="${d.wa_token_set ? 'Kosongkan bila tidak diganti' : 'Tempel token Fonnte'}"></div>
                <div class="field"><label for="cf-url">URL aplikasi (untuk tautan di pesan)</label><input class="input" id="cf-url" value="${d.app_url}" placeholder="https://username.github.io/rab-waka/"></div></div>
              ${d.wa_token_set ? html`<label class="check"><input type="checkbox" id="cf-hapus"><span>Hapus token tersimpan</span></label>` : ''}</div></section>
            <div class="row" style="justify-content:flex-end"><button class="btn btn-primary btn-lg" id="cf-save">${UI.ic('save')}Simpan pengaturan</button></div>
            <section class="card"><div class="card-head"><h3>Uji kirim</h3></div><div class="card-pad"><div class="row row-wrap" style="gap:12px"><select class="input" id="ts-k" style="width:auto"><option>Email</option><option>WhatsApp</option></select><input class="input grow" id="ts-t" style="min-width:220px" placeholder="Alamat email atau nomor WA (628…)"><button class="btn" id="ts-go">${UI.ic('send')}Kirim uji</button></div><div id="ts-r" class="small" style="margin-top:10px"></div></div></section></div>`);
          U.$('#cf-save').onclick = function () {
            const cfg = {}; U.$$('[data-k]', box()).forEach(function (i) { cfg[i.dataset.k] = i.value; });
            cfg.EMAIL_AKTIF = U.$('#cf-email').checked ? 'Ya' : 'Tidak'; cfg.WA_AKTIF = U.$('#cf-wa').checked ? 'Ya' : 'Tidak';
            const h = U.$('#cf-hapus');
            UI.busy(U.$('#cf-save'), Api.call('config.save', { config: cfg, wa_token: U.$('#cf-tok').value, hapus_wa_token: !!(h && h.checked), app_url: U.$('#cf-url').value }), 'Menyimpan…')
              .then(function () { Api.dropCache(); UI.toast('Pengaturan disimpan.'); Api.call('app.bootstrap').then(function (b) { App.state.sekolah = b.sekolah; App.paintShell(); }); show('cfg'); }).catch(function (e) { UI.error(e); });
          };
          U.$('#ts-go').onclick = function () {
            UI.busy(U.$('#ts-go'), Api.call('notif.test', { kanal: U.$('#ts-k').value, tujuan: U.$('#ts-t').value }), 'Mengirim…').then(function (r) { U.$('#ts-r').innerHTML = String(r.ok ? html`<span style="color:var(--ok-fg)">Berhasil terkirim.</span>` : html`<span style="color:var(--bad-fg)">Gagal: ${r.detail}</span>`); }).catch(function (e) { UI.error(e); });
          };
        }).catch(function (e) { if (tab === 'cfg') box().innerHTML = String(UI.errorBox(e, tCfg)); });
      }

      UI.mount(html`${head('Notifikasi & Log', 'Pengiriman email/WhatsApp, jejak audit, dan pengaturan sekolah.', 'Notifikasi', '')}
        <div class="card"><div class="tabs" id="nt-tabs"><button data-t="log">${UI.ic('forward_to_inbox')}Log notifikasi</button><button data-t="audit">${UI.ic('history')}Jejak audit</button><button data-t="cfg">${UI.ic('settings')}Pengaturan</button></div></div><div id="nt-body" style="margin-top:20px"></div>`);
      UI.on(U.$('#nt-tabs'), 'click', '[data-t]', function (e, el) { show(el.dataset.t); });
      show(ctx.query.tab || 'log');
    }
  });
})();
