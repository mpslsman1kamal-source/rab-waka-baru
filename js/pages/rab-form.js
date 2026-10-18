/* pages/rab-form.js — formulir data usulan RAB (baru & ubah) */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE;
  const PERNYATAAN = [
    ['bebas_double', 'Bebas pendanaan ganda', 'Usulan ini tidak didanai ganda oleh APBD/Pusat, kecuali item yang ditandai "sudah didanai" dan dilampiri bukti.'],
    ['ssh', 'Sesuai standar harga', 'Seluruh harga satuan mengacu pada Standar Satuan Harga (SSH) sekolah yang berlaku.'],
    ['dokumen', 'Dokumen sah', 'Dokumen pendukung yang diunggah benar, terbaca, dan dapat dipertanggungjawabkan.']
  ];
  const PRIO = [[1, 'Prioritas 1', 'Mendesak / wajib'], [2, 'Prioritas 2', 'Penting'], [3, 'Prioritas 3', 'Pengembangan']];

  function paguPanel(ringkas, periode) {
    const p = ringkas ? ringkas.periode[periode] : null;
    if (!p) return html`<div class="skel" style="height:90px"></div>`;
    const rasio = p.pagu > 0 ? Math.round((p.terpakai / p.pagu) * 1000) / 10 : 0;
    return html`<div class="stack" style="gap:10px">
      <div class="row between"><span class="small muted">Pagu ${periode}</span><b class="mono">${U.rp(p.pagu)}</b></div>
      <div class="row between"><span class="small muted">Sudah diusulkan (RAB lain)</span><b class="mono">${U.rp(p.terpakai)}</b></div>
      ${UI.bar(rasio)}
      <div class="row between"><span class="small muted">Sisa tersedia</span><b class="mono" style="color:${p.sisa < 0 ? 'var(--bad-fg)' : 'var(--ok-fg)'}">${U.rp(p.sisa)}</b></div>
      ${p.pagu <= 0 ? html`<div class="alert alert-warn">${UI.ic('warning')}<div><b>Pagu belum ditetapkan</b>Hubungi Admin. RAB tetap dapat disusun sebagai draf, tetapi belum dapat diajukan.</div></div>` : ''}</div>`;
  }

  function render(idRab, ctx) {
    const user = App.state.user, st = App.state;
    const edit = !!idRab;
    const sekolah = st.sekolah;
    const v = { id_waka: user.peran === R.WAKA ? user.id_user : '', periode: '', tahun_ajaran: sekolah.tahun_ajaran, nama_program: '', snp: '', prioritas: 0, latar_belakang: '', pernyataan: { bebas_double: false, ssh: false, dokumen: false } };
    let ringkas = null, ringkasFor = '';
    const wakasForStaf = st.wakas.filter(function (w) { return w.bidang_waka === user.bidang_waka; });
    if (user.peran === R.STAF && !v.id_waka && wakasForStaf.length === 1) v.id_waka = wakasForStaf[0].id_user;
    v.periode = (new Date().getMonth() + 1) >= 7 ? 'Semester 1' : 'Semester 2';

    function loadPagu() {
      const key = v.id_waka + '|' + v.tahun_ajaran;
      if (user.peran === R.STAF && !v.id_waka) { ringkas = null; refreshPanel(); return; }
      if (ringkasFor === key) return;
      ringkasFor = key; ringkas = null; refreshPanel();
      Api.swr('pagu.ringkas', { ta: v.tahun_ajaran, id_waka: v.id_waka }, 'pagur.' + key, function (d) { if (ctx.alive() && ringkasFor === key) { ringkas = d; refreshPanel(); } }).catch(function () {});
    }
    function refreshPanel() { const el = U.$('#pg-panel'); if (el) el.innerHTML = String(paguPanel(ringkas, v.periode)); }

    function frame(locked) {
      UI.mount(html`${UI.pageHead({
        crumbs: [{ t: 'RAB', href: '#/rab' }, { t: edit ? 'Ubah data usulan' : 'RAB baru', b: true }],
        title: edit ? 'Data Usulan RAB' : 'Buat RAB Baru', sub: edit ? 'Perbarui identitas program, lalu lanjutkan ke rincian belanja.' : 'Isi identitas program. Rincian belanja disusun pada langkah berikutnya.'
      })}
      <form id="f" novalidate class="cols"><div class="stack-lg" style="min-width:0">
        <section class="card"><div class="card-head"><h3>1 · Identitas usulan</h3></div><div class="card-pad stack">
          ${user.peran === R.WAKA ? html`<div class="field"><label>Pengusul</label><input class="input" value="${user.nama} — ${user.bidang_waka}" readonly></div>`
            : html`<div class="field"><label for="f-waka">Waka pengusul</label><select class="input" id="f-waka" ${edit ? 'disabled' : ''}><option value="">— Pilih Waka bidang ${user.bidang_waka} —</option>${wakasForStaf.map(function (w) { return html`<option value="${w.id_user}" ${w.id_user === v.id_waka ? 'selected' : ''}>${w.nama} — ${w.bidang_waka}</option>`; })}</select><span class="err-txt" data-e="id_waka" hidden></span></div>`}
          <div class="field"><label>Periode anggaran</label><div class="seg-grid" id="f-per">${['Semester 1', 'Semester 2', 'Tahunan'].map(function (p) {
            return html`<label class="seg ${p === v.periode ? 'on' : ''}"><input type="radio" name="per" value="${p}" ${p === v.periode ? 'checked' : ''}><b>${p}</b><span class="mono">${p === 'Semester 1' ? 'Jul – Des' : p === 'Semester 2' ? 'Jan – Jun' : 'Jul – Jun'}</span></label>`; })}</div></div>
          <div class="grid-2"><div class="field"><label>Tahun ajaran</label><input class="input mono" value="${v.tahun_ajaran}" readonly></div><div class="field"><label>Sumber dana</label><input class="input" value="BOSP Reguler" readonly></div></div>
        </div></section>
        <section class="card"><div class="card-head"><h3>2 · Program kerja</h3></div><div class="card-pad stack">
          <div class="field"><label for="f-nama">Nama program kerja</label><input class="input" id="f-nama" maxlength="200" placeholder="mis. Peningkatan Mutu Pembelajaran Kurikulum Merdeka" value="${v.nama_program}"><span class="err-txt" data-e="nama_program" hidden></span></div>
          <div class="field"><label for="f-snp">Standar Nasional Pendidikan (SNP) terkait</label><select class="input" id="f-snp"><option value="">— Pilih SNP —</option>${U.SNP.map(function (s) { return html`<option ${s === v.snp ? 'selected' : ''}>${s}</option>`; })}</select><span class="err-txt" data-e="snp" hidden></span></div>
          <div class="field"><label>Tingkat prioritas</label><div class="seg-grid" id="f-prio">${PRIO.map(function (p) { return html`<label class="seg ${v.prioritas === p[0] ? 'on' : ''}"><input type="radio" name="prio" value="${p[0]}" ${v.prioritas === p[0] ? 'checked' : ''}><b>${p[1]}</b><span class="mono">${p[2]}</span></label>`; })}</div><span class="err-txt" data-e="prioritas" hidden></span></div>
          <div class="field"><label for="f-latar">Latar belakang &amp; urgensi</label><textarea class="input" id="f-latar" maxlength="500" rows="4" placeholder="Jelaskan alasan dan kebutuhan program (minimal 20 karakter).">${v.latar_belakang}</textarea><div class="row between"><span class="err-txt" data-e="latar_belakang" hidden></span><span class="hint mono" id="f-cnt">0/500</span></div></div>
        </div></section>
        <section class="card"><div class="card-head"><h3>3 · Pernyataan kepatuhan</h3></div><div class="card-pad stack">
          <p class="muted small">Ketiga pernyataan wajib dicentang agar usulan dapat diajukan.</p>
          ${PERNYATAAN.map(function (p) { return html`<label class="check"><input type="checkbox" data-pn="${p[0]}" ${v.pernyataan[p[0]] ? 'checked' : ''}><span><b>${p[1]}.</b> ${p[2]}</span></label>`; })}
        </div></section>
        <div class="row row-wrap" style="justify-content:flex-end"><a class="btn" href="${edit ? '#/rab/' + idRab : '#/rab'}">Batal</a><button class="btn btn-primary btn-lg" type="submit" id="f-save">${UI.ic('save')}<span>${edit ? 'Simpan perubahan' : 'Simpan & lanjut ke rincian'}</span></button></div>
      </div>
      <aside><section class="card card-pad"><h3 style="margin-bottom:12px">Pagu tersedia</h3><div id="pg-panel">${paguPanel(ringkas, v.periode)}</div></section>
        <section class="card card-pad"><h3 style="margin-bottom:8px">Alur persetujuan</h3><ol class="muted small" style="margin:0;padding-left:18px;line-height:22px"><li>Waka menyusun &amp; mengajukan</li><li>Bendahara memeriksa sesuai juknis</li><li>Kepala Sekolah memvalidasi</li><li>RAB disetujui &amp; dapat dicetak</li></ol></section></aside></form>`);
      bind();
    }

    function collect() {
      v.nama_program = U.$('#f-nama').value.trim(); v.snp = U.$('#f-snp').value; v.latar_belakang = U.$('#f-latar').value.trim();
      const w = U.$('#f-waka'); if (w) v.id_waka = w.value;
      const per = U.$('input[name=per]:checked'); if (per) v.periode = per.value;
      const pr = U.$('input[name=prio]:checked'); v.prioritas = pr ? Number(pr.value) : 0;
      U.$$('[data-pn]').forEach(function (c) { v.pernyataan[c.dataset.pn] = c.checked; });
    }
    function validate() {
      collect();
      const e = {};
      if (user.peran === R.STAF && !edit && !v.id_waka) e.id_waka = 'Pilih Waka pengusul.';
      if (v.nama_program.length < 5) e.nama_program = 'Nama program minimal 5 karakter.';
      if (!v.snp) e.snp = 'Pilih SNP terkait.';
      if (!v.prioritas) e.prioritas = 'Pilih tingkat prioritas.';
      if (v.latar_belakang.length < 20) e.latar_belakang = 'Latar belakang minimal 20 karakter (sekarang ' + v.latar_belakang.length + ').';
      U.$$('[data-e]').forEach(function (el) { const m = e[el.dataset.e]; el.hidden = !m; el.textContent = m || ''; });
      return Object.keys(e).length === 0 ? true : (U.$('[data-e]:not([hidden])') || { scrollIntoView: function () {} }).scrollIntoView({ block: 'center' });
    }

    function bind() {
      const cnt = function () { U.$('#f-cnt').textContent = U.$('#f-latar').value.length + '/500'; }; cnt();
      U.$('#f-latar').oninput = cnt;
      UI.on(U.$('#f'), 'change', 'input[type=radio]', function (e, el) {
        const grp = el.closest('.seg-grid'); U.$$('.seg', grp).forEach(function (s) { s.classList.toggle('on', s.contains(el) && el.checked); });
        if (el.name === 'per') { v.periode = el.value; refreshPanel(); }
      });
      const w = U.$('#f-waka'); if (w) w.onchange = function () { v.id_waka = w.value; loadPagu(); };
      U.$('#f').addEventListener('submit', function (e) {
        e.preventDefault();
        if (validate() !== true) return;
        const body = { periode: v.periode, tahun_ajaran: v.tahun_ajaran, nama_program: v.nama_program, snp: v.snp, prioritas: v.prioritas, latar_belakang: v.latar_belakang, pernyataan: v.pernyataan };
        const btn = U.$('#f-save');
        if (edit) {
          body.id_rab = idRab;
          UI.busy(btn, Api.call('rab.updateHeader', body), 'Menyimpan…').then(function () { Engine.drop(idRab); UI.toast('Data usulan diperbarui.'); location.hash = '#/rab/' + idRab; }).catch(function (er) { UI.error(er); });
        } else {
          if (user.peran === R.STAF) body.id_waka = v.id_waka;
          UI.busy(btn, Api.call('rab.create', body), 'Membuat…').then(function (r) { Api.dropCache(); UI.toast('RAB dibuat: ' + r.nomor_rab); location.hash = '#/rab/' + r.id_rab; }).catch(function (er) { UI.error(er); });
        }
      });
      loadPagu();
    }

    if (!edit) { frame(); return; }
    UI.mount(UI.skeleton(5));
    return Api.call('rab.get', { id_rab: idRab }).then(function (d) {
      if (!ctx.alive()) return;
      if (!d.izin.edit) { UI.toast('RAB ini tidak dapat diubah pada status ' + d.rab.status + '.', 'info'); location.hash = '#/detail/' + idRab; return; }
      const r = d.rab;
      Object.assign(v, { id_waka: r.id_waka, periode: r.periode, tahun_ajaran: r.tahun_ajaran, nama_program: r.nama_program, snp: r.snp, prioritas: Number(r.prioritas), latar_belakang: r.latar_belakang, pernyataan: Object.assign({ bebas_double: false, ssh: false, dokumen: false }, r.pernyataan) });
      frame();
    });
  }

  Router.add('/rab/baru', { title: 'RAB Baru', nav: 'baru', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return render(null, ctx); } });
  Router.add('/rab/:id/info', { title: 'Data Usulan', nav: 'rab', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return render(p.id, ctx); } });
})();
