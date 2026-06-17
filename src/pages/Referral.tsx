import { useState, useEffect } from 'react';
import { getAllReferral, createReferral, updateReferral, deleteReferral } from '../lib/services/konten-service';
import { formatCurrency } from '../lib/utils';
import type { ReferralRow } from '../lib/types-supabase';

const emptyForm = { kode: '', nama_referral: '', link: '', status: 'Aktif' as string, komisi_pct: 5 };

const Referral: React.FC = () => {
  const [data, setData] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllReferral();
      if (res.success) setData(res.data || []);
      else setError(res.error || 'Gagal memuat referral.');
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: ReferralRow) => {
    setEditingId(item.id);
    setForm({
      kode: item.kode,
      nama_referral: item.nama_referral,
      link: item.link || '',
      status: item.status,
      komisi_pct: item.komisi_pct,
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'komisi_pct' ? (value ? Number(value) : 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kode.trim() || !form.nama_referral.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await updateReferral(editingId, {
          nama_referral: form.nama_referral,
          status: form.status as 'Aktif' | 'Nonaktif',
          komisi_pct: form.komisi_pct,
        });
        if (!res.success) { setError(res.error ?? null); setSaving(false); return; }
      } else {
        const res = await createReferral({
          nama_referral: form.nama_referral,
          status: form.status as 'Aktif' | 'Nonaktif',
          komisi_pct: form.komisi_pct,
        });
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

  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Nonaktifkan referral "${nama}"?`)) return;
    try {
      const res = await deleteReferral(id);
      if (!res.success) { setError(res.error ?? null); return; }
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menonaktifkan.');
    }
  };

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Referral</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Referral</button>
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat referral...</p></div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Komisi</th><th>Klik</th><th>Order</th><th>Revenue</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted">Belum ada referral.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td><span className="badge badge-proses" style={{ fontFamily: 'monospace' }}>{item.kode}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.nama_referral}</td>
                    <td>{item.komisi_pct}%</td>
                    <td>{item.total_klik ?? 0}</td>
                    <td>{item.total_order ?? 0}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(item.total_revenue ?? 0)}</td>
                    <td><span className={`badge ${item.status === 'Aktif' ? 'badge-selesai' : 'badge-batal'}`}>{item.status}</span></td>
                    <td>
                      <div className="aksi-group">
                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.nama_referral)}>Nonaktifkan</button>
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
              <h3>{editingId ? 'Edit Referral' : 'Tambah Referral'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Kode Referral</label>
                  <input type="text" name="kode" className="form-control" value={form.kode} onChange={handleChange} placeholder="Kode unik (contoh: REFFAHREN)" required />
                </div>
                <div className="form-group">
                  <label>Nama Referral</label>
                  <input type="text" name="nama_referral" className="form-control" value={form.nama_referral} onChange={handleChange} placeholder="Nama partner" required />
                </div>
                <div className="form-group">
                  <label>Link (opsional)</label>
                  <input type="text" name="link" className="form-control" value={form.link} onChange={handleChange} placeholder="URL referral" />
                </div>
                <div className="form-group">
                  <label>Komisi (%)</label>
                  <input type="number" name="komisi_pct" className="form-control" min={0} max={100} step={0.5} value={form.komisi_pct} onChange={handleChange} placeholder="5" />
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
                <button type="submit" className="btn btn-primary" disabled={saving || !form.kode.trim() || !form.nama_referral.trim()}>
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

export default Referral;
