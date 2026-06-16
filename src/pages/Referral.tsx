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
      <span
        style={{
          display: 'inline-block',
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          background: isActive ? '#d1fae5' : '#fee2e2',
          color: isActive ? '#065f46' : '#991b1b',
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <div className="admin-main">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-dark)',
          }}
        >
          🔗 Referral Management
        </h2>
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
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>
            {error}
          </p>
          <button className="btn btn-primary" onClick={loadReferrals}>
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.3rem 0.75rem',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                            }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={handleCloseModal}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '1.5rem',
              background: 'white',
              borderRadius: '12px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                color: 'var(--text-dark)',
              }}
            >
              {form.ID ? 'Edit Kode Referral' : 'Tambah Kode Referral'}
            </h3>

            <form onSubmit={handleSave}>
              {/* Hidden ID */}
              {form.ID && (
                <input type="hidden" name="ID" value={form.ID} />
              )}

              {/* Kode */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="Kode"
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: 'var(--text-dark)',
                  }}
                >
                  Kode Referral
                </label>
                <input
                  id="Kode"
                  name="Kode"
                  type="text"
                  value={form.Kode}
                  onChange={handleChange}
                  placeholder="Contoh: RAFLI10"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* NamaReferral */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="NamaReferral"
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: 'var(--text-dark)',
                  }}
                >
                  Nama Referral
                </label>
                <input
                  id="NamaReferral"
                  name="NamaReferral"
                  type="text"
                  value={form.NamaReferral}
                  onChange={handleChange}
                  placeholder="Nama lengkap referral"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* KomisiPct */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="KomisiPct"
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: 'var(--text-dark)',
                  }}
                >
                  Komisi (%)
                </label>
                <input
                  id="KomisiPct"
                  name="KomisiPct"
                  type="number"
                  value={form.KomisiPct}
                  onChange={handleChange}
                  placeholder="10"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="Status"
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: 'var(--text-dark)',
                  }}
                >
                  Status
                </label>
                <select
                  id="Status"
                  name="Status"
                  value={form.Status}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  className="btn"
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: 'var(--text-dark)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                  onClick={handleCloseModal}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
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
