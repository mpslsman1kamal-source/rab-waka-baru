/* pages/rab-list.js — daftar RAB (semua / saya / antrean) + tabel bersama */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE, S = U.ST;

  const RabList = {
    table: function (rows, opt) {
      opt = opt || {};
      const compact = !!opt.compact;
      return html`<div class="tbl-wrap"><table class="tbl stack-m" data-rows><thead><tr><th>Nomor RAB</th><th>Program kerja</th>${compact ? '' : html`<th>Waka / Bidang</th>`}<th>Periode</th>${compact ? '' : html`<th class="num">Item</th>`}<th class="num">Total</th><th>Status</th>${compact ? '' : html`<th>Diperbarui</th>`}<th></th></tr></thead>
        <tbody>${rows.map(function (r) {
          const href = Router.rabHref(r);
          return html`<tr data-href="${href}" style="cursor:pointer"><td data-l="Nomor"><a class="code" href="${href}">${r.nomor_rab}</a></td>
            <td data-l="Program"><b>${r.nama_program}</b>${compact ? '' : html`<div class="small muted">${r.snp}</div>`}${r.status === S.REVISI && r.catatan_ringkas ? html`<div class="small" style="color:var(--bad-fg)">Catatan: ${r.catatan_ringkas.length > 90 ? r.catatan_ringkas.slice(0, 90) + '…' : r.catatan_ringkas}</div>` : ''}</td>
            ${compact ? '' : html`<td data-l="Waka">${r.nama_waka}<div class="small muted">${r.bidang}</div></td>`}
            <td data-l="Periode">${r.periode}<div class="small muted">${r.tahun_ajaran}</div></td>
            ${compact ? '' : html`<td class="num" data-l="Item">${r.jumlah_item}</td>`}
            <td class="num" data-l="Total">${U.rp(r.total)}</td><td data-l="Status">${U.badge(r.status)}</td>
            ${compact ? '' : html`<td data-l="Diperbarui" class="small muted">${U.tgl(r.tgl_update)}</td>`}
            <td class="nolabel" style="width:32px">${UI.ic('chevron_right', 'faint')}</td></tr>`;
        })}</tbody></table></div>`;
    },
    // Aktifkan klik baris pada kontainer
    bind: function (root) {
      root.addEventListener('click', function (e) {
        if (e.target.closest('a,button,input,select')) return;
        const tr = e.target.closest('tr[data-href]');
        if (tr) location.hash = tr.dataset.href.replace(/^#/, '');
      });
    }
  };
  window.RabList = RabList;

  function taOptions() {
    const cur = App.state.sekolah.tahun_ajaran, y = parseInt(cur, 10);
    return [(y - 1) + '/' + y, cur, (y + 1) + '/' + (y + 2)];
  }

  // opt: {judul, sub, status:[..] (preset), key}
  function renderList(ctx, opt) {
    const user = App.state.user, peran = user.peran, isWaka = peran === R.WAKA || peran === R.STAF;
    const q0 = Router.query();
    const f = { ta: App.state.sekolah.tahun_ajaran, periode: 'Semua', status: opt.status ? 'Semua' : (q0.status || 'Semua'), waka: '', q: '' };
    let data = null;

    function paint() {
      if (!ctx.alive()) return;
      const rows = data.rows.filter(function (r) {
        if (f.status !== 'Semua' && r.status !== f.status) return false;
        if (f.waka && r.id_waka !== f.waka) return false;
        if (f.q) { const t = (r.nomor_rab + ' ' + r.nama_program + ' ' + r.nama_waka + ' ' + r.bidang).toLowerCase(); if (t.indexOf(f.q.toLowerCase()) < 0) return false; }
        return true;
      });
      const total = rows.reduce(function (a, r) { return a + Number(r.total); }, 0);
      U.$('#rl-body').innerHTML = String(rows.length ? RabList.table(rows) : UI.empty('search_off', 'Tidak ada RAB yang cocok', 'Ubah filter atau kata kunci pencarian.'));
      U.$('#rl-sum').textContent = rows.length + ' RAB · Total ' + U.rp(total);
      U.$$('#rl-chips [data-st]').forEach(function (b) { b.classList.toggle('btn-primary', b.dataset.st === f.status); });
    }

    function frame() {
      const wakas = App.state.wakas;
      UI.mount(html`${UI.pageHead({
        crumbs: [{ t: 'Dasbor', href: '#/' }, { t: opt.judul, b: true }], title: opt.judul, sub: opt.sub,
        actions: html`<button class="btn" id="rl-csv">${UI.ic('download')}Ekspor CSV</button>${isWaka ? html`<a class="btn btn-primary" href="#/rab/baru">${UI.ic('add')}Buat RAB Baru</a>` : ''}`
      })}
      <div class="stack-lg">
        <div class="card card-pad stack" style="gap:14px">
          <div class="row row-wrap" style="gap:12px">
            <div class="input-wrap grow" style="min-width:220px">${UI.ic('search')}<input class="input" id="rl-q" placeholder="Cari nomor RAB, program, atau Waka…" aria-label="Cari"></div>
            <select class="input" id="rl-ta" style="width:auto" aria-label="Tahun ajaran">${taOptions().map(function (t) { return html`<option ${t === f.ta ? 'selected' : ''}>${t}</option>`; })}</select>
            <select class="input" id="rl-per" style="width:auto" aria-label="Periode">${['Semua', 'Semester 1', 'Semester 2', 'Tahunan'].map(function (p) { return html`<option value="${p}">${p === 'Semua' ? 'Semua periode' : p}</option>`; })}</select>
            ${peran !== R.WAKA ? html`<select class="input" id="rl-waka" style="width:auto" aria-label="Waka"><option value="">Semua Waka</option>${wakas.map(function (w) { return html`<option value="${w.id_user}">${w.nama} — ${w.bidang_waka}</option>`; })}</select>` : ''}
          </div>
          ${opt.status ? '' : html`<div class="row row-wrap" id="rl-chips" style="gap:8px"><button class="btn btn-sm" data-st="Semua">Semua <b class="mono" data-c="all"></b></button>${Object.keys(S).map(function (k) { return html`<button class="btn btn-sm" data-st="${S[k]}">${S[k]} <b class="mono" data-c="${S[k]}"></b></button>`; })}</div>`}
        </div>
        <section class="card"><div class="card-head"><span id="rl-sum" class="muted small mono">Memuat…</span></div><div id="rl-body">${UI.skeleton(4)}</div></section>
      </div>`);
      const root = U.$('#view');
      RabList.bind(root);
      U.$('#rl-q').oninput = U.debounce(function (e) { f.q = e.target.value.trim(); if (data) paint(); }, 150);
      U.$('#rl-ta').onchange = function (e) { f.ta = e.target.value; fetchRows(true); };
      U.$('#rl-per').onchange = function (e) { f.periode = e.target.value; fetchRows(true); };
      const w = U.$('#rl-waka'); if (w) w.onchange = function (e) { f.waka = e.target.value; if (data) paint(); };
      const chips = U.$('#rl-chips'); if (chips) UI.on(chips, 'click', '[data-st]', function (e, el) { f.status = el.dataset.st; paint(); });
      U.$('#rl-csv').onclick = function () {
        if (!data) return;
        const rows = [['Nomor RAB', 'Program', 'Waka', 'Bidang', 'Periode', 'Tahun Ajaran', 'Item', 'Total', 'Status', 'Diperbarui']].concat(data.rows.map(function (r) { return [r.nomor_rab, r.nama_program, r.nama_waka, r.bidang, r.periode, r.tahun_ajaran, r.jumlah_item, r.total, r.status, r.tgl_update]; }));
        U.saveBlob(new Blob([U.toCsv(rows)], { type: 'text/csv;charset=utf-8' }), 'daftar-rab.csv');
      };
    }

    function fetchRows(spinner) {
      const req = { ta: f.ta, periode: f.periode, status: opt.status || 'Semua', scope: 'saya' };
      if (spinner && U.$('#rl-body')) U.$('#rl-body').innerHTML = String(UI.skeleton(4));
      return Api.swr('rab.list', req, opt.key + '.' + f.ta + '.' + f.periode, function (d) {
        if (!ctx.alive()) return;
        data = d;
        if (!U.$('#rl-body')) frame();
        U.$$('#rl-chips [data-c]').forEach(function (b) { b.textContent = b.dataset.c === 'all' ? d.rows.length : (d.counts[b.dataset.c] || 0); });
        const st = U.$('#rl-per'); if (st) st.value = f.periode;
        paint();
      }).catch(function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e, function () { fetchRows(); })); });
    }
    frame();
    return fetchRows();
  }

  const isW = function () { const p = App.state.user.peran; return p === R.WAKA || p === R.STAF; };
  Router.add('/rab', { title: 'Daftar RAB', nav: 'rab', render: function (p, ctx) { return renderList(ctx, { judul: isW() ? 'RAB Saya' : 'Semua RAB', sub: 'Rancangan Anggaran Belanja BOSP — klik baris untuk membuka.', key: 'rab' }); } });
  Router.add('/revisi', { title: 'Perlu Revisi', nav: 'revisi', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return renderList(ctx, { judul: 'Perlu Revisi', sub: 'RAB yang dikembalikan Bendahara beserta catatannya.', status: [S.REVISI], key: 'revisi' }); } });
  Router.add('/persetujuan', {
    title: 'Antrean', nav: 'antrean', roles: [R.BEND, R.KEPSEK],
    render: function (p, ctx) {
      const bend = App.state.user.peran === R.BEND;
      return renderList(ctx, bend ? { judul: 'Antrean Pemeriksaan', sub: 'RAB yang diajukan Waka dan menunggu pemeriksaan Anda.', status: [S.KE_BEND, S.DIPERIKSA], key: 'antrean' } : { judul: 'Persetujuan', sub: 'RAB yang telah diperiksa Bendahara dan menunggu keputusan Anda.', status: [S.KE_KEPSEK], key: 'antrean' });
    }
  });
})();
