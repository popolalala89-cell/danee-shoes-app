import React, { useState, useEffect } from 'react';
import { getOrders, addOrder, updateOrderStatus } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';
import type { Order } from '../lib/types';

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
const PROSES_PREFIXES = ['Proses Repair', 'Proses Cleaning', 'Proses Pengeringan'];

const STATUS_CONFIG: Record<string, { icon: string; cls: string }> = {
  'Waiting': { icon: '⏳', cls: 'badge-waiting' },
  'Checking': { icon: '🔍', cls: 'badge-waiting' },
  'Proses Repair': { icon: '🔧', cls: 'badge-proses' },
  'Proses Cleaning': { icon: '🧹', cls: 'badge-proses' },
  'Proses Pengeringan': { icon: '💨', cls: 'badge-proses' },
  'Ready': { icon: '✅', cls: 'badge-ready' },
  'Selesai': { icon: '✅', cls: 'badge-selesai' },
  'Batal': { icon: '❌', cls: 'badge-batal' },
};

function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function isProsesStatus(status: string): boolean {
  return PROSES_PREFIXES.includes(status);
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Semua');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formNama, setFormNama] = useState('');
  const [formWa, setFormWa] = useState('');
  const [formLayanan, setFormLayanan] = useState('');
  const [formHarga, setFormHarga] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formTipeBayar, setFormTipeBayar] = useState('Bayar di Akhir');
  const [formReferral, setFormReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const filteredOrders =
    filter === 'Semua'
      ? orders
      : orders.filter((o) => o.Status === filter);

  async function handleStatusUpdate(orderId: string, newStatus: string) {
    try {
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui status');
    }
  }

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
        setShowModal(false);
        resetForm();
        return fetchOrders();
      })
      .catch((err: any) => {
        setError(err?.message || 'Gagal menambah order');
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  function resetForm() {
    setFormNama('');
    setFormWa('');
    setFormLayanan('');
    setFormHarga('');
    setFormCatatan('');
    setFormTipeBayar('Bayar di Akhir');
    setFormReferral('');
  }

  function openModal() {
    resetForm();
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setError(null);
  }

  function openQRIS() {
    const msg = encodeURIComponent(
      'Saya ingin melakukan pembayaran melalui QRIS. Mohon dikirimkan kode QRIS atau petunjuk pembayaran. Terima kasih.'
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  function renderActionButtons(order: Order) {
    const status = order.Status;
    const buttons: React.ReactNode[] = [];

    if (status === 'Waiting' || status === 'Terverifikasi') {
      buttons.push(
        <button
          key="proses"
          className="btn btn-sm btn-primary"
          onClick={() => handleStatusUpdate(order.OrderID, 'Proses Repair')}
        >
          ▶ Proses
        </button>
      );
    }

    if (isProsesStatus(status)) {
      buttons.push(
        <button
          key="selesai"
          className="btn btn-sm btn-success"
          onClick={() => handleStatusUpdate(order.OrderID, 'Selesai')}
        >
          ✓ Selesai
        </button>
      );
    }

    if (status === 'Ready') {
      buttons.push(
        <button
          key="selesai"
          className="btn btn-sm btn-success"
          onClick={() => handleStatusUpdate(order.OrderID, 'Selesai')}
        >
          ✓ Selesai
        </button>
      );
    }

    if (!isTerminal(status)) {
      buttons.push(
        <button
          key="batal"
          className="btn btn-sm btn-danger"
          onClick={() => handleStatusUpdate(order.OrderID, 'Batal')}
        >
          ✕ Batal
        </button>
      );
    }

    return buttons.length > 0 ? <div className="aksi-group">{buttons}</div> : <span className="text-muted">—</span>;
  }

  // ─── Loading ──────────────────────────────────────────────
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

  // ─── Error (no data) ──────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Errors banner (non-blocking) */}
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
          <button className="btn btn-primary" onClick={openModal}>
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
                  Tidak ada pesanan
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.OrderID}>
                  <td>{order.OrderID}</td>
                  <td>{formatDate(order.Tanggal || order.createdAt)}</td>
                  <td>{order.NamaPelanggan}</td>
                  <td>{order.KontakWA}</td>
                  <td>{order.Layanan}</td>
                  <td>{formatCurrency(order.Harga ?? 0)}</td>
                  <td>
                    <span className={`status-badge badge ${STATUS_CONFIG[order.Status]?.cls || ''}`}>
                      {STATUS_CONFIG[order.Status]?.icon || ''} {order.Status}
                    </span>
                  </td>
                  <td>{renderActionButtons(order)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading overlay when refreshing */}
      {loading && <div className="loading-overlay"><div className="spinner" /></div>}

      {/* ─── Tambah Order Modal ─────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Order</h3>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleTambahOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Pelanggan</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Kontak WA</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formWa}
                    onChange={(e) => setFormWa(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Layanan</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formLayanan}
                    onChange={(e) => setFormLayanan(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Harga</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formHarga}
                    onChange={(e) => setFormHarga(e.target.value)}
                    min={0}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Catatan</label>
                  <textarea
                    className="form-control"
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Tipe Pembayaran</label>
                  <select
                    className="form-control"
                    value={formTipeBayar}
                    onChange={(e) => setFormTipeBayar(e.target.value)}
                  >
                    <option value="Bayar di Awal">Bayar di Awal</option>
                    <option value="Bayar di Akhir">Bayar di Akhir</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Referral Code (opsional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formReferral}
                    onChange={(e) => setFormReferral(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
