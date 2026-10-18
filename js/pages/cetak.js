/* pages/cetak.js — pratinjau, cetak, unduh PDF & kirim salinan RAB yang telah disetujui */
(function () {
  'use strict';
  const html = U.html;

  Router.add('/cetak', {
    title: 'Cetak RAB', nav: 'cetak',
    render: function (params, ctx) {
      const opt = { cap: true, qr: true, komite: false, hemat: false, margin: 18 };
      let rows = [], cur = ctx.query.id || '', frame = null;

      function pick() { return rows.filter(function (r) { return r.id_rab === cur; })[0]; }
      function fit() {
        const paper = U.$('.paper'), f = U.$('.paper iframe'); if (!paper || !f) return;
        const w = paper.clientWidth - 32, base = 794; // 210mm ≈ 794px
        const sc = Math.min(1, w / base);
        f.style.transformOrigin = 'top left'; f.style.transform = 'scale(' + sc + ')'; f.style.marginLeft = Math.max(0, (w - base * sc) / 2) + 'px'; f.style.marginBottom = (-(1123 * (1 - sc))) + 'px';
      }
      function preview() {
        const box = U.$('#ct-prev'); if (!cur) { box.innerHTML = String(UI.empty('print', 'Pilih RAB', 'Pilih RAB berstatus Disetujui untuk melihat pratinjau dokumen.')); return; }
        box.innerHTML = String(UI.skeleton(3));
        const myCur = cur;
        Api.call('cetak.html', Object.assign({ id_rab: cur }, opt)).then(function (r) {
          if (!ctx.alive() || myCur !== cur) return;
          box.innerHTML = '<div class="paper"><iframe title="Pratinjau dokumen" sandbox="allow-same-origin allow-modals"></iframe></div>';
          frame = U.$('iframe', box); frame.srcdoc = r.html; frame.onload = fit; fit();
        }).catch(function (e) { box.innerHTML = String(UI.errorBox(e, preview)); });
      }
      const debPrev = U.debounce(preview, 400);

      UI.mount(html`${UI.pageHead({ crumbs: [{ t: 'Dasbor', href: '#/' }, { t: 'Cetak RAB', b: true }], title: 'Cetak RAB', sub: 'Dokumen resmi RAB yang telah disetujui Kepala Sekolah (A4).' })}
      <div class="cols"><div style="min-width:0"><div id="ct-prev">${UI.skeleton(3)}</div></div>
      <aside><section class="card card-pad stack"><h3>Pengaturan dokumen</h3>
        <div class="field"><label for="ct-r">RAB disetujui</label><select class="input" id="ct-r"><option value="">Memuat…</option></select></div>
        <label class="check"><input type="checkbox" id="ct-cap" checked><span>Tempat cap/stempel sekolah</span></label>
        <label class="check"><input type="checkbox" id="ct-qr" checked><span>QR verifikasi (checksum)</span></label>
        <label class="check"><input type="checkbox" id="ct-kom"><span>Sertakan kolom Komite</span></label>
        <label class="check"><input type="checkbox" id="ct-hemat"><span>Mode hemat tinta</span></label>
        <div class="field"><label for="ct-m">Margin (mm): <b id="ct-mv">18</b></label><input type="range" id="ct-m" min="10" max="30" value="18"></div></section>
      <section class="card card-pad stack"><button class="btn btn-primary btn-lg btn-block" id="ct-print" disabled>${UI.ic('print')}Cetak</button><button class="btn btn-block" id="ct-pdf" disabled>${UI.ic('picture_as_pdf')}Unduh PDF</button><button class="btn btn-block" id="ct-mail" disabled>${UI.ic('forward_to_inbox')}Kirim salinan ke email</button>
        <p class="small muted">Pratinjau dan Cetak memakai ukuran A4 dari browser. File PDF dibuat server dan juga diarsipkan di Google Drive saat RAB disetujui.</p></section></aside></div>`);

      const sel = U.$('#ct-r');
      function toggleBtns() { const on = !!cur; ['#ct-print', '#ct-pdf', '#ct-mail'].forEach(function (s) { U.$(s).disabled = !on; }); }
      sel.onchange = function () { cur = sel.value; toggleBtns(); history.replaceState(null, '', '#/cetak' + (cur ? '?id=' + cur : '')); preview(); };
      [['#ct-cap', 'cap'], ['#ct-qr', 'qr'], ['#ct-kom', 'komite'], ['#ct-hemat', 'hemat']].forEach(function (p) { U.$(p[0]).onchange = function () { opt[p[1]] = this.checked; debPrev(); }; });
      U.$('#ct-m').oninput = function () { opt.margin = Number(this.value); U.$('#ct-mv').textContent = this.value; debPrev(); };
      window.addEventListener('resize', fit);
      U.$('#ct-print').onclick = function () { if (frame && frame.contentWindow) { frame.contentWindow.focus(); frame.contentWindow.print(); } };
      U.$('#ct-pdf').onclick = function () {
        const r = pick(); UI.busy(U.$('#ct-pdf'), Api.call('cetak.pdf', Object.assign({ id_rab: cur }, opt), { timeout: 120000 }), 'Membuat PDF…')
          .then(function (x) { U.saveBlob(U.b64ToBlob(x.base64, x.mime), x.nama_file || ((r ? r.nomor_rab.replace(/\//g, '-') : 'RAB') + '.pdf')); }).catch(function (e) { UI.error(e); });
      };
      U.$('#ct-mail').onclick = function () {
        UI.confirm({ title: 'Kirim salinan?', text: 'PDF dokumen dikirim ke email Waka pemilik, Bendahara, dan Anda.', ok: 'Kirim', cls: 'btn-primary' }).then(function (ok) {
          if (!ok) return;
          UI.busy(U.$('#ct-mail'), Api.call('cetak.kirim', { id_rab: cur }, { timeout: 120000 }), 'Mengirim…').then(function (r) { UI.toast('Terkirim: ' + r.dikirim + (r.gagal ? ', gagal: ' + r.gagal : '')); }).catch(function (e) { UI.error(e); });
        });
      };

      return Api.call('rab.list', { status: 'Disetujui', ta: '', scope: 'saya' }).then(function (d) {
        if (!ctx.alive()) return;
        rows = d.rows;
        sel.innerHTML = String(html`<option value="">— Pilih RAB —</option>${rows.map(function (r) { return html`<option value="${r.id_rab}" ${r.id_rab === cur ? 'selected' : ''}>${r.nomor_rab} · ${r.nama_program}</option>`; })}`);
        if (cur && !pick()) cur = '';
        if (!cur && rows.length === 1) { cur = rows[0].id_rab; sel.value = cur; }
        toggleBtns();
        if (!rows.length) U.$('#ct-prev').innerHTML = String(UI.empty('print_disabled', 'Belum ada RAB disetujui', 'Dokumen dapat dicetak setelah Kepala Sekolah menyetujui RAB.'));
        else preview();
        return function () { window.removeEventListener('resize', fit); };
      });
    }
  });
})();
