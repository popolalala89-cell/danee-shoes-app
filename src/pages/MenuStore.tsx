import React, { useState, useEffect } from 'react';
import { getMenuStore, saveMenuStore, deleteMenuStore } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { MenuStore } from '../lib/types';

const initialForm: Partial<MenuStore> = {
  ID: '',
  NamaProduk: '',
  Kategori: '',
  Harga: 0,
  Stok: 0,
  Status: 'Aktif',
  Deskripsi: '',
  LinkFoto: '',
  LinkMarketplace: '',
};

const MenuStore: React.FC = () => {
  const [items, setItems] = useState<MenuStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<MenuStore>>({ ...initialForm });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getMenuStore();
      setItems(data.data || []);
    } catch (err) {
      console.error('Failed to fetch menu store items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openAdd = () => {
    setForm({ ...initialForm });
    setShowModal(true);
  };

  const openEdit = (item: MenuStore) => {
    setForm({ ...item });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'Harga' || name === 'Stok' ? Number(value) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await saveMenuStore(form);
      closeModal();
      await fetchItems();
    } catch (err) {
      console.error('Failed to save menu store item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNonaktifkan = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menonaktifkan produk ini?')) {
      return;
    }
    try {
      await deleteMenuStore(id);
      await fetchItems();
    } catch (err) {
      console.error('Failed to delete menu store item:', err);
    }
  };

  const statusBadge = (status: string) => {
    const cls = status === 'Aktif' ? 'badge badge-selesai' : 'badge badge-batal';
    return <span className={cls}>{status}</span>;
  };

  return (
    <div className="admin-main">
      {/* Header */}
      <div className="admin-topbar">
        <h1>Menu Store</h1>
        <button className="btn btn-gold" onClick={openAdd}>
          + Tambah Produk
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Memuat data produk...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    Belum ada produk.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.ID}>
                  <td>{item.ID}</td>
                  <td style={{ fontWeight: 600 }}>{item.NamaProduk}</td>
                  <td>{item.Kategori}</td>
                  <td>{formatCurrency(item.Harga ?? 0)}</td>
                  <td>{item.Stok}</td>
                  <td>{statusBadge(item.Status)}</td>
                  <td>
                    <div className="aksi-group">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleNonaktifkan(item.ID)}
                      >
                        Nonaktifkan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{form.ID ? 'Edit Produk' : 'Tambah Produk'}</h3>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Hidden ID */}
                <input type="hidden" name="ID" value={form.ID} />

                <div className="form-group">
                  <label>Nama Produk</label>
                  <input
                    type="text"
                    name="NamaProduk"
                    className="form-control"
                    value={form.NamaProduk}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Kategori</label>
                  <input
                    type="text"
                    name="Kategori"
                    className="form-control"
                    value={form.Kategori}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Harga</label>
                  <input
                    type="number"
                    name="Harga"
                    className="form-control"
                    value={form.Harga}
                    onChange={handleChange}
                    required
                    min={0}
                  />
                </div>

                <div className="form-group">
                  <label>Stok</label>
                  <input
                    type="number"
                    name="Stok"
                    className="form-control"
                    value={form.Stok}
                    onChange={handleChange}
                    required
                    min={0}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="Status"
                    className="form-control"
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
                    name="Deskripsi"
                    className="form-control"
                    value={form.Deskripsi}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Link Foto</label>
                  <input
                    type="text"
                    name="LinkFoto"
                    className="form-control"
                    value={form.LinkFoto}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Link Marketplace</label>
                  <input
                    type="text"
                    name="LinkMarketplace"
                    className="form-control"
                    value={form.LinkMarketplace}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>
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
      )}
    </div>
  );
};

export default MenuStore;
