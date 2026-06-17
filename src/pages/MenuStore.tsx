import { useState, useEffect } from 'react';
import { getAll as getAllMenuStore, getAllActive as getMenuStoreActive, create as createMenuStore, update as updateMenuStore, remove as deleteMenuStore } from '../lib/services/menu-store-service';
import { formatCurrency } from '../lib/utils';
import type { MenuStoreRow } from '../lib/types-supabase';

const emptyForm = {
  nama_produk: '',
  kategori: '',
  harga: 0,
  harga_promo: null as number | null,
  stok: 0,
  deskripsi: '',
  link_foto: '',
  link_marketplace: '',
  status: 'Aktif' as 'Aktif' | 'Nonaktif',
};

const MenuStore: React.FC = () => {
  const [data, setData] = useState<MenuStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (filterStatus === 'Aktif') {
        res = await getMenuStoreActive();
      } else {
        res = await getAllMenuStore();
      }
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error || 'Gagal memuat data produk.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: MenuStoreRow) => {
    setEditingId(item.id);
    setForm({
      nama_produk: item.nama_produk,
      kategori: item.kategori || '',
      harga: item.harga,
      harga_promo: item.harga_promo,
      stok: item.stok,
      deskripsi: item.deskripsi || '',
      link_foto: item.link_foto || '',
      link_marketplace: item.link_marketplace || '',
      status: item.status,
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'harga' || name === 'stok' || name === 'harga_promo' ? (value ? Number(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_produk || form.harga <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateMenuStore(editingId, {
          nama_produk: form.nama_produk,
          kategori: form.kategori || null,
          harga: form.harga,
          harga_promo: form.harga_promo,
          stok: form.stok,
          deskripsi: form.deskripsi || null,
          link_foto: form.link_foto || null,
          link_marketplace: form.link_marketplace || null,
          status: form.status,
        });
      } else {
        await createMenuStore({
          nama_produk: form.nama_produk,
          kategori: form.kategori || null,
          harga: form.harga,
          harga_promo: form.harga_promo,
          stok: form.stok,
          deskripsi: form.deskripsi || null,
          link_foto: form.link_foto || null,
          link_marketplace: form.link_marketplace || null,
          status: form.status,
        });
      }
      setShowModal(false);
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Nonaktifkan produk "${nama}"?`)) return;
    try {
      await deleteMenuStore(id);
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menonaktifkan.');
    }
  };

  const filteredData = filterStatus === 'Semua' ? data : data.filter((item) => item.status === filterStatus);

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Menu Store</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Produk</button>
      </div>

      <div className="tab-btns" style={{ marginBottom: 'var(--space-md)' }}>
        {['Semua', 'Aktif', 'Nonaktif'].map((f) => (
          <button key={f} className={`tab-btn ${filterStatus === f ? 'active' : ''}`} onClick={() => setFilterStatus(f)}>{f}</button>
        ))}
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Memuat data produk...</p>
        </div>
      )}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">Belum ada data produk.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_produk}</td>
                    <td><span className="badge badge-proses">{item.kategori || '-'}</span></td>
                    <td>{formatCurrency(item.harga)}</td>
                    <td><span className={`badge ${(item.stok ?? 0) <= 3 ? 'badge-batal' : 'badge-selesai'}`}>{item.stok ?? 0}</span></td>
                    <td><span className={`badge ${item.status === 'Aktif' ? 'badge-selesai' : 'badge-batal'}`}>{item.status}</span></td>
                    <td>
                      <div className="aksi-group">
                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.nama_produk)}>Nonaktifkan</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Produk' : 'Tambah Produk'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Produk</label>
                  <input type="text" name="nama_produk" className="form-control" value={form.nama_produk} onChange={handleChange} placeholder="Nama produk" required />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <input type="text" name="kategori" className="form-control" value={form.kategori} onChange={handleChange} placeholder="Kategori produk" />
                </div>
                <div className="form-group">
                  <label>Harga (Rp)</label>
                  <input type="number" name="harga" className="form-control" min={0} value={form.harga || ''} onChange={handleChange} placeholder="0" required />
                </div>
                <div className="form-group">
                  <label>Harga Promo (Rp) — opsional</label>
                  <input type="number" name="harga_promo" className="form-control" min={0} value={form.harga_promo ?? ''} onChange={handleChange} placeholder="Kosongkan jika tidak ada" />
                </div>
                <div className="form-group">
                  <label>Stok</label>
                  <input type="number" name="stok" className="form-control" min={0} value={form.stok || ''} onChange={handleChange} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Deskripsi</label>
                  <textarea name="deskripsi" className="form-control" rows={3} value={form.deskripsi} onChange={handleChange} placeholder="Deskripsi produk (opsional)" />
                </div>
                <div className="form-group">
                  <label>Link Foto</label>
                  <input type="text" name="link_foto" className="form-control" value={form.link_foto} onChange={handleChange} placeholder="URL foto produk" />
                </div>
                <div className="form-group">
                  <label>Link Marketplace</label>
                  <input type="text" name="link_marketplace" className="form-control" value={form.link_marketplace} onChange={handleChange} placeholder="URL marketplace" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" className="form-control" value={form.status} onChange={handleChange} required>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.nama_produk || form.harga <= 0}>
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
