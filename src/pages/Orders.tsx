import React, { useState, useEffect, useCallback } from 'react';
import { getAll as getOrders, create as createOrder, updateStatus as updateOrderStatus, update as updateOrder, trackOrder } from '../lib/services/order-service';
import { getAllDiskon } from '../lib/services/konten-service';
import { getAll as getMenuJasa } from '../lib/services/menu-jasa-service';
import { formatCurrency, formatDate } from '../lib/utils';
import type { OrderRow, OrderStatus, DiskonEventRow, MenuJasaRow } from '../lib/types-supabase';

const ORDER_STATUSES = ['Semua', 'Waiting', 'Checking', 'Proses Repair', 'Proses Cleaning', 'Proses Pengeringan', 'Ready', 'Selesai', 'Batal'] as const;
const TERMINAL_STATUSES = ['Selesai', 'Batal'];

const STATUS_CONFIG: Record<string, { icon: string; cls: string }> = {
  Waiting: { icon: '⏳', cls: 'badge-waiting' },
  Checking: { icon: '🔍', cls: 'badge-waiting' },
  'Proses Repair': { icon: '🔧', cls: 'badge-proses' },
  'Proses Cleaning': { icon: '🧹', cls: 'badge-proses' },
  'Proses Pengeringan': { icon: '💨', cls: 'badge-proses' },
  Ready: { icon: '✅', cls: 'badge-ready' },
  Selesai: { icon: '✅', cls: 'badge-selesai' },
  Batal: { icon: '❌', cls: 'badge-batal' },
};

function isTerminal(status: string): boolean { return TERMINAL_STATUSES.includes(status); }

