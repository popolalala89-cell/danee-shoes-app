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
    const colors: Record<string, string> = {
      Aktif: 'bg-green-100 text-green-800',
      Nonaktif: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          colors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Menu Store</h1>
        <button
          onClick={openAdd}
          style={{ backgroundColor: '#D4AF37' }}
          className="px-4 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          + Tambah Produk
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Produk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Belum ada produk.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.ID} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.ID}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.NamaProduk}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.Kategori}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(item.Harga)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.Stok}</td>
                  <td className="px-4 py-3 text-sm">{statusBadge(item.Status)}</td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleNonaktifkan(item.ID)}
                      className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    >
                      Nonaktifkan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                {form.ID ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              {/* Hidden ID */}
              <input type="hidden" name="ID" value={form.ID} />

              {/* NamaProduk */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  name="NamaProduk"
                  value={form.NamaProduk}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  name="Kategori"
                  value={form.Kategori}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Harga */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga
                </label>
                <input
                  type="number"
                  name="Harga"
                  value={form.Harga}
                  onChange={handleChange}
                  required
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Stok */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stok
                </label>
                <input
                  type="number"
                  name="Stok"
                  value={form.Stok}
                  onChange={handleChange}
                  required
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="Status"
                  value={form.Status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  name="Deskripsi"
                  value={form.Deskripsi}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* LinkFoto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Foto
                </label>
                <input
                  type="text"
                  name="LinkFoto"
                  value={form.LinkFoto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* LinkMarketplace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Marketplace
                </label>
                <input
                  type="text"
                  name="LinkMarketplace"
                  value={form.LinkMarketplace}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: '#D4AF37' }}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
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
