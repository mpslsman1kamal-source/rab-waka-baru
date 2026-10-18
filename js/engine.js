/* engine.js — sesi RAB bersama: state lokal, perhitungan identik server, antrean simpan serial (UI optimistis) */
(function () {
  'use strict';

  const r2 = function (x) { return Math.round(x * 100) / 100; };

  function Session(id) {
    this.id = id;
    this.data = null;
    this.q = [];
    this.running = false;
    this.state = 'idle'; // idle | saving | err
    this.subs = [];
    this.lastError = '';
  }

  Session.prototype = {
    subscribe: function (fn) { const s = this; s.subs.push(fn); return function () { s.subs = s.subs.filter(function (x) { return x !== fn; }); }; },
    emit: function (evt, payload) { this.subs.slice().forEach(function (fn) { try { fn(evt, payload); } catch (e) { console.error(e); } }); },
    pending: function () { return this.q.length + (this.running ? 1 : 0); },

    // Muat dari server. Dilewati bila masih ada simpanan tertunda (agar tidak menimpa perubahan lokal).
    load: function (force) {
      const s = this;
      if (!force && s.pending() > 0) return Promise.resolve(s.data);
      return Api.call('rab.get', { id_rab: s.id }).then(function (d) {
        if (!force && s.pending() > 0) return s.data;
        s.data = d; s.emit('load'); return d;
      });
    },

    // ---------- Perhitungan ----------
    total: function () { return this.data.detail.reduce(function (a, d) { return a + Number(d.nilai_bosp || 0); }, 0); },
    paguView: function () {
      const p = this.data.pagu, total = this.total();
      const sisa = p.pagu - p.terpakai_lain - total;
      return Object.assign({}, p, {
        total: total, sisa: sisa, rasio: p.pagu > 0 ? Math.round(((p.terpakai_lain + total) / p.pagu) * 10000) / 100 : 0,
        lebih: p.pagu > 0 && sisa < 0, tahunan_lebih: p.pagu_tahunan > 0 && (p.terpakai_tahunan_lain + total) > p.pagu_tahunan
      });
    },
    kegTotal: function (idKeg) { return this.data.detail.filter(function (d) { return d.id_kegiatan === idKeg; }).reduce(function (a, d) { return a + Number(d.nilai_bosp || 0); }, 0); },
    detailsOf: function (idKeg) { return this.data.detail.filter(function (d) { return d.id_kegiatan === idKeg; }); },
    findDetail: function (id) { return this.data.detail.filter(function (d) { return d.id_detail === id; })[0]; },
    counts: function () {
      const c = { Menunggu: 0, Setuju: 0, Revisi: 0 };
      this.data.detail.forEach(function (d) { c[d.status_item] = (c[d.status_item] || 0) + 1; });
      return c;
    },

    // ---------- Antrean ----------
    enqueue: function (key, run) {
      const s = this;
      if (key) { for (let i = 0; i < s.q.length; i++) if (s.q[i].key === key) { s.q[i].run = run; return; } }
      s.q.push({ key: key, run: run });
      s.state = 'saving'; s.emit('state');
      if (!s.running) s.pump();
    },
    pump: function () {
      const s = this;
      if (s.running) return;
      const it = s.q.shift();
      if (!it) { if (s.state !== 'err') { s.state = 'idle'; s.emit('state'); } s.flushWaiters(); return; }
      s.running = true;
      it.run().then(function () { s.running = false; s.pump(); }, function (e) {
        s.running = false; s.q = [];
        s.state = 'err'; s.lastError = e.message; s.emit('state');
        s.emit('error', e);
        // Pulihkan dari server agar tampilan sama dengan data tersimpan
        s.load(true).then(function () { s.state = 'idle'; s.emit('state'); s.emit('resync', e.message); s.flushWaiters(); }, function () { s.flushWaiters(); });
      });
    },
    waiters: [],
    flush: function () {
      const s = this;
      if (!s.pending()) return Promise.resolve(s.state !== 'err');
      return new Promise(function (res) { s.waiters.push(res); });
    },
    flushWaiters: function () { const w = this.waiters; this.waiters = []; const ok = this.state !== 'err'; w.forEach(function (f) { f(ok); }); },

    // ---------- Kegiatan ----------
    addKegiatan: function (nama, deskripsi) {
      const s = this;
      nama = String(nama || '').trim();
      if (nama.length < 3) return { ok: false, msg: 'Nama kegiatan minimal 3 karakter.' };
      const urut = s.data.kegiatan.reduce(function (a, k) { return Math.max(a, Number(k.urutan)); }, 0) + 1;
      const k = { id_kegiatan: U.uid('keg'), id_rab: s.id, kode: ('0' + urut).slice(-2), nama: nama, deskripsi: String(deskripsi || '').trim(), urutan: urut };
      s.data.kegiatan.push(k); s.emit('change');
      s.enqueue('', function () { return Api.call('kegiatan.save', { id_rab: s.id, id_kegiatan: k.id_kegiatan, nama: k.nama, deskripsi: k.deskripsi }); });
      return { ok: true, kegiatan: k };
    },
    updateKegiatan: function (id, nama, deskripsi) {
      const s = this, k = s.data.kegiatan.filter(function (x) { return x.id_kegiatan === id; })[0];
      if (!k) return { ok: false, msg: 'Kegiatan tidak ditemukan.' };
      nama = String(nama || '').trim();
      if (nama.length < 3) return { ok: false, msg: 'Nama kegiatan minimal 3 karakter.' };
      k.nama = nama; k.deskripsi = String(deskripsi || '').trim(); s.emit('change');
      s.enqueue('keg:' + id, function () { return Api.call('kegiatan.save', { id_rab: s.id, id_kegiatan: id, nama: k.nama, deskripsi: k.deskripsi }); });
      return { ok: true };
    },
    deleteKegiatan: function (id) {
      const s = this;
      const ids = s.data.detail.filter(function (d) { return d.id_kegiatan === id; }).map(function (d) { return d.id_detail; });
      s.data.detail = s.data.detail.filter(function (d) { return d.id_kegiatan !== id; });
      s.data.kegiatan = s.data.kegiatan.filter(function (k) { return k.id_kegiatan !== id; });
      s.data.berkas.forEach(function (b) { if (ids.indexOf(b.id_detail) >= 0) b.id_detail = ''; });
      s.data.rab.total = s.total(); s.emit('change');
      s.enqueue('', function () { return Api.call('kegiatan.delete', { id_rab: s.id, id_kegiatan: id }); });
    },

    // ---------- Rincian ----------
    // inp: {id_detail?, id_kegiatan, id_item, uraian, volume, frekuensi, sudah_didanai_lain(bool), kebutuhan_riil(bool), tanggapan_waka}
    saveDetail: function (inp) {
      const s = this;
      const item = App.state.items.filter(function (i) { return i.id_item === inp.id_item; })[0];
      if (!item) return { ok: false, msg: 'Pilih item dari katalog standar harga.' };
      const vol = Number(inp.volume), frek = Number(inp.frekuensi);
      if (!isFinite(vol) || vol <= 0) return { ok: false, msg: 'Volume harus lebih dari 0.' };
      if (!isFinite(frek) || frek <= 0) return { ok: false, msg: 'Frekuensi harus lebih dari 0.' };
      const cur = inp.id_detail ? s.findDetail(inp.id_detail) : null;
      const id = cur ? cur.id_detail : U.uid('det');
      const v2 = r2(vol), f2 = r2(frek);
      const harga = (cur && cur.id_item === item.id_item) ? Number(cur.harga_satuan) : Number(item.harga);
      const subtotal = Math.round(v2 * f2 * harga);
      const didanai = !!inp.sudah_didanai_lain, riil = !!inp.kebutuhan_riil;
      const rec = {
        id_detail: id, id_rab: s.id, id_kegiatan: inp.id_kegiatan, id_item: item.id_item, kode_item: item.kode, nama_item: item.nama_item,
        uraian: String(inp.uraian || '').trim().slice(0, 500), volume: v2, frekuensi: f2, satuan: item.satuan, harga_satuan: harga, subtotal: subtotal,
        sumber_dana: didanai ? 'Non-BOSP (APBD/Pusat)' : s.data.rab.sumber_dana, sudah_didanai_lain: didanai ? 'Ya' : 'Tidak',
        kebutuhan_riil: riil ? 'Ya' : 'Tidak', nilai_bosp: didanai ? 0 : subtotal, tanggapan_waka: String(inp.tanggapan_waka || '').trim().slice(0, 600)
      };
      if (cur) {
        const berubah = cur.id_item !== rec.id_item || cur.volume !== rec.volume || cur.frekuensi !== rec.frekuensi ||
          cur.sudah_didanai_lain !== rec.sudah_didanai_lain || cur.uraian !== rec.uraian || cur.id_kegiatan !== rec.id_kegiatan;
        const tanggapBaru = rec.tanggapan_waka !== (cur.tanggapan_waka || '');
        rec.status_item = cur.status_item; rec.catatan_bendahara = cur.catatan_bendahara; rec.urutan = cur.urutan;
        if (cur.status_item === 'Revisi' && (berubah || tanggapBaru)) rec.status_item = 'Menunggu';
        else if (cur.status_item === 'Setuju' && berubah) rec.status_item = 'Menunggu';
        Object.assign(cur, rec);
      } else {
        rec.status_item = 'Menunggu'; rec.catatan_bendahara = '';
        rec.urutan = s.data.detail.reduce(function (a, d) { return Math.max(a, Number(d.urutan)); }, 0) + 1;
        s.data.detail.push(rec);
      }
      s.data.rab.total = s.total(); s.emit('change');
      const payload = {
        id_rab: s.id, id_detail: id, id_kegiatan: rec.id_kegiatan, id_item: rec.id_item, uraian: rec.uraian, volume: rec.volume, frekuensi: rec.frekuensi,
        sudah_didanai_lain: rec.sudah_didanai_lain, kebutuhan_riil: rec.kebutuhan_riil, tanggapan_waka: rec.tanggapan_waka
      };
      s.enqueue('det:' + id, function () {
        return Api.call('detail.save', payload).then(function (r) {
          const row = s.findDetail(id);
          if (row && !s.q.some(function (i) { return i.key === 'det:' + id; })) {
            ['harga_satuan', 'subtotal', 'nilai_bosp', 'status_item', 'urutan', 'kode_item', 'nama_item', 'satuan', 'sumber_dana'].forEach(function (k) { if (r.detail[k] !== undefined) row[k] = r.detail[k]; });
            s.data.rab.total = s.total(); s.emit('change');
          }
        });
      });
      return { ok: true, detail: rec, baru: !cur };
    },
    deleteDetail: function (id) {
      const s = this;
      s.data.detail = s.data.detail.filter(function (d) { return d.id_detail !== id; });
      s.data.berkas.forEach(function (b) { if (b.id_detail === id) b.id_detail = ''; });
      s.data.rab.total = s.total(); s.emit('change');
      // Batalkan simpanan tertunda untuk baris ini agar tidak "menghidupkan" kembali
      s.q = s.q.filter(function (i) { return i.key !== 'det:' + id; });
      s.enqueue('', function () { return Api.call('detail.delete', { id_rab: s.id, id_detail: id }).catch(function (e) { if (e.code === 'NOT_FOUND') return null; throw e; }); });
    }
  };

  const Engine = {
    sessions: {},
    get: function (id) { return Engine.sessions[id] || (Engine.sessions[id] = new Session(id)); },
    drop: function (id) { delete Engine.sessions[id]; },
    reset: function () { Engine.sessions = {}; },
    pendingTotal: function () { return Object.keys(Engine.sessions).reduce(function (a, k) { return a + Engine.sessions[k].pending(); }, 0); }
  };
  window.Engine = Engine;
  window.addEventListener('beforeunload', function (e) { if (Engine.pendingTotal() > 0) { e.preventDefault(); e.returnValue = ''; } });
})();
