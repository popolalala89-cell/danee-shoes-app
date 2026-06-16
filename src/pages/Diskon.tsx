import React, { useState, useEffect } from 'react';
import { getDiskonEvent, saveDiskonEvent, deleteDiskonEvent } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { DiskonEvent } from '../lib/types';

const Diskon: React.FC = () => {
  const [data, setData] = useState<DiskonEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    ID: string;
    NamaEvent: string;
    Potongan: number;
    Tipe: string;
    Status: string;
    TargetLayanan: string;
  }>({
    ID: '',
    NamaEvent: '',
    Potongan: 0,
    Tipe: 'Persen',
    Status: 'Aktif',
    TargetLayanan: '',
  });

  // ---- Fetch Data ----
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDiskonEvent();
      if (res.success) {
        setData(res.data || []);
      } else {
        console.error('Gagal memuat diskon:', res.message);
      }
    } catch (err) {
      console.error('Gagal memuat diskon:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---- Modal Control ----
  const openTambah = () => {
    setForm({
      ID: '',
      NamaEvent: '',
      Potongan: 0,
      Tipe: 'Persen',
      Status: 'Aktif',
      TargetLayanan: '',
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (item: DiskonEvent) => {
    setForm({
      ID: item.ID,
      NamaEvent: item.NamaEvent,
      Potongan: item.Potongan,
      Tipe: item.Tipe,
      Status: item.Status,
      TargetLayanan: item.TargetLayanan,
    });
    setEditingId(item.ID);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  // ---- Form Handlers ----
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'Potongan' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.NamaEvent || !form.Tipe || !form.Status) return;
    setSubmitting(true);
    try {
      const payload: Partial<DiskonEvent> = {
        NamaEvent: form.NamaEvent,
        Potongan: form.Potongan,
        Tipe: form.Tipe,
        Status: form.Status,
        TargetLayanan: form.TargetLayanan,
      };
      if (editingId) {
        payload.ID = editingId;
      }
      const res = await saveDiskonEvent(payload);
      if (res.success) {
        closeModal();
        await fetchData();
      } else {
        console.error('Gagal menyimpan diskon:', res.message);
        alert('Gagal menyimpan: ' + (res.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Gagal menyimpan diskon:', err);
      alert('Gagal menyimpan diskon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, namaEvent: string) => {
    if (!window.confirm(`Nonaktifkan event diskon "${namaEvent}"?`)) return;
    try {
      const res = await deleteDiskonEvent(id);
      if (res.success) {
        await fetchData();
      } else {
        console.error('Gagal menonaktifkan diskon:', res.message);
        alert('Gagal menonaktifkan: ' + (res.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Gagal menonaktifkan diskon:', err);
      alert('Gagal menonaktifkan diskon.');
    }
  };

  // ---- Format helpers ----
  const formatPotongan = (item: DiskonEvent): string => {
    if (item.Tipe === 'Persen') {
      return `${item.Potongan}%`;
    }
    if (item.Tipe === 'Langsung') {
      return formatCurrency(item.Potongan);
    }
    if (item.Tipe === 'Gratis Item') {
      return 'Gratis';
    }
    return String(item.Potongan);
  };

  const tipeLabels: Record<string, string> = {
    Persen: 'Persen',
    Langsung: 'Langsung',
    'Gratis Item': 'Gratis Item',
  };

  return (
    <div className="admin-main">
      {/* Header */}
      <div className="admin-topbar">
        <h1>Manajemen Diskon</h1>
      </div>

      {/* Action button */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openTambah}>
          + Tambah Event Diskon
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Memuat data diskon...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Event</th>
                <th>Potongan</th>
                <th>Tipe</th>
                <th>Target Layanan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Belum ada event diskon.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.ID}>
                    <td>{item.ID}</td>
                    <td style={{ fontWeight: 600 }}>{item.NamaEvent}</td>
                    <td>{formatPotongan(item)}</td>
                    <td>{tipeLabels[item.Tipe] || item.Tipe}</td>
                    <td>{item.TargetLayanan || '-'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#fff',
                          backgroundColor: item.Status === 'Aktif' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {item.Status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item.ID, item.NamaEvent)}
                        >
                          Nonaktifkan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Event Diskon' : 'Tambah Event Diskon'}</h3>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Hidden ID field */}
                <input type="hidden" name="ID" value={form.ID} />

                <div className="form-group">
                  <label htmlFor="namaEvent">Nama Event</label>
                  <input
                    id="namaEvent"
                    type="text"
                    name="NamaEvent"
                    className="form-control"
                    placeholder="e.g. DISKON LEBARAN"
                    value={form.NamaEvent}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tipe">Tipe Diskon</label>
                  <select
                    id="tipe"
                    name="Tipe"
                    className="form-control"
                    value={form.Tipe}
                    onChange={handleChange}
                    required
                  >
                    <option value="Persen">Persen</option>
                    <option value="Langsung">Langsung</option>
                    <option value="Gratis Item">Gratis Item</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="potongan">
                    {form.Tipe === 'Persen'
                      ? 'Potongan (%)'
                      : form.Tipe === 'Langsung'
                      ? 'Potongan (Rp)'
                      : 'Potongan'}
                  </label>
                  <input
                    id="potongan"
                    type="number"
                    name="Potongan"
                    className="form-control"
                    min={0}
                    value={form.Potongan}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="targetLayanan">Target Layanan</label>
                  <input
                    id="targetLayanan"
                    type="text"
                    name="TargetLayanan"
                    className="form-control"
                    placeholder="e.g. Semua, Reparasi, Cleaning"
                    value={form.TargetLayanan}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="Status"
                    className="form-control"
                    value={form.Status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={closeModal}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !form.NamaEvent}
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
};

export default Diskon;
