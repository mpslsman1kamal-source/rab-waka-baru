/* util.js — fungsi bantu: escape HTML, format angka/tanggal, terbilang, penyimpanan aman */
(function () {
  'use strict';

  // ---------- Template HTML dengan auto-escape ----------
  function Raw(s) { this.s = s; }
  Raw.prototype.toString = function () { return this.s; };
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function part(v) {
    if (v === undefined || v === null || v === false) return '';
    if (v instanceof Raw) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    return esc(v);
  }
  // html`<b>${nama}</b>` → Raw (nilai disisipkan otomatis di-escape; Raw/array Raw dipertahankan)
  function html(strings) {
    let out = strings[0];
    for (let i = 1; i < arguments.length; i++) out += part(arguments[i]) + strings[i];
    return new Raw(out);
  }
  function raw(s) { return new Raw(s); }

  // ---------- Format ----------
  function n(v) { return Math.round(Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(v) { const x = Math.round(Number(v) || 0); return (x < 0 ? '-Rp ' : 'Rp ') + n(Math.abs(x)); }
  function dec(v, d) {
    const x = Number(v) || 0;
    return x.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d === undefined ? 2 : d });
  }
  function juta(v) {
    const x = Number(v) || 0;
    if (Math.abs(x) >= 1e9) return 'Rp ' + dec(x / 1e9, 2) + ' M';
    if (Math.abs(x) >= 1e6) return 'Rp ' + dec(x / 1e6, 1) + ' jt';
    return rp(x);
  }
  // "1.234,5" / "1234.5" / "1 234" → angka
  function parseNum(s) {
    if (typeof s === 'number') return s;
    s = String(s === undefined || s === null ? '' : s).trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', '');
    return Number(s);
  }
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  // Masukan: 'yyyy-MM-dd HH:mm:ss' (dari server)
  function tgl(s, panjang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return s ? String(s) : '-';
    return Number(m[3]) + ' ' + (panjang ? BULAN_PANJANG : BULAN)[Number(m[2]) - 1] + ' ' + m[1];
  }
  function jam(s) { const m = /(\d{2}:\d{2})/.exec(String(s || '')); return m ? m[1] : ''; }
  function tglJam(s) { return s ? tgl(s) + (jam(s) ? ', ' + jam(s) : '') : '-'; }
  function ukuran(b) { b = Number(b) || 0; return b >= 1048576 ? dec(b / 1048576, 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  function terbilang(num) {
    num = Math.floor(Math.abs(Number(num) || 0));
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    function t(x) {
      if (x < 12) return s[x];
      if (x < 20) return t(x - 10) + ' belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '');
      if (x < 200) return 'seratus' + (x - 100 ? ' ' + t(x - 100) : '');
      if (x < 1000) return t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '');
      if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + t(x - 1000) : '');
      if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta' + (x % 1e6 ? ' ' + t(x % 1e6) : '');
      if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar' + (x % 1e9 ? ' ' + t(x % 1e9) : '');
      return t(Math.floor(x / 1e12)) + ' triliun' + (x % 1e12 ? ' ' + t(x % 1e12) : '');
    }
    const r = num === 0 ? 'nol rupiah' : t(num) + ' rupiah';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  // ---------- Status ----------
  const ST = {
    DRAFT: 'Draft', KE_BEND: 'Diajukan ke Bendahara', REVISI: 'Perlu Revisi', DIPERIKSA: 'Diperiksa Bendahara',
    KE_KEPSEK: 'Diajukan ke Kepsek', SETUJU: 'Disetujui', BATAL: 'Dibatalkan'
  };
  const ST_CLASS = {};
  ST_CLASS[ST.DRAFT] = 'b-draft'; ST_CLASS[ST.KE_BEND] = 'b-sub'; ST_CLASS[ST.REVISI] = 'b-rev'; ST_CLASS[ST.DIPERIKSA] = 'b-chk';
  ST_CLASS[ST.KE_KEPSEK] = 'b-wait'; ST_CLASS[ST.SETUJU] = 'b-ok'; ST_CLASS[ST.BATAL] = 'b-cancel';
  function badge(status) { return html`<span class="badge ${ST_CLASS[status] || 'b-draft'}">${status || '-'}</span>`; }
  const ROLE = { KEPSEK: 'Kepala Sekolah', BEND: 'Bendahara', WAKA: 'Waka', ADMIN: 'Admin', STAF: 'Staf' };
  const SNP = ['Standar Isi', 'Standar Proses', 'Standar Kompetensi Lulusan', 'Standar Pendidik dan Tenaga Kependidikan', 'Standar Sarana dan Prasarana', 'Standar Pengelolaan', 'Standar Pembiayaan', 'Standar Penilaian Pendidikan'];

  // ---------- Lain-lain ----------
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 250); }; }
  function uid(prefix) {
    let r = '';
    const cs = 'abcdefghijklmnopqrstuvwxyz0123456789';
    if (window.crypto && crypto.getRandomValues) { const a = new Uint8Array(12); crypto.getRandomValues(a); a.forEach(function (x) { r += cs[x % 36]; }); }
    else for (let i = 0; i < 12; i++) r += cs[Math.floor(Math.random() * 36)];
    return prefix + '_' + r;
  }
  function initials(nama) { return String(nama || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // localStorage aman (bisa gagal di mode privat)
  const store = {
    get: function (k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
    clearPrefix: function (p) { try { Object.keys(localStorage).filter(function (k) { return k.indexOf(p) === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} }
  };

  function fileToB64(file) {
    return new Promise(function (res, rej) {
      const r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { rej(new Error('Gagal membaca berkas.')); };
      r.readAsDataURL(file);
    });
  }
  function b64ToBlob(b64, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime || 'application/octet-stream' });
  }
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function csvEscape(v) { v = String(v === undefined || v === null ? '' : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCsv(rows) { return '﻿' + rows.map(function (r) { return r.map(csvEscape).join(','); }).join('\r\n'); }
  // Parser CSV sederhana (koma atau titik koma, tanda kutip ganda)
  function parseCsv(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row);
    return rows;
  }
  function plural0(v) { return v === undefined || v === null ? 0 : v; }

  window.U = {
    Raw: Raw, esc: esc, html: html, raw: raw, n: n, rp: rp, dec: dec, juta: juta, parseNum: parseNum, tgl: tgl, jam: jam, tglJam: tglJam,
    ukuran: ukuran, terbilang: terbilang, ST: ST, ST_CLASS: ST_CLASS, badge: badge, ROLE: ROLE, SNP: SNP, BULAN_PANJANG: BULAN_PANJANG,
    debounce: debounce, uid: uid, initials: initials, $: $, $$: $$, store: store, fileToB64: fileToB64, b64ToBlob: b64ToBlob,
    saveBlob: saveBlob, toCsv: toCsv, parseCsv: parseCsv, plural0: plural0
  };
})();
