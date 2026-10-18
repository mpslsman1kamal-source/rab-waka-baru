/* pages/rab-berkas.js — unggah & kelola berkas pendukung + pratinjau */
(function () {
  'use strict';
  const html = U.html, R = U.ROLE;
  const JENIS = { surat_usulan: 'Surat usulan', bukti_pendanaan: 'Bukti pendanaan (APBD/Pusat)', foto_kondisi: 'Foto kondisi', lainnya: 'Lainnya' };
  const EXT = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'zip'];
  const MAX = 10 * 1024 * 1024;
  const ICON = function (m) { return /pdf/.test(m) ? 'picture_as_pdf' : /image/.test(m) ? 'image' : /zip/.test(m) ? 'folder_zip' : /sheet|excel/.test(m) ? 'table_chart' : 'description'; };

  // Pratinjau/unduh satu berkas
  const BerkasUI = {
    open: function (b) {
      const m = UI.modal({ title: b.nama_file, wide: true, body: html`<div id="bv" style="min-height:200px;display:grid;place-items:center">${UI.skeleton(2)}</div>`, foot: [{ label: 'Tutup', value: null }] });
      Api.call('berkas.get', { id_berkas: b.id_berkas }, { timeout: 120000 }).then(function (r) {
        const blob = U.b64ToBlob(r.base64, r.mime), url = URL.createObjectURL(blob), box = U.$('#bv', m.el);
        if (!box) return;
        if (/^image\//.test(r.mime)) box.innerHTML = '<img alt="" style="max-width:100%;max-height:70vh;border-radius:8px" src="' + url + '">';
        else if (r.mime === 'application/pdf') box.innerHTML = '<iframe title="Pratinjau" style="width:100%;height:70vh;border:0" src="' + url + '"></iframe>';
        else box.innerHTML = '<div class="empty" style="padding:24px"><span class="material-symbols-outlined">description</span><p>Pratinjau tidak tersedia untuk jenis berkas ini.</p></div>';
        const dl = document.createElement('button'); dl.className = 'btn btn-primary'; dl.innerHTML = '<span class="material-symbols-outlined">download</span>Unduh';
        dl.onclick = function () { U.saveBlob(blob, r.nama_file); };
        U.$('.modal-f', m.el).prepend(dl);
      }).catch(function (e) { m.close(); UI.error(e); });
    },
    icon: ICON, JENIS: JENIS
  };
  window.BerkasUI = BerkasUI;

  function render(idRab, ctx) {
    const s = Engine.get(idRab);
    let queue = [];

    function itemName(id) { const d = s.data.detail.filter(function (x) { return x.id_detail === id; })[0]; return d ? d.kode_item + ' · ' + d.nama_item : ''; }

    function listHtml() {
      const b = s.data.berkas;
      if (!b.length) return UI.empty('folder_open', 'Belum ada berkas', 'Unggah surat usulan dan dokumen pendukung lainnya.');
      return html`<div class="tbl-wrap"><table class="tbl stack-m"><thead><tr><th>Berkas</th><th>Jenis</th><th>Dikaitkan ke item</th><th>Ukuran</th><th>Diunggah</th><th></th></tr></thead><tbody>${b.map(function (x) {
        return html`<tr><td data-l="Berkas"><div class="row" style="gap:8px">${UI.ic(ICON(x.mime), 'faint')}<div><b>${x.nama_file}</b>${x.keterangan ? html`<div class="small muted">${x.keterangan}</div>` : ''}</div></div></td><td data-l="Jenis"><span class="chip">${JENIS[x.jenis] || x.jenis}</span></td>
          <td data-l="Item" class="small">${x.id_detail ? itemName(x.id_detail) || '-' : html`<span class="faint">—</span>`}</td><td data-l="Ukuran" class="small mono">${U.ukuran(x.ukuran)}</td><td data-l="Diunggah" class="small">${x.diunggah_oleh}<div class="muted">${U.tglJam(x.waktu)}</div></td>
          <td class="nolabel" style="white-space:nowrap"><button class="btn btn-icon btn-ghost" data-act="view" data-id="${x.id_berkas}" title="Lihat" aria-label="Lihat">${UI.ic('visibility')}</button><button class="btn btn-icon btn-ghost" data-act="del" data-id="${x.id_berkas}" title="Hapus" aria-label="Hapus">${UI.ic('delete')}</button></td></tr>`;
      })}</tbody></table></div>`;
    }
    function needHtml() {
      const d = s.data, rows = [];
      const surat = d.berkas.some(function (b) { return b.jenis === 'surat_usulan'; });
      rows.push([surat, 'Surat usulan', surat ? 'Terunggah' : 'Wajib minimal 1 berkas']);
      d.detail.forEach(function (x) {
        if (x.sudah_didanai_lain === 'Ya') { const ok = d.berkas.some(function (b) { return b.id_detail === x.id_detail && b.jenis === 'bukti_pendanaan'; }); rows.push([ok, x.nama_item, ok ? 'Bukti pendanaan ada' : 'Butuh bukti pendanaan']); }
        else if (x.kebutuhan_riil === 'Ya') { const ok = d.berkas.some(function (b) { return b.id_detail === x.id_detail && b.jenis === 'foto_kondisi'; }); rows.push([ok, x.nama_item, ok ? 'Foto kondisi ada' : 'Butuh foto kondisi']); }
      });
      return html`<div class="chk-list">${rows.map(function (r) { return html`<div class="chk ${r[0] ? '' : 'bad'}">${UI.ic(r[0] ? 'check_circle' : 'error')}<div><b>${r[1]}</b><span class="small">${r[2]}</span></div></div>`; })}</div>`;
    }
    function repaint() { if (!U.$('#bk-list')) return; U.$('#bk-list').innerHTML = String(listHtml()); U.$('#bk-need').innerHTML = String(needHtml()); }

    function frame() {
      const d = s.data, r = d.rab;
      UI.mount(html`${UI.pageHead({ crumbs: [{ t: 'RAB', href: '#/rab' }, { t: r.nomor_rab, href: '#/rab/' + idRab }, { t: 'Berkas pendukung', b: true }], title: 'Berkas pendukung', sub: r.nama_program, actions: U.badge(r.status) })}
      <div class="stack-lg"><div class="card"><div class="stepper">
        <a class="step done" href="${'#/rab/' + idRab + '/info'}"><span class="n">✓</span><div><small>Langkah 1</small><b>Data usulan</b></div></a>
        <a class="step done" href="${'#/rab/' + idRab}"><span class="n">✓</span><div><small>Langkah 2</small><b>Rincian belanja</b></div></a>
        <div class="step now"><span class="n">3</span><div><small>Langkah 3</small><b>Berkas pendukung</b></div></div>
        <a class="step" href="${'#/rab/' + idRab + '/ajukan'}"><span class="n">4</span><div><small>Langkah 4</small><b>Ajukan</b></div></a></div></div>
      <div class="cols"><div class="stack-lg" style="min-width:0">
        <section class="card"><div class="card-head"><h3>Unggah berkas</h3><span class="small muted">PDF, JPG, PNG, DOC/DOCX, XLS/XLSX, ZIP · maks. 10 MB</span></div><div class="card-pad stack">
          <div class="grid-2"><div class="field"><label for="bk-j">Jenis berkas</label><select class="input" id="bk-j">${Object.keys(JENIS).map(function (k) { return html`<option value="${k}">${JENIS[k]}</option>`; })}</select></div>
            <div class="field"><label for="bk-d">Kaitkan ke item <span id="bk-req" class="faint">(opsional)</span></label><select class="input" id="bk-d"><option value="">— Tidak dikaitkan —</option>${d.detail.map(function (x) { return html`<option value="${x.id_detail}">${x.kode_item} · ${x.nama_item}${x.sudah_didanai_lain === 'Ya' ? ' [didanai lain]' : x.kebutuhan_riil === 'Ya' ? ' [kebutuhan riil]' : ''}</option>`; })}</select></div></div>
          <div class="field"><label for="bk-k">Keterangan (opsional)</label><input class="input" id="bk-k" maxlength="300" placeholder="mis. Foto atap ruang kelas XI-3 bocor"></div>
          <div class="drop" id="bk-drop"><span class="material-symbols-outlined" style="font-size:36px;color:var(--primary-600)">cloud_upload</span><p style="margin:8px 0 12px"><b>Tarik berkas ke sini</b> atau</p><label class="btn btn-primary" for="bk-file" style="cursor:pointer">Pilih berkas</label><input type="file" id="bk-file" multiple class="sr" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip"></div>
          <div id="bk-prog" class="stack" style="gap:8px"></div></div></section>
        <section class="card"><div class="card-head"><h3>Berkas terunggah</h3></div><div id="bk-list">${listHtml()}</div></section></div>
      <aside><section class="card card-pad"><h3 style="margin-bottom:12px">Persyaratan berkas</h3><div id="bk-need">${needHtml()}</div></section>
        <div class="stack" style="gap:10px"><a class="btn btn-primary btn-lg btn-block" href="${'#/rab/' + idRab + '/ajukan'}">Lanjut ajukan${UI.ic('arrow_forward')}</a><a class="btn btn-block" href="${'#/rab/' + idRab}">${UI.ic('arrow_back')}Kembali ke rincian</a></div></aside></div></div>`);
      bind();
    }

    function prog(name) {
      const el = document.createElement('div'); el.className = 'row small'; el.innerHTML = String(html`<span class="material-symbols-outlined spin">progress_activity</span><span class="grow">${name}</span><span class="muted">mengunggah…</span>`);
      U.$('#bk-prog').appendChild(el); return el;
    }
    function upload(files) {
      const jenis = U.$('#bk-j').value, det = U.$('#bk-d').value, ket = U.$('#bk-k').value;
      if ((jenis === 'bukti_pendanaan' || jenis === 'foto_kondisi') && !det) { UI.toast('Pilih item yang dikaitkan dengan berkas ini.', 'err'); U.$('#bk-d').classList.add('err'); U.$('#bk-d').focus(); return; }
      U.$('#bk-d').classList.remove('err');
      files = Array.prototype.slice.call(files);
      s.flush().then(function () {
        return files.reduce(function (p, f) {
          return p.then(function () {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            if (EXT.indexOf(ext) < 0) { UI.toast(f.name + ': format tidak didukung.', 'err'); return; }
            if (f.size > MAX) { UI.toast(f.name + ': ukuran melebihi 10 MB.', 'err'); return; }
            const row = prog(f.name);
            return U.fileToB64(f).then(function (b64) { return Api.call('berkas.upload', { id_rab: idRab, jenis: jenis, id_detail: det, keterangan: ket, nama_file: f.name, base64: b64 }, { timeout: 180000 }); })
              .then(function (r) { s.data.berkas.push(r); row.remove(); repaint(); UI.toast('Terunggah: ' + f.name); })
              .catch(function (e) { row.remove(); UI.error(e, f.name + ':'); });
          });
        }, Promise.resolve());
      });
    }
    function bind() {
      const drop = U.$('#bk-drop'), inp = U.$('#bk-file');
      inp.onchange = function () { if (inp.files.length) upload(inp.files); inp.value = ''; };
      ['dragover', 'dragenter'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) upload(e.dataTransfer.files); });
      U.$('#bk-j').onchange = function () { const need = /bukti|foto/.test(this.value); U.$('#bk-req').textContent = need ? '(wajib)' : '(opsional)'; };
      UI.on(U.$('#bk-list'), 'click', '[data-act]', function (e, el) {
        const b = s.data.berkas.filter(function (x) { return x.id_berkas === el.dataset.id; })[0];
        if (el.dataset.act === 'view') BerkasUI.open(b);
        else UI.confirm({ title: 'Hapus berkas?', text: b.nama_file + ' akan dihapus.', ok: 'Hapus', cls: 'btn-danger-solid' }).then(function (ok) {
          if (!ok) return;
          Api.call('berkas.delete', { id_berkas: b.id_berkas }).then(function () { s.data.berkas = s.data.berkas.filter(function (x) { return x.id_berkas !== b.id_berkas; }); repaint(); UI.toast('Berkas dihapus.'); }).catch(function (er) { UI.error(er); });
        });
      });
    }

    if (s.data && s.data.izin.edit) frame(); else UI.mount(UI.skeleton(5));
    return s.flush().then(function () { return s.load(); }).then(function () {
      if (!ctx.alive()) return;
      if (!s.data.izin.edit) { UI.toast('RAB tidak dapat diubah pada status ' + s.data.rab.status + '.', 'info'); location.hash = '#/detail/' + idRab; return; }
      if (!U.$('#bk-drop')) frame(); else repaint();
    });
  }
  Router.add('/rab/:id/berkas', { title: 'Berkas', nav: 'rab', roles: [R.WAKA, R.STAF], render: function (p, ctx) { return render(p.id, ctx); } });
})();
