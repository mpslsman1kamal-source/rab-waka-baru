/* pages/rab-editor.js — editor rincian RAB: kegiatan, item SSH (combobox), simpan optimistis */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE, S = U.ST;

  // ---------- Combobox item SSH ----------
  function itemsFor(bidang) {
    const b = String(bidang || '').toLowerCase();
    return App.state.items.filter(function (i) {
      if (!i.bidang_pengguna) return true;
      return i.bidang_pengguna.toLowerCase().split(',').map(function (x) { return x.trim(); }).indexOf(b) >= 0;
    });
  }
  function attachCombo(input, getItems, onPick, onRevert) {
    const wrap = input.closest('.combo');
    let list = null, hl = -1, flat = [];
    function close() { if (list) { list.remove(); list = null; } hl = -1; }
    function open() {
      const q = input.value.trim().toLowerCase();
      const words = q.split(/\s+/).filter(Boolean);
      flat = getItems().filter(function (i) { const t = (i.kode + ' ' + i.nama_item + ' ' + i.kategori).toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0; }); }).slice(0, 60);
      if (!list) { list = document.createElement('div'); list.className = 'combo-list'; list.setAttribute('role', 'listbox'); wrap.appendChild(list); }
      let h = '', last = null;
      flat.forEach(function (i, k) {
        if (i.kategori !== last) { h += '<div class="g">' + U.esc(i.kategori || 'Lainnya') + '</div>'; last = i.kategori; }
        h += '<div class="o' + (k === hl ? ' hl' : '') + '" role="option" data-k="' + k + '"><b>' + U.esc(i.nama_item) + '</b><small>' + U.esc(i.kode) + ' · ' + U.esc(i.satuan) + ' · <span class="mono">' + U.rp(i.harga) + '</span></small></div>';
      });
      const rc = input.getBoundingClientRect(), wd = Math.max(rc.width, 340);
      list.style.position = 'fixed'; list.style.right = 'auto'; list.style.width = wd + 'px';
      list.style.left = Math.max(8, Math.min(rc.left, window.innerWidth - wd - 8)) + 'px';
      const below = window.innerHeight - rc.bottom; list.style.maxHeight = Math.max(160, Math.min(280, below > 200 ? below - 16 : rc.top - 16)) + 'px';
      list.style.top = below > 200 ? (rc.bottom + 4) + 'px' : 'auto'; list.style.bottom = below > 200 ? 'auto' : (window.innerHeight - rc.top + 4) + 'px';
      list.innerHTML = h || '<div class="o" style="cursor:default"><span class="muted">Item tidak ditemukan di katalog standar harga.</span><small>Hubungi Admin untuk menambahkan item ke SSH.</small></div>';
    }
    function pick(k) { const it = flat[k]; if (!it) return; close(); onPick(it); }
    window.addEventListener('scroll', function (e) { if (list && e.target !== list) close(); }, true);
    input.addEventListener('focus', function () { input.select(); open(); });
    input.addEventListener('input', function () { hl = -1; open(); });
    input.addEventListener('keydown', function (e) {
      if (!list) { if (e.key === 'ArrowDown') open(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(flat.length - 1, hl + 1); open(); const el = U.$('.o.hl', list); if (el) el.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); open(); const el = U.$('.o.hl', list); if (el) el.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { if (hl >= 0) { e.preventDefault(); pick(hl); } else if (flat.length === 1) { e.preventDefault(); pick(0); } }
      else if (e.key === 'Escape') { close(); input.blur(); }
    });
    input.addEventListener('blur', function () { setTimeout(function () { if (list) { close(); if (onRevert) onRevert(); } }, 160); });
    wrap.addEventListener('mousedown', function (e) { const o = e.target.closest('.o[data-k]'); if (o) { e.preventDefault(); pick(Number(o.dataset.k)); } });
  }

  // ---------- Editor ----------
  function render(idRab, ctx) {
    const user = App.state.user;
    const s = Engine.get(idRab);
    let unsub = null, first = true;

    function missingBukti(d) {
      const b = s.data.berkas;
      if (d.sudah_didanai_lain === 'Ya') return b.some(function (x) { return x.id_detail === d.id_detail && x.jenis === 'bukti_pendanaan'; }) ? '' : 'Bukti pendanaan';
      if (d.kebutuhan_riil === 'Ya') return b.some(function (x) { return x.id_detail === d.id_detail && x.jenis === 'foto_kondisi'; }) ? '' : 'Foto kondisi';
      return '';
    }
    function sig(d) { return (d.catatan_bendahara || '') + '|' + missingBukti(d); }

    function rowHtml(d) {
      const didanai = d.sudah_didanai_lain === 'Ya';
      return html`<tr data-id="${d.id_detail}" class="${didanai ? 'row-ok-mark' : ''}" data-sig="${sig(d)}">
        <td data-l="Item" class="col" style="min-width:220px"><div class="combo"><input class="input cell-in" data-f="item" value="${d.kode_item + ' · ' + d.nama_item}" autocomplete="off" aria-label="Item belanja"></div>
          <input class="input cell-in" style="margin-top:6px" data-f="uraian" value="${d.uraian}" maxlength="500" placeholder="Uraian / spesifikasi (opsional)" aria-label="Uraian"><div class="row row-wrap" style="gap:4px 12px;margin-top:6px"><label class="check small"><input type="checkbox" data-f="didanai" ${didanai ? 'checked' : ''}><span>Didanai lain</span></label><label class="check small"><input type="checkbox" data-f="riil" ${d.kebutuhan_riil === 'Ya' ? 'checked' : ''}><span>Kebutuhan riil</span></label></div><div class="small" data-st style="margin-top:4px">${statusChip(d)}</div></td>
        <td data-l="Volume"><input class="input cell-in num-input" data-f="volume" inputmode="decimal" value="${U.dec(d.volume)}" aria-label="Volume"><div class="small muted" data-sat style="text-align:right">${d.satuan}</div></td>
        <td data-l="Frekuensi"><input class="input cell-in num-input" data-f="frekuensi" inputmode="decimal" value="${U.dec(d.frekuensi)}" aria-label="Frekuensi"></td>
        <td data-l="Harga SSH" class="num" data-hrg>${U.n(d.harga_satuan)}</td>
        <td data-l="Subtotal" class="num"><b data-sub>${U.n(d.subtotal)}</b><div class="small" data-nb style="color:var(--bad-fg);font-weight:500" ${didanai ? '' : 'hidden'}>Non-BOSP · 0</div></td>
        <td class="nolabel"><button class="btn btn-icon btn-ghost" data-act="del-item" title="Hapus item" aria-label="Hapus item">${UI.ic('delete')}</button></td></tr>${noteRow(d)}`;
    }
    function statusChip(d) {
      if (s.data.rab.status !== S.REVISI && !d.catatan_bendahara) return '';
      if (d.status_item === 'Revisi') return html`<span class="badge b-rev">Perlu revisi</span>`;
      if (d.status_item === 'Setuju') return html`<span class="badge b-ok">Disetujui</span>`;
      return d.catatan_bendahara ? html`<span class="badge b-wait">Ditanggapi</span>` : '';
    }
    function noteRow(d) {
      const mb = missingBukti(d);
      if (!d.catatan_bendahara && !mb) return '';
      return html`<tr class="note" data-note="${d.id_detail}"><td class="col nolabel" colspan="6" style="padding-top:0">
        ${d.catatan_bendahara ? html`<div class="alert alert-bad" style="margin-bottom:8px">${UI.ic('rate_review')}<div style="flex:1"><b>Catatan Bendahara</b>${d.catatan_bendahara}
          <div class="field" style="margin-top:8px"><label for="tg-${d.id_detail}">Tanggapan / justifikasi Anda</label><input class="input" id="tg-${d.id_detail}" data-f="tanggapan" value="${d.tanggapan_waka || ''}" maxlength="600" placeholder="Jelaskan perbaikan atau alasan mempertahankan usulan"></div></div></div>` : ''}
        ${mb ? html`<div class="alert alert-warn" style="margin-bottom:8px">${UI.ic('attach_file')}<div><b>${mb} belum diunggah</b>Item ini wajib dilampiri ${mb.toLowerCase()}. <a href="${'#/rab/' + idRab + '/berkas'}">Unggah sekarang</a></div></div>` : ''}</td></tr>`;
    }

    function kegHtml(k) {
      const rows = s.detailsOf(k.id_kegiatan);
      return html`<section class="card keg" data-keg="${k.id_kegiatan}">
        <div class="keg-h"><span class="keg-no">${k.kode}</span><div class="grow"><b style="font-family:var(--f-head);font-size:16px">${k.nama}</b>${k.deskripsi ? html`<div class="small muted">${k.deskripsi}</div>` : ''}</div>
          <div class="right"><div class="lbl-up">Subtotal BOSP</div><b class="mono" data-kt>${U.rp(s.kegTotal(k.id_kegiatan))}</b></div>
          <div class="row" style="gap:4px"><button class="btn btn-icon btn-ghost" data-act="edit-keg" title="Ubah kegiatan" aria-label="Ubah kegiatan">${UI.ic('edit')}</button><button class="btn btn-icon btn-ghost" data-act="del-keg" title="Hapus kegiatan" aria-label="Hapus kegiatan">${UI.ic('delete')}</button></div></div>
        <div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Item belanja (SSH) &amp; uraian</th><th>Volume</th><th>Frek.</th><th class="num">Harga SSH</th><th class="num">Subtotal</th><th></th></tr></thead>
          <tbody data-body>${rows.map(rowHtml)}</tbody></table></div>
        <div style="padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn btn-sm btn-soft" data-act="add-item">${UI.ic('add')}Tambah item belanja</button>${rows.length ? '' : html`<span class="small muted">Belum ada rincian pada kegiatan ini.</span>`}</div></section>`;
    }

    function paguHtml() {
      const p = s.paguView(), pct = p.pagu > 0 ? Math.min(100, p.rasio) : 0;
      const ambang = App.state.sekolah.ambang;
      return html`<div class="stack" style="gap:10px">
        <div class="row between"><span class="small muted">Pagu ${s.data.rab.periode}</span><b class="mono">${U.rp(p.pagu)}</b></div>
        <div class="row between"><span class="small muted">RAB lain (aktif)</span><b class="mono">${U.rp(p.terpakai_lain)}</b></div>
        <div class="row between"><span class="small muted">RAB ini</span><b class="mono">${U.rp(p.total)}</b></div>
        ${UI.bar(pct)}
        <div class="row between"><span class="small muted">Sisa pagu</span><b class="mono" style="color:${p.sisa < 0 ? 'var(--bad-fg)' : 'var(--ok-fg)'}">${U.rp(p.sisa)}</b></div>
        ${p.pagu <= 0 ? html`<div class="alert alert-warn">${UI.ic('warning')}<div><b>Pagu belum ditetapkan</b>Admin perlu menetapkan pagu agar RAB dapat diajukan.</div></div>` : ''}
        ${p.lebih ? html`<div class="alert alert-bad">${UI.ic('error')}<div><b>Melebihi pagu periode</b>Kurangi usulan sebesar ${U.rp(-p.sisa)}.</div></div>` : (p.pagu > 0 && p.rasio >= ambang ? html`<div class="alert alert-warn">${UI.ic('warning')}<div><b>Serapan ${p.rasio}%</b>Mendekati batas pagu.</div></div>` : '')}
        ${p.tahunan_lebih ? html`<div class="alert alert-bad">${UI.ic('error')}<div><b>Melebihi pagu tahunan Waka</b></div></div>` : ''}</div>`;
    }
    function checksHtml() {
      const d = s.data, keg = d.kegiatan, det = d.detail;
      const kosong = keg.filter(function (k) { return !det.some(function (x) { return x.id_kegiatan === k.id_kegiatan; }); });
      const bukti = det.filter(function (x) { return missingBukti(x); });
      const surat = d.berkas.some(function (b) { return b.jenis === 'surat_usulan'; });
      const pern = d.rab.pernyataan || {}, pernOk = pern.bebas_double && pern.ssh && pern.dokumen;
      const rev = det.filter(function (x) { return x.status_item === 'Revisi'; }).length;
      const items = [
        [keg.length > 0 && det.length > 0, 'Minimal 1 kegiatan & 1 rincian'],
        [kosong.length === 0 && keg.length > 0, 'Setiap kegiatan berisi rincian'],
        [bukti.length === 0, 'Bukti & foto kondisi lengkap'],
        [surat, 'Surat usulan terunggah'],
        [!!pernOk, 'Pernyataan kepatuhan dicentang']
      ];
      if (d.rab.status === S.REVISI) items.push([rev === 0, 'Semua item revisi telah diperbaiki']);
      return html`<div class="chk-list">${items.map(function (i) { return html`<div class="chk ${i[0] ? '' : 'warn'}">${UI.ic(i[0] ? 'check_circle' : 'pending')}<span>${i[1]}</span></div>`; })}</div>`;
    }

    function frame() {
      const d = s.data, r = d.rab;
      const rev = d.detail.filter(function (x) { return x.status_item === 'Revisi'; }).length;
      UI.mount(html`${UI.pageHead({
        crumbs: [{ t: 'RAB', href: '#/rab' }, { t: r.nomor_rab, b: true }], title: r.nama_program,
        sub: r.periode + ' · TA ' + r.tahun_ajaran + ' · ' + r.nama_waka + ' (' + r.bidang + ')',
        actions: html`${U.badge(r.status)}<a class="btn" href="${'#/rab/' + idRab + '/info'}">${UI.ic('tune')}Data usulan</a>${d.izin.hapus ? html`<button class="btn btn-danger" data-act="del-rab">${UI.ic('delete')}Hapus RAB</button>` : ''}`
      })}
      <div class="stack-lg">
        <div class="card"><div class="stepper">
          <a class="step done" href="${'#/rab/' + idRab + '/info'}"><span class="n">✓</span><div><small>Langkah 1</small><b>Data usulan</b></div></a>
          <div class="step now"><span class="n">2</span><div><small>Langkah 2</small><b>Rincian belanja</b></div></div>
          <a class="step" href="${'#/rab/' + idRab + '/berkas'}"><span class="n">3</span><div><small>Langkah 3</small><b>Berkas pendukung</b></div></a>
          <a class="step" href="${'#/rab/' + idRab + '/ajukan'}"><span class="n">4</span><div><small>Langkah 4</small><b>Ajukan</b></div></a></div></div>
        ${r.status === S.REVISI ? html`<div class="alert alert-bad">${UI.ic('rate_review')}<div><b>RAB dikembalikan Bendahara untuk direvisi</b>Perbaiki item bertanda "Perlu revisi" dan isi tanggapan pada setiap catatan, lalu ajukan kembali. Item yang tidak berubah tetap berstatus disetujui.</div></div>` : ''}
        <div class="cols"><div style="min-width:0"><div id="kegs">${d.kegiatan.map(kegHtml)}</div>
          <div id="keg-empty" ${d.kegiatan.length ? 'hidden' : ''}>${UI.empty('playlist_add', 'Belum ada kegiatan', 'Tambahkan kegiatan, lalu isi rincian item belanjanya dari katalog standar harga.')}</div>
          <button class="btn btn-lg" data-act="add-keg" style="width:100%;border-style:dashed">${UI.ic('add_circle')}Tambah kegiatan</button></div>
        <aside><section class="card card-pad"><h3 style="margin-bottom:12px">Pagu &amp; usulan</h3><div id="pg">${paguHtml()}</div></section>
          <section class="card card-pad"><h3 style="margin-bottom:12px">Kelengkapan</h3><div id="ck">${checksHtml()}</div></section></aside></div>
      </div>
      <div class="sticky-bar"><div><div class="lbl-up">Total usulan BOSP</div><div class="tot" id="sb-tot">${U.rp(s.total())}</div></div><div class="muted small" id="sb-sisa"></div><div class="grow"></div><span class="save-ind" id="sv" aria-live="polite"></span>
        <a class="btn" href="${'#/rab/' + idRab + '/berkas'}">${UI.ic('attach_file')}Berkas pendukung</a><a class="btn btn-primary" href="${'#/rab/' + idRab + '/ajukan'}">Lanjut ajukan${UI.ic('arrow_forward')}</a></div>`);
      bind(); paintSummary(); paintState();
    }

    // ----- pembaruan parsial (tanpa membangun ulang input yang sedang diketik) -----
    function paintSummary() {
      if (!U.$('#pg')) return;
      const p = s.paguView();
      U.$('#pg').innerHTML = String(paguHtml());
      U.$('#ck').innerHTML = String(checksHtml());
      U.$('#sb-tot').textContent = U.rp(p.total);
      U.$('#sb-sisa').textContent = p.pagu > 0 ? 'Sisa pagu ' + U.rp(p.sisa) + ' · serapan ' + p.rasio + '%' : 'Pagu belum ditetapkan';
      U.$('#sb-sisa').style.color = p.sisa < 0 ? 'var(--bad-fg)' : '';
      s.data.kegiatan.forEach(function (k) { const c = U.$('[data-keg="' + k.id_kegiatan + '"] [data-kt]'); if (c) c.textContent = U.rp(s.kegTotal(k.id_kegiatan)); });
      s.data.detail.forEach(syncRow);
    }
    function syncRow(d) {
      const tr = U.$('tr[data-id="' + d.id_detail + '"]');
      if (!tr) return;
      const sub = U.$('[data-sub]', tr); if (sub) sub.textContent = U.n(d.subtotal);
      const h = U.$('[data-hrg]', tr); if (h) h.textContent = U.n(d.harga_satuan);
      const sat = U.$('[data-sat]', tr); if (sat) sat.textContent = d.satuan;
      const st = U.$('[data-st]', tr); if (st) st.innerHTML = String(statusChip(d));
      tr.classList.toggle('row-ok-mark', d.sudah_didanai_lain === 'Ya');
      const nb = U.$('[data-nb]', tr); if (nb) nb.hidden = d.sudah_didanai_lain !== 'Ya';
      if (tr.dataset.sig !== sig(d)) {
        tr.dataset.sig = sig(d);
        const old = tr.nextElementSibling && tr.nextElementSibling.dataset.note === d.id_detail ? tr.nextElementSibling : null;
        if (old) old.remove();
        const t = document.createElement('tbody'); t.innerHTML = String(noteRow(d));
        if (t.firstElementChild) tr.after(t.firstElementChild);
      }
    }
    function paintKeg(idKeg) {
      const k = s.data.kegiatan.filter(function (x) { return x.id_kegiatan === idKeg; })[0];
      const el = U.$('[data-keg="' + idKeg + '"]');
      if (!k || !el) return;
      const t = document.createElement('div'); t.innerHTML = String(kegHtml(k)); el.replaceWith(t.firstElementChild);
    }
    function paintAllKegs() {
      U.$('#kegs').innerHTML = String(s.data.kegiatan.map(kegHtml));
      U.$('#keg-empty').hidden = s.data.kegiatan.length > 0;
    }
    function paintState() {
      const el = U.$('#sv'); if (!el) return;
      const m = { idle: ['check_circle', 'Tersimpan', ''], saving: ['sync', 'Menyimpan…', 'saving'], err: ['error', 'Gagal menyimpan', 'err'] }[s.state] || ['check_circle', 'Tersimpan', ''];
      el.className = 'save-ind ' + (m[2] || (s.state === 'idle' ? 'ok' : ''));
      el.innerHTML = String(html`${UI.ic(m[0], 'ic-sm')}${m[1]}`);
    }

    // ----- interaksi -----
    function readRow(tr) {
      const id = tr.dataset.id, d = s.findDetail(id);
      const vol = U.parseNum(U.$('[data-f=volume]', tr).value), frek = U.parseNum(U.$('[data-f=frekuensi]', tr).value);
      const tg = U.$('[data-f=tanggapan]', tr.nextElementSibling && tr.nextElementSibling.dataset.note === id ? tr.nextElementSibling : tr);
      return { id_detail: id, id_kegiatan: d.id_kegiatan, id_item: d.id_item, uraian: U.$('[data-f=uraian]', tr).value, volume: vol, frekuensi: frek,
        sudah_didanai_lain: U.$('[data-f=didanai]', tr).checked, kebutuhan_riil: U.$('[data-f=riil]', tr).checked, tanggapan_waka: tg ? tg.value : (d.tanggapan_waka || '') };
    }
    function commitRow(tr) {
      const inp = readRow(tr);
      const bad = !(inp.volume > 0) || !(inp.frekuensi > 0);
      U.$('[data-f=volume]', tr).classList.toggle('err', !(inp.volume > 0));
      U.$('[data-f=frekuensi]', tr).classList.toggle('err', !(inp.frekuensi > 0));
      if (bad) return;
      const r = s.saveDetail(inp);
      if (!r.ok) UI.toast(r.msg, 'err');
    }
    function addItem(idKeg, tbody) {
      if (U.$('tr[data-draft]', tbody)) { U.$('tr[data-draft] input', tbody).focus(); return; }
      const bidang = s.data.rab.bidang;
      const tr = document.createElement('tr'); tr.dataset.draft = '1';
      tr.innerHTML = String(html`<td data-l="Item" class="col nolabel" colspan="5"><div class="combo"><input class="input cell-in" placeholder="Ketik untuk mencari item standar harga (nama / kode)…" autocomplete="off" aria-label="Cari item"></div></td><td class="nolabel"><button class="btn btn-icon btn-ghost" data-act="cancel-draft" aria-label="Batal">${UI.ic('close')}</button></td>`);
      tbody.appendChild(tr);
      const inp = U.$('input', tr);
      attachCombo(inp, function () { return itemsFor(bidang); }, function (it) {
        const r = s.saveDetail({ id_kegiatan: idKeg, id_item: it.id_item, uraian: '', volume: 1, frekuensi: 1, sudah_didanai_lain: false, kebutuhan_riil: false, tanggapan_waka: '' });
        if (!r.ok) { UI.toast(r.msg, 'err'); return; }
        paintKeg(idKeg);
        const v = U.$('tr[data-id="' + r.detail.id_detail + '"] [data-f=volume]'); if (v) { v.focus(); v.select(); }
      });
      inp.focus();
    }
    function kegDialog(k) {
      UI.modal({
        title: k ? 'Ubah kegiatan' : 'Tambah kegiatan',
        body: html`<div class="stack" style="padding-top:6px"><div class="field"><label for="kg-n">Nama kegiatan</label><input class="input" id="kg-n" maxlength="150" value="${k ? k.nama : ''}" placeholder="mis. Pengadaan alat peraga"></div>
          <div class="field"><label for="kg-d">Deskripsi (opsional)</label><textarea class="input" id="kg-d" rows="3" maxlength="400">${k ? k.deskripsi : ''}</textarea></div><div class="err-txt" id="kg-e" hidden></div></div>`,
        foot: [{ label: 'Batal', value: null }, {
          label: 'Simpan', cls: 'btn-primary', click: function (close) {
            const n = U.$('#kg-n').value, d = U.$('#kg-d').value;
            const r = k ? s.updateKegiatan(k.id_kegiatan, n, d) : s.addKegiatan(n, d);
            if (!r.ok) { const e = U.$('#kg-e'); e.hidden = false; e.textContent = r.msg; return; }
            close(true);
            if (k) paintKeg(k.id_kegiatan); else { paintAllKegs(); const last = s.data.kegiatan[s.data.kegiatan.length - 1]; const el = U.$('[data-keg="' + last.id_kegiatan + '"]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); addItem(last.id_kegiatan, U.$('[data-body]', el)); } }
            paintSummary();
          }
        }]
      });
    }

    function bind() {
      const root = U.$('#view');
      UI.on(root, 'click', '[data-act]', function (e, el) {
        const act = el.dataset.act, keg = el.closest('[data-keg]'), idKeg = keg ? keg.dataset.keg : '';
        if (act === 'add-keg') kegDialog(null);
        else if (act === 'edit-keg') kegDialog(s.data.kegiatan.filter(function (k) { return k.id_kegiatan === idKeg; })[0]);
        else if (act === 'add-item') addItem(idKeg, U.$('[data-body]', keg));
        else if (act === 'cancel-draft') el.closest('tr').remove();
        else if (act === 'del-item') {
          const tr = el.closest('tr'), d = s.findDetail(tr.dataset.id);
          const doDel = function () { const n = tr.nextElementSibling; if (n && n.dataset.note) n.remove(); tr.remove(); s.deleteDetail(d.id_detail); paintKeg(idKeg); paintSummary(); };
          if (d.subtotal > 0) UI.confirm({ title: 'Hapus item?', text: d.nama_item + ' (' + U.rp(d.subtotal) + ') akan dihapus dari kegiatan ini.', ok: 'Hapus', cls: 'btn-danger-solid' }).then(function (ok) { if (ok) doDel(); }); else doDel();
        } else if (act === 'del-keg') {
          const k = s.data.kegiatan.filter(function (x) { return x.id_kegiatan === idKeg; })[0], n = s.detailsOf(idKeg).length;
          UI.confirm({ title: 'Hapus kegiatan?', text: 'Kegiatan "' + k.nama + '"' + (n ? ' beserta ' + n + ' rincian di dalamnya' : '') + ' akan dihapus. Berkas yang dikaitkan tetap tersimpan tanpa kaitan item.', ok: 'Hapus kegiatan', cls: 'btn-danger-solid' }).then(function (ok) { if (ok) { s.deleteKegiatan(idKeg); paintAllKegs(); paintSummary(); } });
        } else if (act === 'del-rab') {
          UI.confirm({ title: 'Hapus RAB ini?', text: 'Seluruh kegiatan, rincian, dan berkas pada ' + s.data.rab.nomor_rab + ' akan dihapus permanen.', ok: 'Hapus RAB', cls: 'btn-danger-solid' }).then(function (ok) {
            if (!ok) return;
            s.flush().then(function () { return Api.call('rab.delete', { id_rab: idRab }); }).then(function () { Engine.drop(idRab); Api.dropCache(); UI.toast('RAB dihapus.'); location.hash = '#/rab'; }).catch(function (er) { UI.error(er); });
          });
        }
      });
      // item combobox pada baris tersimpan (didelegasikan lewat fokus)
      root.addEventListener('focusin', function (e) {
        const inp = e.target;
        if (!(inp.matches && inp.matches('input[data-f=item]')) || inp.dataset.cb) return;
        inp.dataset.cb = '1';
        const tr = inp.closest('tr'), id = tr.dataset.id;
        attachCombo(inp, function () { return itemsFor(s.data.rab.bidang); }, function (it) {
          const cur = s.findDetail(id), v = readRow(tr);
          const r = s.saveDetail(Object.assign(v, { id_item: it.id_item, id_kegiatan: cur.id_kegiatan }));
          if (!r.ok) { UI.toast(r.msg, 'err'); return; }
          const d = s.findDetail(id); inp.value = d.kode_item + ' · ' + d.nama_item; inp.blur(); syncRow(d);
        }, function () { const d = s.findDetail(id); if (d) inp.value = d.kode_item + ' · ' + d.nama_item; });
        inp.dispatchEvent(new Event('focus'));
      });
      const deb = {};
      root.addEventListener('input', function (e) {
        const el = e.target, f = el.dataset && el.dataset.f;
        if (f !== 'volume' && f !== 'frekuensi') return;
        const tr = el.closest('tr[data-id]'); if (!tr) return;
        clearTimeout(deb[tr.dataset.id]); deb[tr.dataset.id] = setTimeout(function () { commitRow(tr); }, 380);
      });
      root.addEventListener('change', function (e) {
        const el = e.target, f = el.dataset && el.dataset.f;
        if (!f || f === 'item') return;
        const tr = el.closest('tr[data-id]') || (el.closest('tr[data-note]') ? U.$('tr[data-id="' + el.closest('tr[data-note]').dataset.note + '"]') : null);
        if (!tr) return;
        if (f === 'volume' || f === 'frekuensi') { const n = U.parseNum(el.value); if (n > 0) el.value = U.dec(n); }
        clearTimeout(deb[tr.dataset.id]); commitRow(tr);
      });
    }

    function onEvent(evt, payload) {
      if (!ctx.alive()) return;
      if (evt === 'change') paintSummary();
      else if (evt === 'state') paintState();
      else if (evt === 'error') UI.error(payload, 'Perubahan ditolak server.');
      else if (evt === 'resync') { frame(); UI.toast('Data dipulihkan dari server.', 'info'); }
    }

    // ----- mulai -----
    function enter() {
      const d = s.data;
      if (!d.izin.edit) { UI.toast('RAB ini tidak dapat diubah pada status ' + d.rab.status + '.', 'info'); location.hash = '#/detail/' + idRab; return false; }
      return true;
    }
    if (s.data) { if (enter()) { frame(); } }
    else UI.mount(UI.skeleton(5));
    unsub = s.subscribe(onEvent);
    const p = s.load().then(function () {
      if (!ctx.alive()) return;
      if (!enter()) return;
      const busy = document.activeElement && document.activeElement.closest && document.activeElement.closest('#kegs');
      if (first || !busy) frame();
      first = false;
    });
    p.catch(function (e) { if (ctx.alive() && !s.data) UI.mount(UI.errorBox(e, function () { Router.render(); })); });
    return p.then(function () { return function () { if (unsub) unsub(); }; }, function () { return function () { if (unsub) unsub(); }; });
  }

  Router.add('/rab/:id', { title: 'Editor RAB', nav: 'rab', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return render(p.id, ctx); } });
  // Alias halaman revisi: editor yang sama
  Router.add('/revisi/:id', { title: 'Revisi RAB', nav: 'revisi', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return render(p.id, ctx); } });
})();
