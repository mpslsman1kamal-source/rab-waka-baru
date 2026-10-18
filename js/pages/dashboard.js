/* pages/dashboard.js — dasbor per peran */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE, S = U.ST;

  function kpi(ico, lbl, val, sub, extra, href) {
    const tag = href ? 'a' : 'div';
    return U.raw('<' + tag + (href ? ' href="' + U.esc(href) + '"' : '') + ' class="card kpi' + (href ? ' tag-link' : '') + '"><div class="k-top"><span class="k-lbl">' + U.esc(lbl) + '</span><span class="k-ico"><span class="material-symbols-outlined">' + ico + '</span></span></div><div class="k-val">' + U.esc(val) + '</div>' + (sub ? '<div class="k-sub">' + U.esc(sub) + '</div>' : '') + (extra ? String(extra) : '') + '</' + tag + '>');
  }

  function view(d, user) {
    const peran = user.peran, isWaka = peran === R.WAKA || peran === R.STAF;
    let ring = d.ringkas;
    if (peran === R.STAF) ring = ring.filter(function (r) { return r.bidang === user.bidang_waka; });
    const pagu = ring.reduce(function (a, r) { return a + r.pagu; }, 0);
    const usulan = ring.reduce(function (a, r) { return a + r.usulan; }, 0);
    const setuju = ring.reduce(function (a, r) { return a + r.disetujui; }, 0);
    const sisa = pagu - usulan, rasio = pagu > 0 ? Math.round((usulan / pagu) * 1000) / 10 : 0;
    const c = d.counts;
    const queueTitle = peran === R.BEND ? 'Antrean pemeriksaan' : peran === R.KEPSEK ? 'Menunggu persetujuan Anda' : 'RAB perlu revisi';
    const queueLink = peran === R.BEND || peran === R.KEPSEK ? '#/persetujuan' : '#/revisi';
    const statusCards = [[S.DRAFT, 'edit_note'], [S.KE_BEND, 'send'], [S.REVISI, 'rate_review'], [S.DIPERIKSA, 'fact_check'], [S.KE_KEPSEK, 'approval'], [S.SETUJU, 'verified'], [S.BATAL, 'cancel']];

    return html`
    ${UI.pageHead({
      crumbs: [{ t: 'Dasbor', b: true }], title: peran === R.KEPSEK ? 'Dasbor Kepala Sekolah' : peran === R.BEND ? 'Dasbor Bendahara' : peran === R.ADMIN ? 'Dasbor Admin' : 'Dasbor ' + peran,
      sub: 'Ringkasan RAB BOSP TA ' + d.ta + ' · ' + d.periode,
      actions: html`<select class="input" id="d-per" style="width:auto" aria-label="Periode">${['Semester 1', 'Semester 2', 'Tahunan'].map(function (p) { return html`<option ${p === d.periode ? 'selected' : ''}>${p}</option>`; })}</select>
        ${isWaka ? html`<a class="btn btn-primary" href="#/rab/baru">${UI.ic('add')}Buat RAB Baru</a>` : ''}`
    })}
    <div class="stack-lg">
      ${isWaka && d.fokus ? html`<div class="stack" style="gap:8px"><div class="row between row-wrap"><span class="small muted">RAB terbaru: <a href="${'#/rab/' + d.fokus.id_rab}"><b>${d.fokus.nomor_rab}</b></a> — ${d.fokus.nama_program}</span>${U.badge(d.fokus.status)}</div>${UI.stepper(d.fokus.status)}</div>` : ''}
      <div class="grid-4">
        ${kpi('account_balance_wallet', 'Pagu ' + d.periode, U.juta(pagu), ring.length > 1 ? ring.length + ' Waka' : (ring[0] ? ring[0].bidang : ''))}
        ${kpi('request_quote', 'Total usulan aktif', U.juta(usulan), rasio + '% dari pagu', UI.bar(rasio))}
        ${kpi('verified', 'Telah disetujui', U.juta(setuju), pagu > 0 ? Math.round((setuju / pagu) * 1000) / 10 + '% dari pagu' : '')}
        ${kpi('savings', 'Sisa pagu', U.juta(sisa), sisa < 0 ? 'Melebihi pagu!' : 'Belum diusulkan')}
      </div>
      <div class="grid-4" style="grid-template-columns:repeat(auto-fit,minmax(128px,1fr))">${statusCards.map(function (s) {
        return html`<a class="card kpi tag-link" href="${'#/rab?status=' + encodeURIComponent(s[0])}"><div class="k-top"><span class="k-lbl">${s[0]}</span><span class="material-symbols-outlined faint">${s[1]}</span></div><div class="k-val">${c[s[0]] || 0}</div></a>`;
      })}</div>
      <div class="cols">
        <div class="stack-lg" style="min-width:0">
          ${peran !== R.ADMIN ? html`<section class="card"><div class="card-head"><h3>${queueTitle}</h3><a class="small" href="${queueLink}">Lihat semua</a></div>
            ${d.antrean.length ? RabList.table(d.antrean, { compact: true }) : UI.empty('task_alt', 'Tidak ada antrean', peran === R.BEND ? 'Belum ada RAB yang menunggu pemeriksaan.' : peran === R.KEPSEK ? 'Tidak ada RAB yang menunggu persetujuan.' : 'Tidak ada RAB yang perlu direvisi.')}</section>` : ''}
          ${!isWaka || ring.length > 1 ? html`<section class="card"><div class="card-head"><h3>Pagu & usulan per Waka</h3><span class="small muted">${d.periode}</span></div><div class="card-pad">
            ${UI.chartGroup(ring.map(function (r) { return { label: r.nama.replace(/^(Drs?\.|Dra\.|H\.|Hj\.)\s*/, '').split(' ')[0] + ' · ' + r.bidang.split(' ')[0], v: [r.pagu, r.usulan, r.disetujui] }; }), [{ nama: 'Pagu', warna: '#bfdbfe' }, { nama: 'Usulan', warna: '#2563eb' }, { nama: 'Disetujui', warna: '#16a34a' }])}</div>
            <div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Waka / Bidang</th><th class="num">Pagu</th><th class="num">Usulan</th><th class="num">Sisa</th><th style="width:150px">Serapan</th><th>Status</th></tr></thead><tbody>${ring.map(function (r) {
              return html`<tr><td data-l="Waka"><b>${r.nama}</b><div class="small muted">${r.bidang}</div></td><td class="num" data-l="Pagu">${U.rp(r.pagu)}</td><td class="num" data-l="Usulan">${U.rp(r.usulan)}</td><td class="num" data-l="Sisa" style="${r.sisa < 0 ? 'color:var(--bad-fg)' : ''}">${U.rp(r.sisa)}</td><td data-l="Serapan"><div class="small mono">${r.rasio}%</div>${UI.bar(r.rasio)}</td><td data-l="Status">${r.status === '-' ? html`<span class="faint">Belum ada RAB</span>` : U.badge(r.status)}</td></tr>`;
            })}</tbody></table></div></section>` : ''}
          <section class="card"><div class="card-head"><h3>RAB terbaru</h3><a class="small" href="#/rab">Lihat semua</a></div>
            ${d.terbaru.length ? RabList.table(d.terbaru, { compact: true }) : UI.empty('description', 'Belum ada RAB', isWaka ? 'Mulai dengan membuat RAB baru.' : '', isWaka ? html`<a class="btn btn-primary" href="#/rab/baru">${UI.ic('add')}Buat RAB Baru</a>` : '')}</section>
        </div>
        <aside>
          ${d.fokus ? html`<section class="card card-pad"><h3 style="margin-bottom:14px">Riwayat persetujuan</h3>${UI.timeline(d.fokus.riwayat, 'Belum diajukan. Riwayat akan muncul setelah RAB dikirim.')}</section>` : ''}
          <section class="card card-pad"><h3 style="margin-bottom:14px">Kegiatan terbesar</h3>${UI.chartH(d.kegiatan.map(function (k) { return { label: k.kode + ' · ' + k.nama, v: k.nilai }; }))}</section>
          ${peran === R.ADMIN ? html`<section class="card card-pad"><h3 style="margin-bottom:10px">Akses cepat</h3><div class="stack" style="gap:8px">
            <a class="btn" href="#/admin/users">${UI.ic('group')}Kelola pengguna (${d.stat.aktif}/${d.stat.users} aktif)</a><a class="btn" href="#/admin/pagu">${UI.ic('account_balance_wallet')}Atur pagu</a><a class="btn" href="#/admin/ssh">${UI.ic('inventory_2')}Standar harga</a><a class="btn" href="#/admin/notif">${UI.ic('notifications_active')}Notifikasi</a></div></section>` : ''}
        </aside>
      </div>
    </div>`;
  }

  Router.add('/', {
    title: 'Dasbor', nav: 'dash',
    render: function (params, ctx) {
      const user = App.state.user;
      let periode = U.store.get('rabwaka.periode', '');
      function load() {
        const key = 'dash.' + (periode || 'auto');
        return Api.swr('dashboard.get', periode ? { periode: periode } : {}, key, function (d, cache) {
          if (!ctx.alive()) return;
          UI.mount(view(d, user));
          const sel = U.$('#d-per');
          sel.onchange = function () { periode = sel.value; U.store.set('rabwaka.periode', periode); UI.mount(UI.skeleton(5)); load(); };
        }).catch(function (e) { if (ctx.alive()) UI.mount(UI.errorBox(e, load)); });
      }
      if (!Api.userId) Api.userId = user.id_user;
      UI.mount(UI.skeleton(5));
      return load();
    }
  });
  Router.add('/404', { title: 'Tidak ditemukan', render: function () { UI.mount(UI.empty('search_off', 'Halaman tidak ditemukan', 'Alamat yang Anda buka tidak tersedia.', html`<a class="btn btn-primary" href="#/">Ke Dasbor</a>`)); } });
})();
