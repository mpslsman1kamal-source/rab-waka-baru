/* ui.js — komponen antarmuka bersama: toast, modal, konfirmasi, kerangka halaman, grafik SVG */
(function () {
  'use strict';
  const html = U.html, esc = U.esc;

  const UI = {
    ic: function (name, cls) { return html`<span class="material-symbols-outlined ${cls || ''}">${name}</span>`; },

    // Delegasi event: UI.on(root, 'click', '[data-act]', function (e, el) {...})
    on: function (root, type, sel, fn) {
      root.addEventListener(type, function (e) {
        const el = e.target.closest ? e.target.closest(sel) : null;
        if (el && root.contains(el)) fn.call(el, e, el);
      });
    },

    mount: function (h) { const v = U.$('#view'); v.innerHTML = String(h); return v; },

    toast: function (msg, tipe, list) {
      const box = U.$('#toasts');
      const el = document.createElement('div');
      el.className = 'toast ' + (tipe || 'ok');
      const icon = tipe === 'err' ? 'error' : (tipe === 'info' ? 'info' : 'check_circle');
      el.innerHTML = String(html`<span class="material-symbols-outlined">${icon}</span><div><b style="font-weight:600">${msg}</b>${list && list.length ? html`<ul>${list.map(function (x) { return html`<li>${x}</li>`; })}</ul>` : ''}</div>`);
      box.appendChild(el);
      setTimeout(function () { el.style.transition = 'opacity .25s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, tipe === 'err' ? 7000 : 3200);
    },
    // Tampilkan galat API (dengan daftar rinci bila ada)
    error: function (e, judul) {
      const list = e && e.extra && Array.isArray(e.extra.errors) ? e.extra.errors : null;
      UI.toast(judul ? judul + ' ' + (e.message || '') : (e.message || 'Terjadi kesalahan.'), 'err', list);
    },

    // Modal umum. opts: {title, body (Raw|string), foot:[{label,cls,id,click(close,el)}], wide, onOpen(root, close)}
    modal: function (opts) {
      const root = U.$('#modal-root');
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      const foot = (opts.foot || []).map(function (b, i) { return html`<button type="button" class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`; });
      bg.innerHTML = String(html`<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${opts.title}">
        <div class="modal-h"><h2>${opts.title}</h2><button type="button" class="btn btn-icon btn-ghost" data-x aria-label="Tutup">${UI.ic('close')}</button></div>
        <div class="modal-b">${opts.body instanceof U.Raw ? opts.body : U.raw(esc(opts.body || ''))}</div>
        ${foot.length ? html`<div class="modal-f">${foot}</div>` : ''}</div>`);
      root.appendChild(bg);
      const prev = document.activeElement;
      function close(v) { document.removeEventListener('keydown', key); bg.remove(); if (prev && prev.focus) try { prev.focus(); } catch (e) {} if (opts.onClose) opts.onClose(v); }
      function key(e) { if (e.key === 'Escape' && root.lastElementChild === bg) close(null); }
      document.addEventListener('keydown', key);
      bg.addEventListener('mousedown', function (e) { if (e.target === bg && !opts.static) close(null); });
      U.$('[data-x]', bg).onclick = function () { close(null); };
      U.$$('.modal-f [data-i]', bg).forEach(function (btn) {
        btn.onclick = function () { const b = opts.foot[Number(btn.dataset.i)]; if (b.click) b.click(close, btn, bg); else close(b.value); };
      });
      const first = U.$('input:not([type=hidden]),textarea,select', bg) || U.$('.modal-f .btn:last-child', bg);
      if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
      if (opts.onOpen) opts.onOpen(bg, close);
      return { el: bg, close: close };
    },

    confirm: function (o) {
      return new Promise(function (res) {
        let done = false;
        UI.modal({
          title: o.title || 'Konfirmasi', body: html`<p class="muted" style="padding:6px 0 4px;line-height:22px">${o.text}</p>`,
          foot: [{ label: o.batal || 'Batal', value: false }, { label: o.ok || 'Ya, lanjutkan', cls: o.cls || 'btn-primary', value: true }],
          onClose: function (v) { if (!done) { done = true; res(v === true); } }
        });
      });
    },

    // Isian teks (alasan, catatan). Mengembalikan teks atau null bila dibatalkan.
    prompt: function (o) {
      return new Promise(function (res) {
        let done = false;
        UI.modal({
          title: o.title, body: html`<div class="stack" style="padding-top:6px">${o.text ? html`<p class="muted">${o.text}</p>` : ''}
            <div class="field"><label for="pr-in">${o.label || 'Catatan'}</label><textarea class="input" id="pr-in" rows="4" maxlength="${o.max || 600}" placeholder="${o.placeholder || ''}"></textarea>
            <span class="err-txt" id="pr-err" hidden></span></div></div>`,
          foot: [{ label: 'Batal', value: null }, {
            label: o.ok || 'Simpan', cls: o.cls || 'btn-primary', click: function (close) {
              const v = U.$('#pr-in').value.trim(), min = o.min === undefined ? 0 : o.min;
              if (v.length < min) { const er = U.$('#pr-err'); er.hidden = false; er.textContent = 'Minimal ' + min + ' karakter.'; U.$('#pr-in').classList.add('err'); return; }
              done = true; close(v); res(v);
            }
          }],
          onClose: function () { if (!done) { done = true; res(null); } }
        });
      });
    },

    // Matikan tombol selama proses; kembalikan Promise yang sama
    busy: function (btn, p, label) {
      if (!btn) return p;
      const old = btn.innerHTML; btn.disabled = true;
      btn.innerHTML = String(html`<span class="material-symbols-outlined spin">progress_activity</span><span>${label || 'Memproses…'}</span>`);
      const back = function () { btn.disabled = false; btn.innerHTML = old; };
      p.then(back, back);
      return p;
    },

    pageHead: function (o) {
      return html`<div class="page-head"><div class="t">
        ${o.crumbs ? html`<div class="crumbs">${o.crumbs.map(function (c, i) { return html`${i ? ' / ' : ''}${c.href ? html`<a href="${c.href}">${c.t}</a>` : (c.b ? html`<b>${c.t}</b>` : c.t)}`; })}</div>` : ''}
        <h1>${o.title}</h1>${o.sub ? html`<p>${o.sub}</p>` : ''}</div>
        ${o.actions ? html`<div class="actions">${o.actions}</div>` : ''}</div>`;
    },
    skeleton: function (rows) {
      let h = '';
      for (let i = 0; i < (rows || 4); i++) h += '<div class="skel" style="height:' + (i === 0 ? 28 : 64) + 'px;margin-bottom:12px;width:' + (i === 0 ? '40%' : '100%') + '"></div>';
      return U.raw(h);
    },
    empty: function (icon, judul, sub, aksi) {
      return html`<div class="empty">${UI.ic(icon)}<b style="display:block;color:var(--ink);margin-bottom:4px">${judul}</b>${sub ? html`<p>${sub}</p>` : ''}${aksi ? html`<div style="margin-top:14px">${aksi}</div>` : ''}</div>`;
    },
    errorBox: function (e, retry) {
      const id = 'rt_' + Math.random().toString(36).slice(2, 7);
      setTimeout(function () { const b = document.getElementById(id); if (b && retry) b.onclick = retry; }, 0);
      return html`<div class="card card-pad"><div class="alert alert-bad">${UI.ic('cloud_off')}<div><b>Gagal memuat data</b>${e && e.message ? e.message : 'Terjadi kesalahan.'}</div></div>
        ${retry ? html`<div style="margin-top:14px"><button class="btn btn-primary" id="${id}">${UI.ic('refresh')}Coba lagi</button></div>` : ''}</div>`;
    },
    bar: function (pct, cls) {
      const p = Math.max(0, Math.min(100, Number(pct) || 0));
      return html`<div class="bar ${cls || (pct >= 100 ? 'bad' : pct >= 95 ? 'warn' : '')}" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
    },

    // ---------- Alur status ----------
    stepper: function (status) {
      const S = U.ST;
      const steps = [['Draf Waka', 'Penyusunan'], ['Pemeriksaan', 'Bendahara'], ['Validasi', 'Kepala Sekolah'], ['Disetujui', 'Final']];
      let now = 0, bad = -1, all = false;
      if (status === S.DRAFT) now = 0;
      else if (status === S.KE_BEND || status === S.DIPERIKSA) now = 1;
      else if (status === S.REVISI) { bad = 1; now = 1; }
      else if (status === S.KE_KEPSEK) now = 2;
      else if (status === S.SETUJU) all = true;
      else if (status === S.BATAL) { bad = 2; now = 2; }
      return html`<div class="card"><div class="stepper">${steps.map(function (s, i) {
        const cls = all ? 'done' : (i < now ? 'done' : (i === now ? (bad === i ? 'bad' : 'now') : ''));
        const n = (all || i < now) ? '✓' : (bad === i ? '!' : i + 1);
        const lbl = (bad === i && status === S.REVISI) ? 'Perlu Revisi' : (bad === i ? 'Dibatalkan' : s[0]);
        return html`<div class="step ${cls}"><span class="n">${n}</span><div><small>Tahap ${i + 1}</small><b>${lbl}</b></div></div>`;
      })}</div></div>`;
    },
    timeline: function (items, kosong) {
      if (!items || !items.length) return html`<p class="muted small">${kosong || 'Belum ada riwayat.'}</p>`;
      return html`<ul class="tl">${items.map(function (r, i) {
        const bad = r.keputusan === 'Revisi' || r.keputusan === 'Batal';
        const cls = bad ? 'bad' : (i === items.length - 1 ? 'now' : 'done');
        return html`<li class="${cls}"><span class="dot">${UI.ic(bad ? 'priority_high' : 'check', 'ic-sm')}</span>
          <b>${r.tahap} — ${r.keputusan}</b><small>${r.oleh}${r.jabatan ? ' · ' + r.jabatan : ''}<br>${U.tglJam(r.waktu)}</small>${r.catatan ? html`<p class="small" style="margin-top:4px;background:var(--subtle);padding:6px 10px;border-radius:6px">${r.catatan}</p>` : ''}</li>`;
      })}</ul>`;
    },

    // ---------- Grafik SVG ----------
    // Batang berkelompok: rows [{label, v:[a,b,c]}], seri [{nama,warna}]
    chartGroup: function (rows, seri) {
      if (!rows.length) return html`<p class="muted small">Belum ada data.</p>`;
      const W = 560, H = 250, L = 46, B = 40, T = 12, R = 8;
      const max = Math.max.apply(null, rows.map(function (r) { return Math.max.apply(null, r.v); }).concat([1]));
      const nice = (function (m) { const p = Math.pow(10, Math.floor(Math.log10(m))); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; })(max);
      const pw = W - L - R, ph = H - T - B, gw = pw / rows.length, bw = Math.min(28, (gw * 0.7) / seri.length);
      let g = '';
      for (let i = 0; i <= 4; i++) {
        const y = T + ph - (ph * i) / 4, val = (nice * i) / 4;
        g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#e2e8f0"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(U.juta(val).replace('Rp ', '')) + '</text>';
      }
      rows.forEach(function (r, i) {
        const cx = L + gw * i + gw / 2, x0 = cx - (bw * seri.length) / 2;
        r.v.forEach(function (v, k) {
          const h = (v / nice) * ph;
          g += '<rect x="' + (x0 + k * bw) + '" y="' + (T + ph - h) + '" width="' + (bw - 2) + '" height="' + Math.max(h, v > 0 ? 1 : 0) + '" rx="3" fill="' + seri[k].warna + '"><title>' + esc(r.label + ' — ' + seri[k].nama + ': ' + U.rp(v)) + '</title></rect>';
        });
        g += '<text x="' + cx + '" y="' + (H - B + 16) + '" text-anchor="middle">' + esc(r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label) + '</text>';
      });
      return html`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Grafik pagu dan usulan per Waka">${U.raw(g)}</svg>
        <div class="legend">${seri.map(function (s) { return html`<span><i style="background:${s.warna}"></i>${s.nama}</span>`; })}</div>`;
    },
    // Batang horizontal: items [{label, v}]
    chartH: function (items, warna) {
      if (!items.length) return html`<p class="muted small">Belum ada rincian.</p>`;
      const max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
      return html`<div class="stack" style="gap:12px">${items.map(function (i) {
        return html`<div><div class="row between small" style="margin-bottom:4px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.label}">${i.label}</span><b class="mono">${U.juta(i.v)}</b></div>
          <div class="bar"><i style="width:${(i.v / max) * 100}%;background:${warna || 'var(--primary-600)'}"></i></div></div>`;
      })}</div>`;
    }
  };
  window.UI = UI;
})();