function getNextStatuses(status: string): { label: string; target: string; variant: string }[] {
  switch (status) {
    case 'Waiting':
      return [
        { label: '▶ Checking', target: 'Checking', variant: 'btn-primary' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Checking':
      return [
        { label: '▶ Proses Repair', target: 'Proses Repair', variant: 'btn-primary' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Proses Repair':
      return [
        { label: '▶ Proses Cleaning', target: 'Proses Cleaning', variant: 'btn-primary' },
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Proses Cleaning':
      return [
        { label: '▶ Proses Pengeringan', target: 'Proses Pengeringan', variant: 'btn-primary' },
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Proses Pengeringan':
      return [
        { label: '▶ Ready', target: 'Ready', variant: 'btn-primary' },
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Ready':
      return [
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    default:
      return [];
  }
}

function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Add order modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addNama, setAddNama] = useState('');
  const [addWa, setAddWa] = useState('');
  const [addLayanan, setAddLayanan] = useState('');
  const [addHarga, setAddHarga] = useState('');
  const [addCatatan, setAddCatatan] = useState('');
  const [addTipeBayar, setAddTipeBayar] = useState('Bayar di Akhir');
  const [addReferral, setAddReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add order discount state
  const [availableDiskon, setAvailableDiskon] = useState<DiskonEventRow[]>([]);
  const [diskonLoading, setDiskonLoading] = useState(false);
  const [addDiskonTipe, setAddDiskonTipe] = useState<'Tanpa' | 'Event' | 'Manual'>('Tanpa');
  const [addDiskonEventId, setAddDiskonEventId] = useState('');
  const [addDiskonNama, setAddDiskonNama] = useState('');
  const [addDiskonNilai, setAddDiskonNilai] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Layanan list
  const [layananList, setLayananList] = useState<MenuJasaRow[]>([]);
  const [layananLoading, setLayananLoading] = useState(false);

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);

  // Edit modal
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editWa, setEditWa] = useState('');
  const [editLayanan, setEditLayanan] = useState('');
  const [editHarga, setEditHarga] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  // Fetch diskon events + layanan when add modal opens
  useEffect(() => {
    if (showAddModal) {
      setDiskonLoading(true);
      setLayananLoading(true);
      getAllDiskon().then((res) => {
        if (res.success) {
          setAvailableDiskon((res.data || []).filter((d) => d.status === 'Aktif'));
        }
      }).finally(() => setDiskonLoading(false));
      getMenuJasa().then((res) => {
        if (res.success) {
          setLayananList(res.data || []);
        }
      }).finally(() => setLayananLoading(false));
    }
  }, [showAddModal]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders();
      if (res.success) {
        setOrders(res.data || []);
      } else {
        setError(res.error || 'Gagal mengambil data pesanan');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengambil data pesanan');
    } finally {
      setLoading(false);
    }
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { fetchOrders(); return; }
    setSearching(true);
    try {
      const res = await trackOrder(q.trim());
      if (res.success && res.data) {
        setOrders(Array.isArray(res.data) ? res.data : [res.data]);
      } else {
        fetchOrders();
      }
    } catch {
      fetchOrders();
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const filteredOrders = filter === 'Semua' ? orders : orders.filter((o) => o.status === filter);

  async function handleStatusUpdate(orderId: string, newStatus: OrderStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui status');
    }
  }

  function handleTambahOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!addNama.trim() || !addWa.trim() || !addLayanan.trim() || !addHarga.trim()) {
      setError('Harap isi Nama, WA, Layanan, dan Harga'); return;
    }

    // Hitung diskon
    let hargaAsli = parseFloat(addHarga) || 0;
    let potonganHarga = 0;
    let diskonTextInfo = '';

    if (addDiskonTipe === 'Event' && addDiskonEventId) {
      const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
      if (ev) {
        diskonTextInfo = ev.nama_event;
        if (ev.tipe === 'Persentase') {
          potonganHarga = Math.round(hargaAsli * (ev.potongan / 100));
          diskonTextInfo += ` (${ev.potongan}%): -${formatCurrency(potonganHarga)}`;
        } else {
          potonganHarga = ev.potongan;
          if (potonganHarga > hargaAsli) potonganHarga = hargaAsli;
          diskonTextInfo += `: -${formatCurrency(potonganHarga)}`;
        }
      }
    } else if (addDiskonTipe === 'Manual') {
      const namaDiskon = addDiskonNama.trim() || 'Diskon Manual';
      const nilaiDiskon = parseFloat(addDiskonNilai) || 0;
      potonganHarga = nilaiDiskon > hargaAsli ? hargaAsli : nilaiDiskon;
      diskonTextInfo = `${namaDiskon}: -${formatCurrency(potonganHarga)}`;
    }

    const hargaFinal = hargaAsli - potonganHarga;

    setSubmitting(true);
    setError(null);
    createOrder({
      nama_pelanggan: addNama.trim(),
      kontak_wa: addWa.trim(),
      layanan: addLayanan.trim(),
      harga: hargaFinal,
      catatan: addCatatan.trim() || null,
      diskon_info: potonganHarga > 0 ? diskonTextInfo : null,
      tipe_pembayaran: addTipeBayar as 'Bayar di Awal' | 'Bayar di Akhir',
      referral: addReferral.trim() || null,
    })
      .then((res) => {
        if (res.success) {
          setAddSuccessMsg(`✓ ${addNama.trim()} berhasil ditambahkan`);
          resetAddForm();
          fetchOrders();
        } else {
          setError(res.error || 'Gagal menambah order');
        }
      })
      .catch((err: any) => setError(err?.message || 'Gagal menambah order'))
      .finally(() => setSubmitting(false));
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAddSuccessMsg('');
  }

  function handleTambahDanTutup(e: React.FormEvent) {
    setSubmitting(true);
    setError(null);
    if (!addNama.trim() || !addWa.trim() || !addLayanan.trim() || !addHarga.trim()) {
      setError('Harap isi Nama, WA, Layanan, dan Harga'); setSubmitting(false); return;
    }
    let hargaAsli = parseFloat(addHarga) || 0;
    let potonganHarga = 0;
    let diskonTextInfo = '';
    if (addDiskonTipe === 'Event' && addDiskonEventId) {
      const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
      if (ev) {
        diskonTextInfo = ev.nama_event;
        if (ev.tipe === 'Persentase') {
          potonganHarga = Math.round(hargaAsli * (ev.potongan / 100));
          diskonTextInfo += ` (${ev.potongan}%): -${formatCurrency(potonganHarga)}`;
        } else {
          potonganHarga = ev.potongan;
          if (potonganHarga > hargaAsli) potonganHarga = hargaAsli;
          diskonTextInfo += `: -${formatCurrency(potonganHarga)}`;
        }
      }
    } else if (addDiskonTipe === 'Manual') {
      const namaDiskon = addDiskonNama.trim() || 'Diskon Manual';
      const nilaiDiskon = parseFloat(addDiskonNilai) || 0;
      potonganHarga = nilaiDiskon > hargaAsli ? hargaAsli : nilaiDiskon;
      diskonTextInfo = `${namaDiskon}: -${formatCurrency(potonganHarga)}`;
    }
    const hargaFinal = hargaAsli - potonganHarga;
    createOrder({
      nama_pelanggan: addNama.trim(),
      kontak_wa: addWa.trim(),
      layanan: addLayanan.trim(),
      harga: hargaFinal,
      catatan: addCatatan.trim() || null,
      diskon_info: potonganHarga > 0 ? diskonTextInfo : null,
      tipe_pembayaran: addTipeBayar as 'Bayar di Awal' | 'Bayar di Akhir',
      referral: addReferral.trim() || null,
    })
      .then((res) => {
        if (res.success) {
          closeAddModal();
          fetchOrders();
        } else {
          setError(res.error || 'Gagal menambah order');
        }
      })
      .catch((err: any) => setError(err?.message || 'Gagal menambah order'))
      .finally(() => setSubmitting(false));
  }

  function resetAddForm() {
    setAddNama(''); setAddWa(''); setAddLayanan(''); setAddHarga('');
    setAddCatatan(''); setAddTipeBayar('Bayar di Akhir'); setAddReferral('');
    setAddDiskonTipe('Tanpa'); setAddDiskonEventId(''); setAddDiskonNama(''); setAddDiskonNilai('');
  }

  function openEdit(order: OrderRow) {
    setEditOrder(order);
    setEditNama(order.nama_pelanggan || '');
    setEditWa(order.kontak_wa || '');
    setEditLayanan(order.layanan || '');
    setEditHarga(String(order.harga ?? ''));
    setEditCatatan(order.catatan || '');
  }

  function closeEdit() { setEditOrder(null); }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder) return;
    if (!editNama.trim() || !editWa.trim() || !editLayanan.trim() || !editHarga.trim()) {
      setError('Harap isi Nama, WA, Layanan, dan Harga'); return;
    }
    setEditSubmitting(true);
    try {
      const res = await updateOrder(editOrder.id, {
        nama_pelanggan: editNama.trim(),
        kontak_wa: editWa.trim(),
        layanan: editLayanan.trim(),
        harga: parseFloat(editHarga) || 0,
        catatan: editCatatan.trim() || null,
      });
      if (res.success) {
        setEditOrder(null);
        await fetchOrders();
      } else {
        setError(res.error || 'Gagal mengupdate order');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengupdate order');
    } finally {
      setEditSubmitting(false);
    }
  }

  function openQRIS() {
    const msg = encodeURIComponent('Saya ingin melakukan pembayaran melalui QRIS. Mohon dikirimkan kode QRIS atau petunjuk pembayaran. Terima kasih.');
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  function renderActionButtons(order: OrderRow) {
    const next = getNextStatuses(order.status);
    if (next.length === 0) return <span className="text-muted">—</span>;
    return (
      <div className="aksi-group">
        {next.map((btn) => (
          <button key={btn.target} className={`btn btn-sm ${btn.variant}`} onClick={() => handleStatusUpdate(order.id, btn.target as OrderStatus)}>
            {btn.label}
          </button>
        ))}
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="admin-main">
        <div className="admin-topbar"><h1>Pesanan</h1></div>
        <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat data pesanan...</p></div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="admin-main">
        <div className="admin-topbar"><h1>Pesanan</h1></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem var(--space-md)', textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchOrders} style={{ marginTop: 'var(--space-sm)' }}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--danger)', fontWeight: 500, marginBottom: 'var(--space-sm)', cursor: 'pointer' }} onClick={() => setError(null)}>{error}</div>}

      <div className="admin-topbar">
        <h1>Pesanan</h1>
        <div className="page-header-actions">
          <input type="text" className="form-control" placeholder="🔍 Cari nama, WA, atau ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ maxWidth: 200 }} />
          <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 160 }}>
            {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <button className="btn btn-outline" onClick={openQRIS}>QRIS</button>
          <button className="btn btn-primary" onClick={() => { resetAddForm(); setShowAddModal(true); }}>+ Tambah Order</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th><th>Tanggal</th><th>Nama</th><th>WA</th><th>Layanan</th><th>Harga</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted">{searching ? 'Mencari...' : 'Tidak ada pesanan'}</td></tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setDetailOrder(order)}>
                  <td>{order.kode || order.id?.slice(0, 8)}</td>
                  <td>{formatDate(order.tanggal || '')}</td>
                  <td>{order.nama_pelanggan}</td>
                  <td>{order.kontak_wa}</td>
                  <td>{order.layanan}</td>
                  <td>{formatCurrency(order.harga ?? 0)}</td>
                  <td><span className={`badge ${STATUS_CONFIG[order.status]?.cls || ''}`}>{STATUS_CONFIG[order.status]?.icon || ''} {order.status}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>{renderActionButtons(order)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="loading-overlay"><div className="loading-spinner" /></div>}

      {/* Tambah Order Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => closeAddModal()}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Order</h3>
              <button className="modal-close" onClick={() => closeAddModal()}>&times;</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleTambahOrder(e); }}>
              <div className="modal-body">
                {addSuccessMsg && (
                  <div style={{ background: '#dcfce7', color: '#166534', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-sm)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{addSuccessMsg}</span>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>👍</span>
                  </div>
                )}
                <div className="form-group"><label>Nama Pelanggan</label><input type="text" className="form-control" value={addNama} onChange={(e) => setAddNama(e.target.value)} required /></div>
                <div className="form-group"><label>Kontak WA</label><input type="text" className="form-control" value={addWa} onChange={(e) => setAddWa(e.target.value)} required /></div>
                <div className="form-group"><label>Layanan</label>
                  {layananLoading ? (
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>Memuat layanan...</p>
                  ) : (
                    <select className="form-control" value={addLayanan} onChange={(e) => {
                      const selected = e.target.value;
                      setAddLayanan(selected);
                      // Auto-fill harga
                      const svc = layananList.find((s) => s.nama_layanan === selected);
                      if (svc) {
                        setAddHarga(String(svc.harga_promo ?? svc.harga));
                      }
                    }} required>
                      <option value="">-- Pilih Layanan --</option>
                      {layananList.filter((s) => s.status === 'Aktif').map((svc) => (
                        <option key={svc.id} value={svc.nama_layanan}>
                          {svc.nama_layanan} — {svc.kategori} ({formatCurrency(svc.harga_promo ?? svc.harga)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group"><label>Harga</label><input type="number" className="form-control" value={addHarga} onChange={(e) => setAddHarga(e.target.value)} min={0} required /></div>

                {/* Diskon Section */}
                <div className="form-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b' }}>Diskon</label>
                  <select className="form-control" value={addDiskonTipe} onChange={(e) => { setAddDiskonTipe(e.target.value as any); setAddDiskonEventId(''); setAddDiskonNama(''); setAddDiskonNilai(''); }}>
                    <option value="Tanpa">Tanpa Diskon</option>
                    <option value="Event">Event Diskon</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                {addDiskonTipe === 'Event' && (
                  <div className="form-group">
                    <label>Pilih Event</label>
                    {diskonLoading ? (
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>Memuat event diskon...</p>
                    ) : availableDiskon.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tidak ada event diskon aktif</p>
                    ) : (
                      <select className="form-control" value={addDiskonEventId} onChange={(e) => setAddDiskonEventId(e.target.value)}>
                        <option value="">-- Pilih Event Promo --</option>
                        {availableDiskon.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.nama_event} ({ev.tipe === 'Persentase' ? `${ev.potongan}%` : `Rp${ev.potongan.toLocaleString('id-ID')}`})
                            {ev.target_layanan ? ` — ${ev.target_layanan}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {addDiskonTipe === 'Manual' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 'var(--space-xs)' }}>
                      <label>Nama Diskon</label>
                      <input type="text" className="form-control" value={addDiskonNama} onChange={(e) => setAddDiskonNama(e.target.value)} placeholder="Cth: Relasi, Karyawan" />
                    </div>
                    <div className="form-group">
                      <label>Nilai Potongan (Rp)</label>
                      <input type="number" className="form-control" value={addDiskonNilai} onChange={(e) => setAddDiskonNilai(e.target.value)} min={0} placeholder="0" />
                    </div>
                  </>
                )}

                {/* Ringkasan Harga Setelah Diskon */}
                {(addDiskonTipe !== 'Tanpa') && (
                  <div style={{ background: '#f8fafc', padding: 'var(--space-sm)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Harga Asli</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(parseFloat(addHarga) || 0)}</span>
                    </div>
                    {(() => {
                      const hargaAsli = parseFloat(addHarga) || 0;
                      let pot = 0;
                      let lbl = '';
                      if (addDiskonTipe === 'Event' && addDiskonEventId) {
                        const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
                        if (ev) {
                          if (ev.tipe === 'Persentase') { pot = Math.round(hargaAsli * (ev.potongan / 100)); }
                          else { pot = ev.potongan; if (pot > hargaAsli) pot = hargaAsli; }
                          lbl = ev.nama_event;
                        }
                      } else if (addDiskonTipe === 'Manual') {
                        pot = parseFloat(addDiskonNilai) || 0;
                        if (pot > hargaAsli) pot = hargaAsli;
                        lbl = addDiskonNama.trim() || 'Diskon Manual';
                      }
                      const final = hargaAsli - pot;
                      return (
                        <>
                          {pot > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#16a34a' }}>
                              <span>Potongan {lbl ? `(${lbl})` : ''}</span>
                              <span style={{ fontWeight: 600 }}>-{formatCurrency(pot)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Total Akhir</span>
                            <span style={{ color: '#16a34a' }}>{formatCurrency(final)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="form-group"><label>Catatan</label><textarea className="form-control" value={addCatatan} onChange={(e) => setAddCatatan(e.target.value)} rows={2} /></div>
                <div className="form-group"><label>Tipe Pembayaran</label>
                  <select className="form-control" value={addTipeBayar} onChange={(e) => setAddTipeBayar(e.target.value)}>
                    <option value="Bayar di Awal">Bayar di Awal</option>
                    <option value="Bayar di Akhir">Bayar di Akhir</option>
                  </select>
                </div>
                <div className="form-group"><label>Referral Code (opsional)</label><input type="text" className="form-control" value={addReferral} onChange={(e) => setAddReferral(e.target.value)} /></div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-white" onClick={() => closeAddModal()} disabled={submitting}>Tutup</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Tambah Lagi'}</button>
                <button type="button" className="btn btn-success" onClick={handleTambahDanTutup} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan & Tutup'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Order — {detailOrder.kode || detailOrder.id?.slice(0, 8)}</h3>
              <button className="modal-close" onClick={() => setDetailOrder(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <table className="detail-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <DetailRow label="Kode" value={detailOrder.kode || detailOrder.id} />
                  <DetailRow label="Tanggal" value={formatDate(detailOrder.tanggal || '')} />
                  <DetailRow label="Nama Pelanggan" value={detailOrder.nama_pelanggan} />
                  <DetailRow label="Kontak WA" value={detailOrder.kontak_wa} />
                  <DetailRow label="Layanan" value={detailOrder.layanan} />
                  <DetailRow label="Harga" value={formatCurrency(detailOrder.harga ?? 0)} />
                  <DetailRow label="Status" value={<span className={`badge ${STATUS_CONFIG[detailOrder.status]?.cls || ''}`}>{STATUS_CONFIG[detailOrder.status]?.icon || ''} {detailOrder.status}</span>} />
                  <DetailRow label="Catatan" value={detailOrder.catatan || '-'} />
                  <DetailRow label="Diskon Info" value={detailOrder.diskon_info || '-'} />
                  <DetailRow label="Referral" value={detailOrder.referral || '-'} />
                  <DetailRow label="Tipe Pembayaran" value={detailOrder.tipe_pembayaran || '-'} />
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-white" onClick={() => setDetailOrder(null)}>Tutup</button>
              {!isTerminal(detailOrder.status) && (
                <button className="btn btn-primary" onClick={() => { openEdit(detailOrder); setDetailOrder(null); }}>✏️ Edit</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Order — {editOrder.kode || editOrder.id?.slice(0, 8)}</h3>
              <button className="modal-close" onClick={closeEdit}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Nama Pelanggan</label><input type="text" className="form-control" value={editNama} onChange={(e) => setEditNama(e.target.value)} required /></div>
                <div className="form-group"><label>Kontak WA</label><input type="text" className="form-control" value={editWa} onChange={(e) => setEditWa(e.target.value)} required /></div>
                <div className="form-group"><label>Layanan</label><input type="text" className="form-control" value={editLayanan} onChange={(e) => setEditLayanan(e.target.value)} required /></div>
                <div className="form-group"><label>Harga</label><input type="number" className="form-control" value={editHarga} onChange={(e) => setEditHarga(e.target.value)} min={0} required /></div>
                <div className="form-group"><label>Catatan</label><textarea className="form-control" value={editCatatan} onChange={(e) => setEditCatatan(e.target.value)} rows={3} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={closeEdit} disabled={editSubmitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>{editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', width: '35%' }}>{label}</td>
      <td style={{ padding: '10px 12px', color: '#1e293b' }}>{value}</td>
    </tr>
  );
}

export default Orders;
