import { useState, useEffect } from 'react';
import { getAll as getAllMenuJasa, create as createMenuJasa, update as updateMenuJasa, remove as deleteMenuJasa } from '../lib/services/menu-jasa-service';
import { formatCurrency } from '../lib/utils';
import type { MenuJasaRow } from '../lib/types-supabase';

const KATEGORI_FILTERS = ['Semua', 'Cleaning', 'Repair'] as const;

const emptyForm = {
  nama_layanan: '',
  kategori: 'Cleaning' as 'Cleaning' | 'Repair',
  harga: 0,
  harga_promo: null as number | null,
  deskripsi: '',
  status: 'Aktif' as 'Aktif' | 'Coming Soon' | 'Nonaktif',
  urutan: 0,
};

const MenuJasa: React.FC = () => {
  const [data, setData] = useState<MenuJasaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = filterKategori === 'Semua' ? undefined : filterKategori as 'Cleaning' | 'Repair';
      const res = await getAllMenuJasa(filter);
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error || 'Gagal memuat data jasa.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterKategori]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: MenuJasaRow) => {
    setEditingId(item.id);
    setForm({
      nama_layanan: item.nama_layanan,
      kategori: item.kategori,
      harga: item.harga,
      harga_promo: item.harga_promo,
      deskripsi: item.deskripsi || '',
      status: item.status,
      urutan: item.urutan || 0,
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'harga' || name === 'urutan' || name === 'harga_promo' ? (value ? Number(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_layanan || form.harga <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateMenuJasa(editingId, {
          nama_layanan: form.nama_layanan,
          kategori: form.kategori,
          harga: form.harga,
          harga_promo: form.harga_promo,
          deskripsi: form.deskripsi || null,
          status: form.status,
          urutan: form.urutan,
        });
      } else {
        await createMenuJasa({
          nama_layanan: form.nama_layanan,
          kategori: form.kategori,
          harga: form.harga,
          harga_promo: form.harga_promo,
          deskripsi: form.deskripsi || null,
          status: form.status,
          urutan: form.urutan,
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
    if (!window.confirm(`Nonaktifkan layanan "${nama}"?`)) return;
    try {
      await deleteMenuJasa(id);
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menonaktifkan.');
    }
  };

  const getStatusClass = (status: string) => {
    if (status === 'Aktif') return 'badge-selesai';
    if (status === 'Coming Soon') return 'badge-waiting';
    return 'badge-batal';
  };

  const filteredData = filterKategori === 'Semua' ? data : data.filter((item) => item.kategori === filterKategori);

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Menu Jasa</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Jasa</button>
      </div>

      {/* Kategori filter tabs */}
      <div className="tab-btns" style={{ marginBottom: 'var(--space-md)' }}>
        {KATEGORI_FILTERS.map((f) => (
          <button key={f} className={`tab-btn ${filterKategori === f ? 'active' : ''}`} onClick={() => setFilterKategori(f)}>{f}</button>
        ))}
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Memuat data jasa...</p>
        </div>
      )}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Layanan</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Harga Promo</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">Belum ada data jasa.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_layanan}</td>
                    <td><span className="badge badge-proses">{item.kategori}</span></td>
                    <td>{formatCurrency(item.harga)}</td>
                    <td>{item.harga_promo ? formatCurrency(item.harga_promo) : '-'}</td>
                    <td><span className={`badge ${getStatusClass(item.status)}`}>{item.status}</span></td>
                    <td>
                      <div className="aksi-group">
                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.nama_layanan)}>Nonaktifkan</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Jasa' : 'Tambah Jasa'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Layanan</label>
                  <input type="text" name="nama_layanan" className="form-control" value={form.nama_layanan} onChange={handleChange} placeholder="Nama layanan" required />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select name="kategori" className="form-control" value={form.kategori} onChange={handleChange} required>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Repair">Repair</option>
                  </select>
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
                  <label>Deskripsi</label>
                  <textarea name="deskripsi" className="form-control" rows={3} value={form.deskripsi} onChange={handleChange} placeholder="Deskripsi layanan (opsional)" />
                </div>
                <div className="form-group">
                  <label>Urutan</label>
                  <input type="number" name="urutan" className="form-control" min={0} value={form.urutan} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" className="form-control" value={form.status} onChange={handleChange} required>
                    <option value="Aktif">Aktif</option>
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.nama_layanan || form.harga <= 0}>
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

export default MenuJasa;
