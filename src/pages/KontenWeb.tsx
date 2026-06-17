import { useState, useEffect } from 'react';
import { getAll as getAllKonten, createKonten, updateKonten, deleteKonten } from '../lib/services/konten-service';
import { formatDate } from '../lib/utils';
import type { KontenWebRow } from '../lib/types-supabase';

const KATEGORI_TABS = ['Semua', 'Edukasi', 'Testimoni', 'Instagram', 'YouTube'] as const;

const emptyForm = { kategori: 'Edukasi' as string, keterangan: '', isi_konten: '', status: 'Aktif' as string };

const KontenWeb: React.FC = () => {
  const [data, setData] = useState<KontenWebRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kategori, setKategori] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = kategori === 'Semua' ? undefined : kategori;
      const res = await getAllKonten(filter);
      if (res.success) setData(res.data || []);
      else setError(res.error || 'Gagal memuat konten.');
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [kategori]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: KontenWebRow) => {
    setEditingId(item.id);
    setForm({ kategori: item.kategori, keterangan: item.keterangan || '', isi_konten: item.isi_konten || '', status: item.status });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan.trim() || !form.isi_konten.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await updateKonten(editingId, { kategori: form.kategori as 'Edukasi' | 'Testimoni' | 'Instagram' | 'YouTube', keterangan: form.keterangan, isi_konten: form.isi_konten, status: form.status as 'Aktif' | 'Nonaktif' });
        if (!res.success) { setError(res.error ?? null); setSaving(false); return; }
      } else {
        const res = await createKonten({ kategori: form.kategori as 'Edukasi' | 'Testimoni' | 'Instagram' | 'YouTube', keterangan: form.keterangan, isi_konten: form.isi_konten, status: (form.status || 'Aktif') as 'Aktif' | 'Nonaktif' });
        if (!res.success) { setError(res.error ?? null); setSaving(false); return; }
      }
      setShowModal(false);
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, keterangan: string) => {
    if (!window.confirm(`Hapus konten "${keterangan}"?`)) return;
    try {
      const res = await deleteKonten(id);
      if (!res.success) { setError(res.error ?? null); return; }
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus.');
    }
  };

  const filteredData = kategori === 'Semua' ? data : data.filter((item) => item.kategori === kategori);
  const getStatusClass = (s: string) => s === 'Aktif' ? 'badge-selesai' : 'badge-batal';

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Konten Web</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Konten</button>
      </div>

      <div className="tab-btns" style={{ marginBottom: 'var(--space-md)' }}>
        {KATEGORI_TABS.map((k) => (
          <button key={k} className={`tab-btn ${kategori === k ? 'active' : ''}`} onClick={() => setKategori(k)}>{k}</button>
        ))}
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat konten...</p></div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Kategori</th><th>Keterangan</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-muted">Belum ada konten.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td><span className="badge badge-proses">{item.kategori}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.keterangan}</td>
                    <td><span className={`badge ${getStatusClass(item.status)}`}>{item.status}</span></td>
                    <td>
                      <div className="aksi-group">
                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.keterangan || '')}>Hapus</button>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Konten' : 'Tambah Konten'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Kategori</label>
                  <select name="kategori" className="form-control" value={form.kategori} onChange={handleChange} required>
                    <option value="Edukasi">Edukasi</option>
                    <option value="Testimoni">Testimoni</option>
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Keterangan</label>
                  <input type="text" name="keterangan" className="form-control" value={form.keterangan} onChange={handleChange} placeholder="Judul/keterangan konten" required />
                </div>
                <div className="form-group">
                  <label>Isi Konten</label>
                  <textarea name="isi_konten" className="form-control" rows={4} value={form.isi_konten} onChange={handleChange} placeholder="Isi konten (link, deskripsi, dll)" required />
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
                <button type="button" className="btn btn-white" onClick={() => setShowModal(false)} disabled={saving}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.keterangan.trim() || !form.isi_konten.trim()}>
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

export default KontenWeb;
