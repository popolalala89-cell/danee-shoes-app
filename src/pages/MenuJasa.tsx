import React, { useState, useEffect } from 'react';
import { getMenuJasa, saveMenuJasa, deleteMenuJasa } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { MenuJasa } from '../lib/types';

const defaultForm: Partial<MenuJasa> = {
  NamaLayanan: '',
  Kategori: 'Cleaning',
  Harga: 0,
  HargaPromo: undefined,
  Status: 'Aktif',
  Deskripsi: '',
  Urutan: 0,
};

const MenuJasa: React.FC = () => {
  const [data, setData] = useState<MenuJasa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<typeof defaultForm>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMenuJasa();
      setData(res.data || []);
    } catch (err) {
      console.error('Gagal memuat layanan jasa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (item: MenuJasa) => {
    setForm({
      ID: item.ID,
      NamaLayanan: item.NamaLayanan,
      Kategori: item.Kategori,
      Harga: item.Harga,
      HargaPromo: item.HargaPromo ?? undefined,
      Status: item.Status,
      Deskripsi: item.Deskripsi || '',
      Urutan: item.Urutan ?? 0,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'Harga' || name === 'Urutan' || name === 'HargaPromo'
          ? value === ''
            ? undefined
            : Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMenuJasa(form);
      closeModal();
      await fetchData();
    } catch (err) {
      console.error('Gagal menyimpan layanan jasa:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNonaktifkan = async (id: string) => {
    if (!window.confirm('Nonaktifkan layanan ini?')) return;
    try {
      await deleteMenuJasa(id);
      await fetchData();
    } catch (err) {
      console.error('Gagal menonaktifkan layanan jasa:', err);
    }
  };

  const statusBadge = (status: string) => {
    const cls = status === 'Aktif' ? 'badge badge-success' : 'badge badge-danger';
    return <span className={cls}>{status}</span>;
  };

  return (
    <div className="menu-jasa-page">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="mb-0 text-muted">Kelola layanan jasa cuci &amp; repair</p>
        <button className="btn btn-gold btn-sm" onClick={openAdd}>
          + Tambah Layanan
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Layanan</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Belum ada layanan jasa.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.ID}>
                    <td>{item.ID}</td>
                    <td>{item.NamaLayanan}</td>
                    <td>{item.Kategori}</td>
                    <td>{formatCurrency(item.Harga)}</td>
                    <td>{statusBadge(item.Status)}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm me-1"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleNonaktifkan(item.ID)}
                      >
                        Nonaktifkan
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="mb-0">{form.ID ? 'Edit Layanan' : 'Tambah Layanan'}</h5>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {form.ID && (
                  <input type="hidden" name="ID" value={form.ID} />
                )}

                <div className="form-group">
                  <label>Nama Layanan</label>
                  <input
                    className="form-control"
                    type="text"
                    name="NamaLayanan"
                    value={form.NamaLayanan}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    className="form-control"
                    name="Kategori"
                    value={form.Kategori}
                    onChange={handleChange}
                  >
                    <option value="Cleaning">Cleaning</option>
                    <option value="Repair">Repair</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Harga</label>
                  <input
                    className="form-control"
                    type="number"
                    name="Harga"
                    value={form.Harga}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Harga Promo (opsional)</label>
                  <input
                    className="form-control"
                    type="number"
                    name="HargaPromo"
                    value={form.HargaPromo ?? ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    name="Status"
                    value={form.Status}
                    onChange={handleChange}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Deskripsi</label>
                  <textarea
                    className="form-control"
                    name="Deskripsi"
                    value={form.Deskripsi}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Urutan</label>
                  <input
                    className="form-control"
                    type="number"
                    name="Urutan"
                    value={form.Urutan}
                    onChange={handleChange}
                  />
                </div>

                <div className="d-flex justify-content-end mt-3">
                  <button
                    type="submit"
                    className="btn btn-gold"
                    disabled={saving}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuJasa;
