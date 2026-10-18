/* pages/rekap.js — rekap & grafik per Waka / kegiatan */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE, S = U.ST;

  Router.add('/rekap', {
    title: 'Rekap & Grafik', nav: 'rekap',
    render: function (params, ctx) {
      const user = App.state.user, onlyOwn = user.peran === R.WAKA;
      const f = { periode: '', status: 'Semua', id_waka: '', q: '' };
      let data = null;

      function body() {
        if (!ctx.alive() || !U.$('#rk-body')) return;
        const d = data, g = d.ringkasan;
        const totalPagu = d.rows.reduce(function (a, r) { return a + r.pagu; }, 0);
        U.$('#rk-body').innerHTML = String(html`<div class="stack-lg">
          <div class="grid-4">
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Pagu BOSP</span><span class="k-ico">${UI.ic('account_balance')}</span></div><div class="k-val">${U.juta(g.pagu_plafon)}</div><div class="k-sub">${f.periode || 'Seluruh periode'} · TA ${d.ta}</div></div>
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Total usulan</span><span class="k-ico">${UI.ic('request_quote')}</span></div><div class="k-val">${U.juta(g.total_usulan)}</div>${UI.bar(g.pagu_plafon > 0 ? (g.total_usulan / g.pagu_plafon) * 100 : 0)}</div>
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Disetujui</span><span class="k-ico">${UI.ic('verified')}</span></div><div class="k-val">${U.juta(g.disetujui)}</div><div class="k-sub">Status final Kepala Sekolah</div></div>
            <div class="card kpi"><div class="k-top"><span class="k-lbl">Sisa / cadangan</span><span class="k-ico">${UI.ic('savings')}</span></div><div class="k-val" style="${g.sisa < 0 ? 'color:var(--bad-fg)' : ''}">${U.juta(g.sisa)}</div><div class="k-sub">Cadangan belum didistribusi ${U.juta(g.cadangan)}</div></div></div>
          <div class="charts"><section class="card"><div class="card-head"><h3>Pagu vs usulan per Waka</h3></div><div class="card-pad">${UI.chartGroup(d.rows.map(function (r) { return { label: r.bidang, v: [r.pagu, r.usulan, r.disetujui] }; }), [{ nama: 'Pagu', warna: '#bfdbfe' }, { nama: 'Usulan', warna: '#2563eb' }, { nama: 'Disetujui', warna: '#16a34a' }])}</div></section>
            <section class="card"><div class="card-head"><h3>Nilai usulan per kegiatan</h3></div><div class="card-pad">${UI.chartH(d.kegiatan.slice(0, 8).map(function (k) { return { label: k.nomor_rab.split('/')[2] + ' · ' + k.nama, v: k.nilai }; }))}</div></section></div>
          <section class="card"><div class="card-head"><h3>Rekap per Waka</h3><span class="small muted">${d.rows.length} Waka</span></div>${d.rows.length ? html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Waka / Bidang</th><th>Program</th><th class="num">Pagu</th><th class="num">Usulan</th><th class="num">Disetujui</th><th class="num">Sisa</th><th style="width:130px">Serapan</th><th>Status</th></tr></thead><tbody>${d.rows.map(function (r) {
            return html`<tr><td data-l="Waka"><b>${r.nama}</b><div class="small muted">${r.bidang}</div></td><td data-l="Program" class="small">${r.program.length ? r.program.map(function (p) { return html`<div>• ${p}</div>`; }) : html`<span class="faint">—</span>`}</td><td class="num" data-l="Pagu">${U.rp(r.pagu)}</td><td class="num" data-l="Usulan">${U.rp(r.usulan)}</td><td class="num" data-l="Disetujui">${U.rp(r.disetujui)}</td>
              <td class="num" data-l="Sisa" style="${r.sisa < 0 ? 'color:var(--bad-fg)' : ''}">${U.rp(r.sisa)}</td><td data-l="Serapan"><div class="small mono">${r.rasio}%</div>${UI.bar(r.rasio)}</td><td data-l="Status">${r.status === '-' ? html`<span class="faint">Belum ada RAB</span>` : U.badge(r.status)}</td></tr>`;
          })}</tbody><tfoot><tr><td colspan="2">Total</td><td class="num">${U.rp(totalPagu)}</td><td class="num">${U.rp(g.total_usulan)}</td><td class="num">${U.rp(g.disetujui)}</td><td class="num">${U.rp(totalPagu - g.total_usulan)}</td><td colspan="2"></td></tr></tfoot></table></div>` : UI.empty('search_off', 'Tidak ada data', 'Ubah filter pencarian.')}</section></div>`);
      }
      function fetchData(spin) {
        if (spin && U.$('#rk-body')) U.$('#rk-body').innerHTML = String(UI.skeleton(4));
        return Api.call('rekap.get', { periode: f.periode, status: f.status, id_waka: f.id_waka, q: f.q }).then(function (d) { data = d; body(); }).catch(function (e) { if (ctx.alive() && U.$('#rk-body')) U.$('#rk-body').innerHTML = String(UI.errorBox(e, function () { fetchData(true); })); });
      }
      UI.mount(html`${UI.pageHead({
        crumbs: [{ t: 'Dasbor', href: '#/' }, { t: 'Rekap & Grafik', b: true }], title: 'Rekap & Grafik', sub: 'Serapan pagu dan usulan per Waka serta per kegiatan.',
        actions: html`<button class="btn" id="rk-csv">${UI.ic('download')}Ekspor CSV</button><button class="btn" id="rk-print">${UI.ic('print')}Cetak</button>`
      })}
      <div class="stack-lg"><div class="card card-pad"><div class="row row-wrap" style="gap:12px">
        <div class="input-wrap grow" style="min-width:200px">${UI.ic('search')}<input class="input" id="rk-q" placeholder="Cari Waka, bidang, atau program…" aria-label="Cari"></div>
        <select class="input" id="rk-per" style="width:auto" aria-label="Periode"><option value="">Semua periode</option><option>Semester 1</option><option>Semester 2</option><option>Tahunan</option></select>
        <select class="input" id="rk-st" style="width:auto" aria-label="Status"><option value="Semua">Semua status</option>${Object.keys(S).map(function (k) { return html`<option>${S[k]}</option>`; })}</select>
        ${onlyOwn ? '' : html`<select class="input" id="rk-w" style="width:auto" aria-label="Waka"><option value="">Semua Waka</option>${App.state.wakas.map(function (w) { return html`<option value="${w.id_user}">${w.nama}</option>`; })}</select>`}</div></div>
        <div id="rk-body">${UI.skeleton(4)}</div></div>`);
      U.$('#rk-q').oninput = U.debounce(function (e) { f.q = e.target.value.trim(); fetchData(); }, 350);
      U.$('#rk-per').onchange = function (e) { f.periode = e.target.value; fetchData(true); };
      U.$('#rk-st').onchange = function (e) { f.status = e.target.value; fetchData(true); };
      const w = U.$('#rk-w'); if (w) w.onchange = function (e) { f.id_waka = e.target.value; fetchData(true); };
      U.$('#rk-print').onclick = function () { window.print(); };
      U.$('#rk-csv').onclick = function () {
        if (!data) return;
        const rows = [['Waka', 'Bidang', 'Pagu', 'Usulan', 'Disetujui', 'Sisa', 'Serapan %', 'Status']].concat(data.rows.map(function (r) { return [r.nama, r.bidang, r.pagu, r.usulan, r.disetujui, r.sisa, r.rasio, r.status]; }));
        U.saveBlob(new Blob([U.toCsv(rows)], { type: 'text/csv;charset=utf-8' }), 'rekap-rab.csv');
      };
      return fetchData();
    }
  });
})();
