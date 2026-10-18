/* pages/rab-flow.js — ajukan (Waka), pemeriksaan (Bendahara), validasi/rincian baca-saja (Kepsek & lainnya) */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE, S = U.ST;

  function flagsOf(d) {
    return html`${d.sudah_didanai_lain === 'Ya' ? html`<span class="badge b-rev" style="height:20px">Didanai sumber lain</span> ` : ''}${d.kebutuhan_riil === 'Ya' ? html`<span class="badge b-sub" style="height:20px">Kebutuhan riil</span>` : ''}`;
  }
  function after(msgToast) { Api.dropCache(); App.reloadBadges(); if (msgToast) UI.toast(msgToast); }

  // ======================= AJUKAN =======================
  function renderAjukan(idRab, ctx) {
    const s = Engine.get(idRab), user = App.state.user;
    UI.mount(UI.skeleton(4));
    return s.flush().then(function () { return s.load(true); }).then(function () {
      return Api.call('rab.validasi', { id_rab: idRab });
    }).then(function (v) {
      if (!ctx.alive()) return;
      const d = s.data, r = d.rab;
      if (!d.izin.edit && !d.izin.submit) { location.hash = '#/detail/' + idRab; return; }
      const p = s.paguView();
      const errs = v.checks.filter(function (c) { return c.level === 'error'; }).length, warns = v.checks.filter(function (c) { return c.level === 'warn'; }).length;
      UI.mount(html`${UI.pageHead({ crumbs: [{ t: 'RAB', href: '#/rab' }, { t: r.nomor_rab, href: '#/rab/' + idRab }, { t: 'Ajukan', b: true }], title: 'Periksa & ajukan RAB', sub: r.nama_program, actions: U.badge(r.status) })}
      <div class="stack-lg"><div class="card"><div class="stepper">
        <a class="step done" href="${'#/rab/' + idRab + '/info'}"><span class="n">✓</span><div><small>Langkah 1</small><b>Data usulan</b></div></a>
        <a class="step done" href="${'#/rab/' + idRab}"><span class="n">✓</span><div><small>Langkah 2</small><b>Rincian belanja</b></div></a>
        <a class="step done" href="${'#/rab/' + idRab + '/berkas'}"><span class="n">✓</span><div><small>Langkah 3</small><b>Berkas pendukung</b></div></a>
        <div class="step now"><span class="n">4</span><div><small>Langkah 4</small><b>Ajukan</b></div></div></div></div>
      <div class="cols"><div class="stack-lg" style="min-width:0">
        <section class="card"><div class="card-head"><h3>Pemeriksaan otomatis</h3><span class="chip" style="${errs ? 'background:var(--bad-bg);color:var(--bad-fg)' : 'background:var(--ok-bg);color:var(--ok-fg)'}">${errs ? errs + ' perlu diperbaiki' : 'Siap diajukan'}</span></div><div class="card-pad">
          <div class="chk-list">${v.checks.map(function (c) { return html`<div class="chk ${c.ok ? '' : (c.level === 'warn' ? 'warn' : 'bad')}">${UI.ic(c.ok ? 'check_circle' : (c.level === 'warn' ? 'warning' : 'error'))}<div><b>${c.label}</b>${c.ok ? '' : html`<span class="small">${c.pesan}</span>`}</div></div>`; })}</div>
          ${warns && !errs ? html`<div class="alert alert-warn" style="margin-top:14px">${UI.ic('warning')}<div><b>Ada peringatan</b>Usulan tetap dapat diajukan, namun perhatikan peringatan di atas.</div></div>` : ''}</div></section>
        <section class="card"><div class="card-head"><h3>Ringkasan usulan</h3></div><div class="card-pad stack">
          <div class="facts"><div><small>Total usulan BOSP</small><b>${U.rp(p.total)}</b></div><div><small>Pagu ${r.periode}</small><b>${U.rp(p.pagu)}</b></div><div><small>Sisa pagu</small><b style="color:${p.sisa < 0 ? 'var(--bad-fg)' : 'inherit'}">${U.rp(p.sisa)}</b></div><div><small>Kegiatan / rincian</small><b>${d.kegiatan.length} / ${d.detail.length}</b></div></div>
          <p class="muted small"><i>Terbilang:</i> ${U.terbilang(p.total)}</p></div></section></div>
      <aside><section class="card card-pad stack"><h3>${r.status === S.REVISI ? 'Kirim ulang ke Bendahara' : 'Kirim ke Bendahara'}</h3>
        ${d.izin.submit ? html`<div class="field"><label for="aj-c">Catatan untuk Bendahara (opsional)</label><textarea class="input" id="aj-c" rows="3" maxlength="500"></textarea></div>
          <button class="btn btn-primary btn-lg btn-block" id="aj-go" ${errs ? 'disabled' : ''}>${UI.ic('send')}<span>${r.status === S.REVISI ? 'Kirim ulang' : 'Ajukan RAB'}</span></button>
          ${errs ? html`<p class="small" style="color:var(--bad-fg)">Perbaiki ${errs} butir di sebelah kiri terlebih dahulu.</p>` : ''}`
          : html`<div class="alert alert-info">${UI.ic('info')}<div><b>Hanya Waka pemilik RAB yang dapat mengirim</b>Staf menyiapkan usulan; pengajuan dilakukan oleh Waka bersangkutan.</div></div>`}
        <a class="btn btn-block" href="${'#/rab/' + idRab}">${UI.ic('arrow_back')}Kembali ke rincian</a></section></aside></div></div>`);
      const go = U.$('#aj-go');
      if (go) go.onclick = function () {
        UI.confirm({ title: 'Ajukan RAB ke Bendahara?', text: 'Setelah diajukan, RAB dikunci dan tidak dapat diubah sampai Bendahara memberi keputusan. Total usulan ' + U.rp(p.total) + '.', ok: 'Ya, ajukan', cls: 'btn-primary' }).then(function (ok) {
          if (!ok) return;
          UI.busy(go, Api.call('rab.submit', { id_rab: idRab, catatan: U.$('#aj-c').value }), 'Mengirim…').then(function () {
            Engine.drop(idRab); after('RAB berhasil diajukan ke Bendahara. Notifikasi telah dikirim.'); location.hash = '#/detail/' + idRab;
          }).catch(function (e) { UI.error(e); if (e.extra && e.extra.errors) Router.render(); });
        });
      };
    });
  }

  // ======================= TAMPILAN BACA-SAJA (Kepsek / detail) =======================
  function readTable(d, k) {
    const rows = d.detail.filter(function (x) { return x.id_kegiatan === k.id_kegiatan; });
    const sub = rows.reduce(function (a, x) { return a + Number(x.nilai_bosp); }, 0);
    return html`<section class="card keg"><div class="keg-h"><span class="keg-no">${k.kode}</span><div class="grow"><b style="font-family:var(--f-head);font-size:16px">${k.nama}</b>${k.deskripsi ? html`<div class="small muted">${k.deskripsi}</div>` : ''}</div><div class="right"><div class="lbl-up">Subtotal BOSP</div><b class="mono">${U.rp(sub)}</b></div></div>
      <div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Item</th><th>Uraian</th><th class="num">Vol × Frek</th><th class="num">Harga SSH</th><th class="num">Subtotal</th><th class="num">Nilai BOSP</th><th>Status</th></tr></thead><tbody>${rows.map(function (x) {
        return html`<tr class="${x.sudah_didanai_lain === 'Ya' ? 'row-warn' : ''}"><td data-l="Item"><b>${x.nama_item}</b><div class="small muted mono">${x.kode_item}</div><div>${flagsOf(x)}</div></td><td data-l="Uraian" class="small">${x.uraian || '-'}</td><td class="num" data-l="Vol × Frek">${U.dec(x.volume)} × ${U.dec(x.frekuensi)} ${x.satuan}</td>
          <td class="num" data-l="Harga">${U.n(x.harga_satuan)}</td><td class="num" data-l="Subtotal"><span class="${x.sudah_didanai_lain === 'Ya' ? 'strike' : ''}">${U.n(x.subtotal)}</span></td><td class="num" data-l="BOSP"><b>${U.n(x.nilai_bosp)}</b></td>
          <td data-l="Status">${x.status_item === 'Setuju' ? html`<span class="badge b-ok">Setuju</span>` : x.status_item === 'Revisi' ? html`<span class="badge b-rev">Revisi</span>` : html`<span class="badge b-draft">Menunggu</span>`}${x.catatan_bendahara ? html`<div class="small" style="margin-top:4px;color:var(--bad-fg)">${x.catatan_bendahara}</div>` : ''}${x.tanggapan_waka ? html`<div class="small muted" style="margin-top:4px">Tanggapan: ${x.tanggapan_waka}</div>` : ''}</td></tr>`;
      })}</tbody></table></div></section>`;
  }

  function renderRead(idRab, ctx) {
    const user = App.state.user;
    UI.mount(UI.skeleton(5));
    return Api.call('rab.get', { id_rab: idRab }).then(function (d) {
      if (!ctx.alive()) return;
      const r = d.rab, p = d.pagu, I = d.izin;
      const fileBtn = function (b) { return html`<button class="btn btn-sm" data-view="${b.id_berkas}">${UI.ic(BerkasUI.icon(b.mime), 'ic-sm')}${b.nama_file}</button>`; };
      UI.mount(html`${UI.pageHead({
        crumbs: [{ t: 'RAB', href: '#/rab' }, { t: r.nomor_rab, b: true }], title: r.nama_program, sub: r.periode + ' · TA ' + r.tahun_ajaran + ' · ' + r.nama_waka + ' (' + r.bidang + ')',
        actions: html`${U.badge(r.status)}${I.edit ? html`<a class="btn btn-primary" href="${'#/rab/' + idRab}">${UI.ic('edit')}Buka editor</a>` : ''}${I.review ? html`<a class="btn btn-primary" href="${'#/review/' + idRab}">${UI.ic('fact_check')}Periksa RAB</a>` : ''}${r.status === S.SETUJU ? html`<a class="btn btn-primary" href="${'#/cetak?id=' + idRab}">${UI.ic('print')}Cetak RAB</a>` : ''}`
      })}
      <div class="stack-lg">${UI.stepper(r.status)}
        <div class="cols"><div class="stack-lg" style="min-width:0">
          <section class="card"><div class="card-head"><h3>Data usulan</h3></div><div class="card-pad stack">
            <div class="facts"><div><small>Nomor RAB</small><b>${r.nomor_rab}</b></div><div><small>Standar (SNP)</small><b style="font-family:var(--f-body)">${r.snp}</b></div><div><small>Prioritas</small><b>${r.prioritas}</b></div><div><small>Dibuat</small><b>${U.tgl(r.tgl_dibuat)}</b></div></div>
            <div><div class="lbl-up" style="margin-bottom:4px">Latar belakang &amp; urgensi</div><p>${r.latar_belakang}</p></div></div></section>
          ${d.kegiatan.length ? d.kegiatan.map(function (k) { return readTable(d, k); }) : UI.empty('playlist_add', 'Belum ada rincian', '')}
          <section class="card"><div class="card-head"><h3>Berkas pendukung</h3></div><div class="card-pad">${d.berkas.length ? html`<div class="row row-wrap" style="gap:8px">${d.berkas.map(fileBtn)}</div>` : html`<p class="muted small">Belum ada berkas.</p>`}</div></section></div>
        <aside><section class="card card-pad stack"><h3>Ringkasan anggaran</h3>
          <div class="row between"><span class="small muted">Total usulan BOSP</span><b class="mono" style="font-size:18px;color:var(--primary)">${U.rp(r.total)}</b></div>
          <p class="small muted"><i>Terbilang:</i> ${U.terbilang(r.total)}</p><hr class="divider">
          <div class="row between"><span class="small muted">Pagu ${r.periode}</span><b class="mono">${U.rp(p.pagu)}</b></div><div class="row between"><span class="small muted">RAB lain (aktif)</span><b class="mono">${U.rp(p.terpakai_lain)}</b></div>
          ${UI.bar(p.rasio)}<div class="row between"><span class="small muted">Sisa pagu</span><b class="mono" style="color:${p.sisa < 0 ? 'var(--bad-fg)' : 'var(--ok-fg)'}">${U.rp(p.sisa)}</b></div>
          ${r.checksum ? html`<hr class="divider"><div class="small muted">Checksum<div class="mono" style="word-break:break-all;font-size:11px">${r.checksum}</div></div>` : ''}</section>
          ${I.putuskan ? html`<section class="card card-pad stack" style="border-color:var(--primary-600)"><h3>Keputusan Kepala Sekolah</h3>
            <div class="alert alert-info">${UI.ic('verified')}<div><b>Telah diperiksa Bendahara</b>Seluruh rincian berstatus setuju sesuai juknis.</div></div>
            <div class="field"><label for="kp-c">Catatan (opsional)</label><textarea class="input" id="kp-c" rows="2" maxlength="500"></textarea></div>
            <button class="btn btn-ok btn-lg btn-block" id="kp-ok">${UI.ic('task_alt')}Setujui RAB</button><button class="btn btn-danger btn-block" id="kp-no">${UI.ic('cancel')}Batalkan RAB</button></section>` : ''}
          <section class="card card-pad"><h3 style="margin-bottom:14px">Riwayat persetujuan</h3>${UI.timeline(d.riwayat, 'Belum ada riwayat.')}</section></aside></div></div>`);
      const root = U.$('#view');
      UI.on(root, 'click', '[data-view]', function (e, el) { BerkasUI.open(d.berkas.filter(function (b) { return b.id_berkas === el.dataset.view; })[0]); });
      const ok = U.$('#kp-ok'), no = U.$('#kp-no');
      if (ok) ok.onclick = function () {
        UI.confirm({ title: 'Setujui RAB ini?', text: 'Total ' + U.rp(r.total) + ' (' + U.terbilang(r.total) + '). Setelah disetujui, RAB dikunci, PDF diarsipkan, dan notifikasi dikirim.', ok: 'Ya, setujui', cls: 'btn-ok' }).then(function (y) {
          if (!y) return;
          UI.busy(ok, Api.call('kepsek.approve', { id_rab: idRab, catatan: U.$('#kp-c').value }, { timeout: 120000 }), 'Menyetujui…').then(function (res) {
            after(res.pdf_ok ? 'RAB disetujui dan PDF diarsipkan.' : 'RAB disetujui (PDF belum terarsip, cetak ulang dari menu Cetak).'); location.hash = '#/persetujuan';
          }).catch(function (e) { UI.error(e); });
        });
      };
      if (no) no.onclick = function () {
        UI.prompt({ title: 'Batalkan RAB', text: 'RAB akan berstatus Dibatalkan dan tidak dapat diproses lagi.', label: 'Alasan pembatalan', min: 5, ok: 'Batalkan RAB', cls: 'btn-danger-solid' }).then(function (a) {
          if (a === null) return;
          UI.busy(no, Api.call('kepsek.cancel', { id_rab: idRab, alasan: a }), 'Membatalkan…').then(function () { after('RAB dibatalkan.'); location.hash = '#/persetujuan'; }).catch(function (e) { UI.error(e); });
        });
      };
    });
  }

  // ======================= PEMERIKSAAN BENDAHARA =======================
  function renderReview(idRab, ctx) {
    UI.mount(UI.skeleton(5));
    let chain = Promise.resolve(), pend = 0, D = null;
    function enqueue(fn) {
      pend++; paintFoot();
      chain = chain.then(fn).then(function (r) { pend--; if (r && r.status) D.rab.status = r.status; paintFoot(); }, function (e) { pend--; UI.error(e); load(true); });
    }
    function counts() { const c = { Setuju: 0, Revisi: 0, Menunggu: 0 }; D.detail.forEach(function (d) { c[d.status_item] = (c[d.status_item] || 0) + 1; }); return c; }
    function revisiLengkap() { return D.detail.every(function (d) { return d.status_item !== 'Revisi' || (d.catatan_bendahara || '').trim().length >= 5; }); }

    function itemHtml(d) {
      const cat = App.state.items.filter(function (i) { return i.id_item === d.id_item; })[0];
      const selisih = cat && Number(cat.harga) !== Number(d.harga_satuan);
      const bk = D.berkas.filter(function (b) { return b.id_detail === d.id_detail; });
      return html`<div class="review-item ${d.status_item === 'Revisi' ? 'rev' : d.status_item === 'Setuju' ? 'ok' : ''}" data-id="${d.id_detail}">
        <div class="row row-wrap between" style="align-items:flex-start;gap:14px"><div style="min-width:0;flex:1 1 320px"><b>${d.nama_item}</b> <span class="chip-code chip">${d.kode_item}</span><div class="small muted" style="margin:2px 0 6px">${d.uraian || 'Tanpa uraian'}</div>
          <div class="mono small">${U.dec(d.volume)} × ${U.dec(d.frekuensi)} ${d.satuan} × ${U.n(d.harga_satuan)} = <b>${U.rp(d.subtotal)}</b> ${d.sudah_didanai_lain === 'Ya' ? '(BOSP Rp 0)' : ''}</div><div style="margin-top:6px">${flagsOf(d)}</div></div>
          <div class="seg-toggle" role="group" aria-label="Keputusan"><button data-dec="Setuju" class="${d.status_item === 'Setuju' ? 'on-ok' : ''}">${UI.ic('check', 'ic-sm')}Setuju</button><button data-dec="Revisi" class="${d.status_item === 'Revisi' ? 'on-bad' : ''}">${UI.ic('edit_note', 'ic-sm')}Revisi</button></div></div>
        ${selisih ? html`<div class="alert alert-warn" style="margin-top:10px">${UI.ic('price_change')}<div><b>Harga berbeda dari SSH saat ini</b>Tersimpan ${U.rp(d.harga_satuan)}, katalog kini ${U.rp(cat.harga)}.</div></div>` : ''}
        ${d.tanggapan_waka ? html`<div class="alert alert-info" style="margin-top:10px">${UI.ic('forum')}<div><b>Tanggapan Waka</b>${d.tanggapan_waka}</div></div>` : ''}
        ${bk.length ? html`<div class="row row-wrap" style="gap:6px;margin-top:10px">${bk.map(function (b) { return html`<button class="btn btn-sm" data-view="${b.id_berkas}">${UI.ic(BerkasUI.icon(b.mime), 'ic-sm')}${BerkasUI.JENIS[b.jenis]}: ${b.nama_file}</button>`; })}</div>` : ''}
        ${d.status_item === 'Revisi' ? html`<div class="field" style="margin-top:10px"><label for="al-${d.id_detail}">Alasan revisi (wajib, dikirim ke Waka)</label><textarea class="input" id="al-${d.id_detail}" data-alasan rows="2" maxlength="600" placeholder="Jelaskan apa yang harus diperbaiki sesuai juknis">${d.catatan_bendahara || ''}</textarea></div>` : ''}</div>`;
    }
    function paintFoot() {
      const c = counts(), el = U.$('#rv-foot'); if (!el) return;
      const r = D.rab;
      U.$('#rv-c').textContent = c.Setuju + ' setuju · ' + c.Revisi + ' revisi · ' + c.Menunggu + ' menunggu';
      U.$('#rv-ret').disabled = !(c.Revisi > 0 && revisiLengkap());
      U.$('#rv-fwd').disabled = !(c.Menunggu === 0 && c.Revisi === 0 && D.detail.length > 0);
      U.$('#rv-sv').textContent = pend ? 'Menyimpan…' : 'Tersimpan';
      U.$('#rv-st').innerHTML = String(U.badge(r.status));
      const bar = U.$('#rv-bar'); if (bar) bar.style.width = (D.detail.length ? ((c.Setuju + c.Revisi) / D.detail.length) * 100 : 0) + '%';
    }
    function decide(id, k, alasan) {
      const d = D.detail.filter(function (x) { return x.id_detail === id; })[0];
      d.status_item = k;
      if (k === 'Revisi') d.catatan_bendahara = alasan === undefined ? (d.catatan_bendahara || '') : alasan;
      const card = U.$('.review-item[data-id="' + id + '"]'); const t = document.createElement('div'); t.innerHTML = String(itemHtml(d)); card.replaceWith(t.firstElementChild);
      if (k === 'Revisi' && (d.catatan_bendahara || '').length < 5) { const ta = U.$('#al-' + id); if (ta) ta.focus(); paintFoot(); return; }
      paintFoot();
      enqueue(function () { return Api.call('review.setItem', { id_rab: idRab, id_detail: id, keputusan: k, alasan: k === 'Revisi' ? d.catatan_bendahara : '' }); });
    }

    function load(force) {
      return Api.call('rab.get', { id_rab: idRab }).then(function (d) {
        if (!ctx.alive()) return;
        D = d;
        if (!d.izin.review) { UI.toast('RAB tidak sedang menunggu pemeriksaan (status: ' + d.rab.status + ').', 'info'); location.hash = '#/detail/' + idRab; return; }
        frame();
      });
    }
    function frame() {
      const r = D.rab, p = D.pagu;
      UI.mount(html`${UI.pageHead({ crumbs: [{ t: 'Antrean', href: '#/persetujuan' }, { t: r.nomor_rab, b: true }], title: 'Pemeriksaan: ' + r.nama_program, sub: r.nama_waka + ' · ' + r.bidang + ' · ' + r.periode + ' TA ' + r.tahun_ajaran, actions: html`<span id="rv-st">${U.badge(r.status)}</span>` })}
      <div class="stack-lg"><div class="cols"><div class="stack-lg" style="min-width:0">
        ${r.siklus_revisi > 0 ? html`<div class="alert alert-info">${UI.ic('history')}<div><b>Siklus revisi ke-${r.siklus_revisi}</b>Waka telah memperbaiki usulan. Item yang berubah kembali berstatus "Menunggu"; item lain tetap disetujui.</div></div>` : ''}
        <div class="card card-pad stack"><div class="row between row-wrap"><h3>Kemajuan pemeriksaan</h3><button class="btn btn-sm" id="rv-all">${UI.ic('done_all', 'ic-sm')}Setujui semua yang menunggu</button></div><div class="bar ok"><i id="rv-bar" style="width:0"></i></div>
          <div class="facts"><div><small>Total usulan</small><b>${U.rp(r.total)}</b></div><div><small>Pagu ${r.periode}</small><b>${U.rp(p.pagu)}</b></div><div><small>Sisa pagu</small><b style="color:${p.sisa < 0 ? 'var(--bad-fg)' : 'inherit'}">${U.rp(p.sisa)}</b></div><div><small>Berkas</small><b>${D.berkas.length}</b></div></div>
          <p class="small muted">Latar belakang: ${r.latar_belakang}</p>${p.sisa < 0 ? html`<div class="alert alert-bad">${UI.ic('error')}<div><b>Melebihi pagu</b>RAB tidak dapat diteruskan ke Kepala Sekolah.</div></div>` : ''}</div>
        ${D.kegiatan.map(function (k) { return html`<section class="card keg"><div class="keg-h"><span class="keg-no">${k.kode}</span><div class="grow"><b style="font-family:var(--f-head);font-size:16px">${k.nama}</b>${k.deskripsi ? html`<div class="small muted">${k.deskripsi}</div>` : ''}</div></div>${D.detail.filter(function (d) { return d.id_kegiatan === k.id_kegiatan; }).map(itemHtml)}</section>`; })}</div>
        <aside><section class="card card-pad"><h3 style="margin-bottom:14px">Riwayat</h3>${UI.timeline(D.riwayat, 'Belum ada riwayat.')}</section></aside></div></div>
      <div class="sticky-bar" id="rv-foot"><div><div class="lbl-up">Status pemeriksaan</div><b id="rv-c" class="mono"></b></div><span class="save-ind" id="rv-sv"></span><div class="grow"></div>
        <button class="btn btn-danger" id="rv-ret">${UI.ic('undo')}Kembalikan ke Waka</button><button class="btn btn-ok" id="rv-fwd">${UI.ic('forward_to_inbox')}Teruskan ke Kepala Sekolah</button></div>`);
      const root = U.$('#view');
      UI.on(root, 'click', '[data-dec]', function (e, el) { const id = el.closest('.review-item').dataset.id; const d = D.detail.filter(function (x) { return x.id_detail === id; })[0]; if (d.status_item !== el.dataset.dec) decide(id, el.dataset.dec); });
      UI.on(root, 'click', '[data-view]', function (e, el) { BerkasUI.open(D.berkas.filter(function (b) { return b.id_berkas === el.dataset.view; })[0]); });
      root.addEventListener('change', function (e) {
        const ta = e.target; if (!ta.matches || !ta.matches('[data-alasan]')) return;
        const id = ta.closest('.review-item').dataset.id, v = ta.value.trim();
        const d = D.detail.filter(function (x) { return x.id_detail === id; })[0]; d.catatan_bendahara = v;
        if (v.length < 5) { ta.classList.add('err'); paintFoot(); UI.toast('Alasan revisi minimal 5 karakter.', 'err'); return; }
        ta.classList.remove('err'); paintFoot();
        enqueue(function () { return Api.call('review.setItem', { id_rab: idRab, id_detail: id, keputusan: 'Revisi', alasan: v }); });
      });
      U.$('#rv-all').onclick = function () {
        const items = D.detail.filter(function (d) { return d.status_item === 'Menunggu'; });
        if (!items.length) { UI.toast('Tidak ada item yang menunggu.', 'info'); return; }
        items.forEach(function (d) { d.status_item = 'Setuju'; const card = U.$('.review-item[data-id="' + d.id_detail + '"]'); const t = document.createElement('div'); t.innerHTML = String(itemHtml(d)); card.replaceWith(t.firstElementChild); });
        paintFoot();
        enqueue(function () { return Api.call('review.setItem', { id_rab: idRab, items: items.map(function (d) { return { id_detail: d.id_detail, keputusan: 'Setuju' }; }) }); });
      };
      U.$('#rv-ret').onclick = function () {
        chain.then(function () {
          return UI.prompt({ title: 'Kembalikan ke Waka', text: 'Waka menerima notifikasi beserta alasan per item yang Anda tandai "Revisi".', label: 'Catatan umum untuk Waka (opsional)', ok: 'Kembalikan', cls: 'btn-danger-solid' });
        }).then(function (c) {
          if (c === null) return;
          UI.busy(U.$('#rv-ret'), Api.call('review.return', { id_rab: idRab, catatan: c }), 'Mengirim…').then(function () { after('RAB dikembalikan ke Waka untuk direvisi.'); location.hash = '#/persetujuan'; }).catch(function (e) { UI.error(e); });
        });
      };
      U.$('#rv-fwd').onclick = function () {
        chain.then(function () { return UI.confirm({ title: 'Teruskan ke Kepala Sekolah?', text: 'Seluruh rincian telah Anda setujui sesuai juknis. RAB akan dikirim untuk validasi akhir Kepala Sekolah.', ok: 'Ya, teruskan', cls: 'btn-ok' }); }).then(function (ok) {
          if (!ok) return;
          UI.busy(U.$('#rv-fwd'), Api.call('review.forward', { id_rab: idRab }), 'Meneruskan…').then(function () { after('RAB diteruskan ke Kepala Sekolah.'); location.hash = '#/persetujuan'; }).catch(function (e) { UI.error(e); });
        });
      };
      paintFoot();
    }
    return load();
  }

  Router.add('/rab/:id/ajukan', { title: 'Ajukan RAB', nav: 'rab', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return renderAjukan(p.id, ctx); } });
  Router.add('/review/:id', { title: 'Pemeriksaan RAB', nav: 'antrean', roles: [R.BEND], render: function (p, ctx) { return renderReview(p.id, ctx); } });
  Router.add('/validasi/:id', { title: 'Validasi RAB', nav: 'antrean', roles: [R.KEPSEK], render: function (p, ctx) { return renderRead(p.id, ctx); } });
  Router.add('/detail/:id', { title: 'Detail RAB', nav: 'rab', render: function (p, ctx) { return renderRead(p.id, ctx); } });
})();
