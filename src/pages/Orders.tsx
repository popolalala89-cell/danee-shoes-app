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
  const [addCatatan, setAddCatatan] = useState('');
  const [addTipeBayar, setAddTipeBayar] = useState('Bayar di Akhir');
  const [addReferral, setAddReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add order — cart system (multiple items per order, like AppScript)
  interface CartItem { nama: string; harga: number; qty: number; }
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartInputLayanan, setCartInputLayanan] = useState('');
  const [cartInputHarga, setCartInputHarga] = useState('');

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

  // ── Cart functions (seperti AppScript) ──

  function addToCart() {
    if (!cartInputLayanan.trim() || !cartInputHarga.trim()) {
      setError('Pilih layanan terlebih dahulu'); return;
    }
    const harga = parseFloat(cartInputHarga);
    if (!harga || harga <= 0) { setError('Harga tidak valid'); return; }

    setCartItems(prev => {
      const exist = prev.find(x => x.nama === cartInputLayanan && x.harga === harga);
      if (exist) {
        return prev.map(x =>
          x.nama === cartInputLayanan && x.harga === harga
            ? { ...x, qty: x.qty + 1 }
            : x
        );
      }
      return [...prev, { nama: cartInputLayanan, harga, qty: 1 }];
    });
    // Reset cart input
    setCartInputLayanan('');
    setCartInputHarga('');
    setError(null);
  }

  function removeFromCart(idx: number) {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  }

  function getSubtotal(): number {
    return cartItems.reduce((sum, item) => sum + item.harga * item.qty, 0);
  }

  function buildLayananText(): string {
    return cartItems.map(item =>
      `${item.nama} (${item.qty}x) @ ${formatCurrency(item.harga)}`
    ).join(', ');
  }

  // ── End cart functions ──

  function handleTambahOrder(e: React.FormEvent, closeAfterSave: boolean = false) {
    e.preventDefault();
    if (!addNama.trim() || !addWa.trim()) {
      setError('Harap isi Nama dan WA'); return;
    }
    if (cartItems.length === 0) {
      setError('Belum ada item pesanan. Tambah layanan ke keranjang.'); return;
    }

    const subtotal = getSubtotal();
    let potonganHarga = 0;
    let diskonTextInfo = '';

    if (addDiskonTipe === 'Event' && addDiskonEventId) {
      const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
      if (ev) {
        diskonTextInfo = ev.nama_event;
        if (ev.tipe === 'Persentase') {
          potonganHarga = Math.round(subtotal * (ev.potongan / 100));
          diskonTextInfo += ` (${ev.potongan}%): -${formatCurrency(potonganHarga)}`;
        } else {
          potonganHarga = ev.potongan;
          if (potonganHarga > subtotal) potonganHarga = subtotal;
          diskonTextInfo += `: -${formatCurrency(potonganHarga)}`;
        }
      }
    } else if (addDiskonTipe === 'Manual') {
      const namaDiskon = addDiskonNama.trim() || 'Diskon Manual';
      const nilaiDiskon = parseFloat(addDiskonNilai) || 0;
      potonganHarga = nilaiDiskon > subtotal ? subtotal : nilaiDiskon;
      diskonTextInfo = `${namaDiskon}: -${formatCurrency(potonganHarga)}`;
    }

    const hargaFinal = subtotal - potonganHarga;
    const layananText = buildLayananText();

    setSubmitting(true);
    setError(null);
    createOrder({
      nama_pelanggan: addNama.trim(),
      kontak_wa: addWa.trim(),
      layanan: layananText,
      harga: hargaFinal,
      catatan: addCatatan.trim() || null,
      diskon_info: potonganHarga > 0 ? diskonTextInfo : null,
      tipe_pembayaran: addTipeBayar as 'Bayar di Awal' | 'Bayar di Akhir',
      referral: addReferral.trim() || null,
    })
      .then((res) => {
        if (res.success) {
          setAddSuccessMsg(`✓ Order berhasil dibuat untuk ${addNama.trim()} — ${cartItems.length} item`);
          if (closeAfterSave) {
            closeAddModal();
          } else {
            // Reset form but keep modal open (Tambah Lagi)
            setAddNama(''); setAddWa(''); setAddCatatan(''); setAddTipeBayar('Bayar di Akhir');
            setAddReferral(''); setAddDiskonTipe('Tanpa'); setAddDiskonEventId('');
            setAddDiskonNama(''); setAddDiskonNilai(''); setCartItems([]);
            setCartInputLayanan(''); setCartInputHarga('');
          }
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
    handleTambahOrder(e, true);
  }

  function resetAddForm() {
    setAddNama(''); setAddWa(''); setAddCatatan('');
    setAddTipeBayar('Bayar di Akhir'); setAddReferral('');
    setAddDiskonTipe('Tanpa'); setAddDiskonEventId('');
    setAddDiskonNama(''); setAddDiskonNilai('');
    setCartItems([]); setCartInputLayanan(''); setCartInputHarga('');
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
        <div className="loading-overlay"><div className="loading-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Pesanan</h1>
        <div className="admin-topbar-actions">
          <input type="text" className="form-control" placeholder="Cari kode/nama/wa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 180 }} />
          <button className="btn btn-success" onClick={openQRIS} title="QRIS Payment">💳 QRIS</button>
          <button className="btn btn-primary" onClick={() => { resetAddForm(); setShowAddModal(true); }}>+ Tambah Order</button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <span>{error}</span>
          <button className="btn btn-sm btn-white" onClick={() => setError(null)} style={{ marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
        {ORDER_STATUSES.map((s) => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-white'}`} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {searching && <div className="loading-overlay"><div className="loading-spinner" /></div>}

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>Tidak ada pesanan.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredOrders.map((order) => (
            <div key={order.id} className="card order-card" onClick={() => setDetailOrder(order)}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>{order.kode || order.id?.slice(0, 8)}</strong>
                <span className={`badge ${STATUS_CONFIG[order.status]?.cls || ''}`}>
                  {STATUS_CONFIG[order.status]?.icon || ''} {order.status}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                <div><strong>{order.nama_pelanggan}</strong> — {order.kontak_wa}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{order.layanan}</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>{formatCurrency(order.harga ?? 0)}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(order.tanggal || '')}</div>
              </div>
              <div className="card-actions" onClick={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
                {renderActionButtons(order)}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="loading-overlay"><div className="loading-spinner" /></div>}

      {/* ─── Tambah Order Modal (Cart-based, seperti AppScript) ─── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => closeAddModal()}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Tambah Order</h3>
              <button className="modal-close" onClick={() => closeAddModal()}>&times;</button>
            </div>
            <form onSubmit={(e) => handleTambahOrder(e, false)}>
              <div className="modal-body">
                {addSuccessMsg && (
                  <div style={{ background: '#dcfce7', color: '#166534', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-sm)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{addSuccessMsg}</span>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>👍</span>
                  </div>
                )}

                {/* Data Pelanggan */}
                <div className="form-group"><label>Nama Pelanggan</label><input type="text" className="form-control" value={addNama} onChange={(e) => setAddNama(e.target.value)} required /></div>
                <div className="form-group"><label>Kontak WA</label><input type="text" className="form-control" value={addWa} onChange={(e) => setAddWa(e.target.value)} required /></div>

                {/* ── Cart: Tambah Item ── */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 'var(--space-xs)' }}>
                    🛒 Item Pesanan
                  </label>

                  {/* Input: pilih layanan + tambah ke keranjang */}
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      {layananLoading ? (
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Memuat layanan...</p>
                      ) : (
                        <select className="form-control" value={cartInputLayanan} onChange={(e) => {
                          const selected = e.target.value;
                          setCartInputLayanan(selected);
                          const svc = layananList.find((s) => s.nama_layanan === selected);
                          if (svc) {
                            setCartInputHarga(String(svc.harga_promo ?? svc.harga));
                          } else {
                            setCartInputHarga('');
                          }
                        }}>
                          <option value="">-- Pilih Layanan --</option>
                          {layananList.filter((s) => s.status === 'Aktif').map((svc) => (
                            <option key={svc.id} value={svc.nama_layanan}>
                              {svc.nama_layanan} — {svc.kategori} ({formatCurrency(svc.harga_promo ?? svc.harga)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div style={{ width: 120 }}>
                      <input type="number" className="form-control" value={cartInputHarga} onChange={(e) => setCartInputHarga(e.target.value)} min={0} placeholder="Harga" />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={addToCart} disabled={!cartInputLayanan.trim() || !cartInputHarga.trim()}>
                      + Tambah
                    </button>
                  </div>

                  {/* Daftar item di keranjang */}
                  <div style={{ marginTop: 'var(--space-sm)', maxHeight: 200, overflowY: 'auto' }}>
                    {cartItems.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>
                        Belum ada item. Pilih layanan di atas lalu klik "Tambah".
                      </p>
                    ) : (
                      <>
                        {cartItems.map((item, idx) => (
                          <div key={idx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc', padding: '6px 10px', borderRadius: 'var(--radius)',
                            marginBottom: 4, border: '1px solid #e2e8f0', fontSize: '0.85rem'
                          }}>
                            <div>
                              <strong>{item.nama}</strong> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>x{item.qty}</span>
                              <br /><span className="text-muted">{formatCurrency(item.harga)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong>{formatCurrency(item.harga * item.qty)}</strong>
                              <button type="button" onClick={() => removeFromCart(idx)} style={{
                                background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '2px 6px'
                              }} title="Hapus">&times;</button>
                            </div>
                          </div>
                        ))}
                        {/* Subtotal keranjang */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 10px', borderTop: '2px solid #e2e8f0', marginTop: 4, fontWeight: 700
                        }}>
                          <span>Subtotal ({cartItems.reduce((s, i) => s + i.qty, 0)} item)</span>
                          <span>{formatCurrency(getSubtotal())}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Diskon Section (global untuk seluruh order) */}
                <div className="form-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b' }}>Diskon (Order)</label>
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
                <div style={{ background: '#f8fafc', padding: 'var(--space-sm)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(getSubtotal())}</span>
                  </div>
                  {(addDiskonTipe !== 'Tanpa') && (() => {
                    const subtotal = getSubtotal();
                    let pot = 0;
                    let lbl = '';
                    if (addDiskonTipe === 'Event' && addDiskonEventId) {
                      const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
                      if (ev) {
                        if (ev.tipe === 'Persentase') { pot = Math.round(subtotal * (ev.potongan / 100)); }
                        else { pot = ev.potongan; if (pot > subtotal) pot = subtotal; }
                        lbl = ev.nama_event;
                      }
                    } else if (addDiskonTipe === 'Manual') {
                      pot = parseFloat(addDiskonNilai) || 0;
                      if (pot > subtotal) pot = subtotal;
                      lbl = addDiskonNama.trim() || 'Diskon Manual';
                    }
                    const final = subtotal - pot;
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
                <button type="submit" className="btn btn-primary" disabled={submitting || cartItems.length === 0}>
                  {submitting ? 'Menyimpan...' : 'Tambah Lagi'}
                </button>
                <button type="button" className="btn btn-success" onClick={handleTambahDanTutup} disabled={submitting || cartItems.length === 0}>
                  {submitting ? 'Menyimpan...' : 'Simpan & Tutup'}
                </button>
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
