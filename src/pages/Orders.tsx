import React, { useState, useEffect, useCallback } from 'react';
import {
  getOrders,
  addOrder,
  updateOrderStatus,
  updateOrder,
  trackOrder,
} from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Order } from '../lib/types';

// ─── Constants ──────────────────────────────────────────────────
const ORDER_STATUSES = [
  'Semua',
  'Waiting',
  'Checking',
  'Proses Repair',
  'Proses Cleaning',
  'Proses Pengeringan',
  'Ready',
  'Selesai',
  'Batal',
] as const;

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

function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// Status transition map: which statuses can advance to which
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

// ─── Main Component ─────────────────────────────────────────────
export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Semua');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Add order modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formNama, setFormNama] = useState('');
  const [formWa, setFormWa] = useState('');
  const [formLayanan, setFormLayanan] = useState('');
  const [formHarga, setFormHarga] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formTipeBayar, setFormTipeBayar] = useState('Bayar di Akhir');
  const [formReferral, setFormReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Edit modal
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editWa, setEditWa] = useState('');
  const [editLayanan, setEditLayanan] = useState('');
  const [editHarga, setEditHarga] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ─── Fetch orders ────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders();
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengambil data pesanan');
    } finally {
      setLoading(false);
    }
  }

  // ─── Search with debounce ────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      fetchOrders();
      return;
    }
    setSearching(true);
    try {
      const res = await trackOrder(q.trim());
      if (res.success && res.data) {
        setOrders(res.data);
      } else {
        // fallback: client-side filter on current orders
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

  // ─── Filtered orders ─────────────────────────────────────────
  const filteredOrders =
    filter === 'Semua'
      ? orders
      : orders.filter((o) => o.Status === filter);

  // ─── Status update ───────────────────────────────────────────
  async function handleStatusUpdate(orderId: string, newStatus: string) {
    try {
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui status');
    }
  }

  // ─── Add order ───────────────────────────────────────────────
  function handleTambahOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!formNama.trim() || !formWa.trim() || !formLayanan.trim() || !formHarga.trim()) {
      setError('Harap isi Nama, WA, Layanan, dan Harga');
      return;
    }
    setSubmitting(true);
    addOrder({
      NamaPelanggan: formNama.trim(),
      KontakWA: formWa.trim(),
      Layanan: formLayanan.trim(),
      Harga: parseFloat(formHarga),
      Catatan: formCatatan.trim(),
      TipePembayaran: formTipeBayar,
      ReferralCode: formReferral.trim() || undefined,
    })
      .then(() => {
        setShowAddModal(false);
        resetAddForm();
        return fetchOrders();
      })
      .catch((err: any) => {
        setError(err?.message || 'Gagal menambah order');
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  function resetAddForm() {
    setFormNama('');
    setFormWa('');
    setFormLayanan('');
    setFormHarga('');
    setFormCatatan('');
    setFormTipeBayar('Bayar di Akhir');
    setFormReferral('');
  }

  // ─── Edit order ──────────────────────────────────────────────
  function openEdit(order: Order) {
    setEditOrder(order);
    setEditNama(order.NamaPelanggan || '');
    setEditWa(order.KontakWA || '');
    setEditLayanan(order.Layanan || '');
    setEditHarga(String(order.Harga ?? ''));
    setEditCatatan(order.Catatan || '');
  }

  function closeEdit() {
    setEditOrder(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder) return;
    if (!editNama.trim() || !editWa.trim() || !editLayanan.trim() || !editHarga.trim()) {
      setError('Harap isi Nama, WA, Layanan, dan Harga');
      return;
    }
    setEditSubmitting(true);
    try {
      await updateOrder(editOrder.OrderID, {
        NamaPelanggan: editNama.trim(),
        KontakWA: editWa.trim(),
        Layanan: editLayanan.trim(),
        Harga: parseFloat(editHarga),
        Catatan: editCatatan.trim(),
      });
      setEditOrder(null);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal mengupdate order');
    } finally {
      setEditSubmitting(false);
    }
  }

  // ─── QRIS ────────────────────────────────────────────────────
  function openQRIS() {
    const msg = encodeURIComponent(
      'Saya ingin melakukan pembayaran melalui QRIS. Mohon dikirimkan kode QRIS atau petunjuk pembayaran. Terima kasih.'
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  // ─── Render action buttons ───────────────────────────────────
  function renderActionButtons(order: Order) {
    const next = getNextStatuses(order.Status);
    if (next.length === 0) return <span className="text-muted">—</span>;
    return (
      <div className="aksi-group">
        {next.map((btn) => (
          <button
            key={btn.target}
            className={`btn btn-sm ${btn.variant}`}
            onClick={() => handleStatusUpdate(order.OrderID, btn.target)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────
  if (loading && orders.length === 0) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Memuat data pesanan...</p>
        </div>
      </div>
    );
  }

  // ─── Error (no data) ────────────────────────────────────────
  if (error && orders.length === 0) {
    return (
      <div className="page-container">
        <div className="error-box">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary" onClick={fetchOrders}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Error banner (non-blocking) */}
      {error && (
        <div className="alert alert-danger" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Pesanan</h1>
          <p className="page-description">Manajemen pesanan jasa</p>
        </div>

        <div className="page-header-actions">
          {/* Search */}
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Cari nama, WA, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: 220 }}
          />

          {/* Filter */}
          <select
            className="form-select filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* QRIS */}
          <button className="btn btn-outline-primary" onClick={openQRIS}>
            QRIS
          </button>

          {/* Tambah Order */}
          <button className="btn btn-primary" onClick={() => { resetAddForm(); setShowAddModal(true); }}>
            + Tambah Order
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tanggal</th>
              <th>Nama</th>
              <th>WA</th>
              <th>Layanan</th>
              <th>Harga</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  {searching ? 'Mencari...' : 'Tidak ada pesanan'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.OrderID}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetailOrder(order)}
                >
                  <td>{order.OrderID}</td>
                  <td>{formatDate(order.Tanggal || order.createdAt || '')}</td>
                  <td>{order.NamaPelanggan}</td>
                  <td>{order.KontakWA}</td>
                  <td>{order.Layanan}</td>
                  <td>{formatCurrency(order.Harga ?? 0)}</td>
                  <td>
                    <span className={`badge ${STATUS_CONFIG[order.Status]?.cls || ''}`}>
                      {STATUS_CONFIG[order.Status]?.icon || ''} {order.Status}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {renderActionButtons(order)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading overlay when refreshing */}
      {loading && <div className="loading-overlay"><div className="spinner" /></div>}

      {/* ═══════════════════════════════════════════════════════
          Tambah Order Modal
         ═══════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Order</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleTambahOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Pelanggan</label>
                  <input type="text" className="form-control" value={formNama}
                    onChange={(e) => setFormNama(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Kontak WA</label>
                  <input type="text" className="form-control" value={formWa}
                    onChange={(e) => setFormWa(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Layanan</label>
                  <input type="text" className="form-control" value={formLayanan}
                    onChange={(e) => setFormLayanan(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Harga</label>
                  <input type="number" className="form-control" value={formHarga}
                    onChange={(e) => setFormHarga(e.target.value)} min={0} required />
                </div>
                <div className="form-group">
                  <label>Catatan</label>
                  <textarea className="form-control" value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)} rows={3} />
                </div>
                <div className="form-group">
                  <label>Tipe Pembayaran</label>
                  <select className="form-control" value={formTipeBayar}
                    onChange={(e) => setFormTipeBayar(e.target.value)}>
                    <option value="Bayar di Awal">Bayar di Awal</option>
                    <option value="Bayar di Akhir">Bayar di Akhir</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Referral Code (opsional)</label>
                  <input type="text" className="form-control" value={formReferral}
                    onChange={(e) => setFormReferral(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)} disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Order Detail Modal
         ═══════════════════════════════════════════════════════ */}
      {detailOrder && (
        <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Order — {detailOrder.OrderID}</h3>
              <button className="modal-close" onClick={() => setDetailOrder(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <table className="detail-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <DetailRow label="OrderID" value={detailOrder.OrderID} />
                  <DetailRow label="Tanggal" value={formatDate(detailOrder.Tanggal || detailOrder.createdAt || '')} />
                  <DetailRow label="Nama Pelanggan" value={detailOrder.NamaPelanggan} />
                  <DetailRow label="Kontak WA" value={detailOrder.KontakWA} />
                  <DetailRow label="Layanan" value={detailOrder.Layanan} />
                  <DetailRow label="Harga" value={formatCurrency(detailOrder.Harga ?? 0)} />
                  <DetailRow label="Status" value={
                    <span className={`badge ${STATUS_CONFIG[detailOrder.Status]?.cls || ''}`}>
                      {STATUS_CONFIG[detailOrder.Status]?.icon || ''} {detailOrder.Status}
                    </span>
                  } />
                  <DetailRow label="Catatan" value={detailOrder.Catatan || '-'} />
                  <DetailRow label="Diskon Info" value={detailOrder.DiskonInfo || '-'} />
                  <DetailRow label="Referral" value={detailOrder.Referral || '-'} />
                  <DetailRow label="Tipe Pembayaran" value={detailOrder.TipePembayaran || '-'} />
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailOrder(null)}>
                Tutup
              </button>
              {!isTerminal(detailOrder.Status) && (
                <button
                  className="btn btn-primary"
                  onClick={() => { openEdit(detailOrder); setDetailOrder(null); }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Edit Order Modal
         ═══════════════════════════════════════════════════════ */}
      {editOrder && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Order — {editOrder.OrderID}</h3>
              <button className="modal-close" onClick={closeEdit}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Pelanggan</label>
                  <input type="text" className="form-control" value={editNama}
                    onChange={(e) => setEditNama(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Kontak WA</label>
                  <input type="text" className="form-control" value={editWa}
                    onChange={(e) => setEditWa(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Layanan</label>
                  <input type="text" className="form-control" value={editLayanan}
                    onChange={(e) => setEditLayanan(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Harga</label>
                  <input type="number" className="form-control" value={editHarga}
                    onChange={(e) => setEditHarga(e.target.value)} min={0} required />
                </div>
                <div className="form-group">
                  <label>Catatan</label>
                  <textarea className="form-control" value={editCatatan}
                    onChange={(e) => setEditCatatan(e.target.value)} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={closeEdit} disabled={editSubmitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper component ───────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', width: '35%' }}>
        {label}
      </td>
      <td style={{ padding: '10px 12px', color: '#1e293b' }}>
        {value}
      </td>
    </tr>
  );
}
