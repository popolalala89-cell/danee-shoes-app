import React, { useState, useEffect } from 'react';
import { getReferralAdmin, saveReferral, deleteReferral } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Referral } from '../lib/types';

interface FormData {
  ID: string;
  Kode: string;
  NamaReferral: string;
  KomisiPct: number;
  Status: string;
}

const emptyForm: FormData = {
  ID: '',
  Kode: '',
  NamaReferral: '',
  KomisiPct: 0,
  Status: 'Aktif',
};

function Referral() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch on mount
  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
    setLoading(true);
    setError(null);
    try {
      const res = await getReferralAdmin();
      if (res.success && res.data) {
        setReferrals(res.data);
      } else {
        setError(res.message || 'Gagal memuat data referral.');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan saat memuat data referral.');
    } finally {
      setLoading(false);
    }
  }

  // Open modal for add
  function handleAdd() {
    setForm(emptyForm);
    setShowModal(true);
  }

  // Open modal for edit (pre-fills form)
  function handleEdit(item: Referral) {
    setForm({
      ID: item.ID,
      Kode: item.Kode,
      NamaReferral: item.NamaReferral,
      KomisiPct: item.KomisiPct,
      Status: item.Status,
    });
    setShowModal(true);
  }

  // Close modal
  function handleCloseModal() {
    setShowModal(false);
    setForm(emptyForm);
  }

  // Form field change
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'KomisiPct' ? Number(value) : value,
    }));
  }

  // Save (create or update)
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Referral> = {
        Kode: form.Kode,
        NamaReferral: form.NamaReferral,
        KomisiPct: form.KomisiPct,
        Status: form.Status,
      };
      if (form.ID) {
        payload.ID = form.ID;
      }
      const res = await saveReferral(payload);
      if (res.success) {
        handleCloseModal();
        await loadReferrals();
      } else {
        alert(res.message || 'Gagal menyimpan data referral.');
      }
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  // Delete (nonaktifkan)
  async function handleDelete(id: string, kode: string) {
    if (!window.confirm(`Nonaktifkan kode referral "${kode}"? Data akan dihapus.`)) return;
    try {
      const res = await deleteReferral(id);
      if (res.success) {
        await loadReferrals();
      } else {
        alert(res.message || 'Gagal menonaktifkan referral.');
      }
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan saat menonaktifkan.');
    }
  }

  // Status badge
  function renderStatusBadge(status: string) {
    const isActive = status === 'Aktif';
    return (
      <span className={`badge ${isActive ? 'badge-selesai' : 'badge-batal'}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="admin-main">
      {/* Header */}
      <div className="admin-topbar">
        <h1>🔗 Referral Management</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          + Tambah Kode Referral
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-overlay" style={{ minHeight: '200px' }}>
          <div className="loading-spinner" />
          <p style={{ color: 'var(--text-gray)', marginTop: '0.75rem' }}>
            Memuat data referral...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>
            {error}
          </p>
          <button className="btn btn-outline" onClick={loadReferrals}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, padding: 0 }}>
            {referrals.length === 0 ? (
              <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', padding: '1rem 0' }}>
                Belum ada data referral. Klik "Tambah Kode Referral" untuk membuat yang baru.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Kode</th>
                    <th>Nama Referral</th>
                    <th>Total Klik</th>
                    <th>Total Order</th>
                    <th>Total Revenue</th>
                    <th>Status</th>
                    <th>Tanggal Dibuat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((item) => (
                    <tr key={item.ID}>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {item.ID}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.Kode}
                      </td>
                      <td>{item.NamaReferral}</td>
                      <td style={{ textAlign: 'center' }}>{item.TotalKlik ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>{item.TotalOrder ?? 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(item.TotalRevenue ?? 0)}
                      </td>
                      <td>{renderStatusBadge(item.Status)}</td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(item.Dibuat)}
                      </td>
                      <td>
                        <div className="aksi-group">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(item.ID, item.Kode)}
                          >
                            Nonaktifkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {form.ID ? 'Edit Kode Referral' : 'Tambah Kode Referral'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.5rem' }}>
              {/* Hidden ID */}
              {form.ID && (
                <input type="hidden" name="ID" value={form.ID} />
              )}

              {/* Kode */}
              <div className="form-group">
                <label htmlFor="Kode">Kode Referral</label>
                <input
                  id="Kode"
                  name="Kode"
                  type="text"
                  className="form-control"
                  value={form.Kode}
                  onChange={handleChange}
                  placeholder="Contoh: RAFLI10"
                  required
                />
              </div>

              {/* NamaReferral */}
              <div className="form-group">
                <label htmlFor="NamaReferral">Nama Referral</label>
                <input
                  id="NamaReferral"
                  name="NamaReferral"
                  type="text"
                  className="form-control"
                  value={form.NamaReferral}
                  onChange={handleChange}
                  placeholder="Nama lengkap referral"
                  required
                />
              </div>

              {/* KomisiPct */}
              <div className="form-group">
                <label htmlFor="KomisiPct">Komisi (%)</label>
                <input
                  id="KomisiPct"
                  name="KomisiPct"
                  type="number"
                  className="form-control"
                  value={form.KomisiPct}
                  onChange={handleChange}
                  placeholder="10"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>

              {/* Status */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="Status">Status</label>
                <select
                  id="Status"
                  name="Status"
                  className="form-control"
                  value={form.Status}
                  onChange={handleChange}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              {/* Actions */}
              <div className="modal-footer" style={{ borderTop: 'none', padding: 0, paddingTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Referral;
