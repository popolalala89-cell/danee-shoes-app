import { useState, useEffect } from 'react';
import { getAllDiskon, createDiskon, updateDiskon, deleteDiskon } from '../lib/services/discount-service';
import { formatCurrency } from '../lib/utils';
import type { DiskonEventRow } from '../lib/types-supabase';

const emptyForm = { nama_event: '', potongan: 0, tipe: 'Persentase' as string, target_layanan: '', status: 'Aktif' as string };

// Map old labels to new DB values
const TIPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Persen (%)', value: 'Persentase' },
  { label: 'Nominal (Rp)', value: 'Nominal' },
];

const Diskon: React.FC = () => {
  const [data, setData] = useState<DiskonEventRow[]>([]);
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
      const res = await getAllDiskon();
      if (res.success) setData(res.data || []);
      else setError(res.error || 'Gagal memuat diskon.');
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

  const openEdit = (item: DiskonEventRow) => {
    setEditingId(item.id);
    setForm({
      nama_event: item.nama_event,
      potongan: item.potongan,
      tipe: item.tipe,
      target_layanan: item.target_layanan || '',
      status: item.status,
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'potongan' ? (value ? Number(value) : 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_event.trim() || form.potongan <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await updateDiskon(editingId, {
          nama_event: form.nama_event,
          potongan: form.potongan,
          tipe: form.tipe as 'Persentase' | 'Nominal',
          target_layanan: form.target_layanan || null,
          status: form.status as 'Aktif' | 'Admin Saja' | 'Nonaktif',
        });
        if (!res.success) { setError(res.error ?? null); setSaving(false); return; }
      } else {
        const res = await createDiskon({
          nama_event: form.nama_event,
          potongan: form.potongan,
          tipe: form.tipe as 'Persentase' | 'Nominal',
          target_layanan: form.target_layanan || null,
          status: form.status as 'Aktif' | 'Admin Saja' | 'Nonaktif',
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
    if (!window.confirm(`Hapus event diskon "${nama}"?`)) return;
    try {
      const res = await deleteDiskon(id);
      if (!res.success) { setError(res.error ?? null); return; }
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus.');
    }
  };

  const formatDiskon = (item: DiskonEventRow) => {
    if (item.tipe === 'Persentase') return `${item.potongan}%`;
    return formatCurrency(item.potongan);
  };

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Event Diskon</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Diskon</button>
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat diskon...</p></div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Event</th><th>Potongan</th><th>Tipe</th><th>Target Layanan</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">Belum ada event diskon.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_event}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatDiskon(item)}</td>
                    <td><span className="badge badge-proses">{item.tipe === 'Persentase' ? 'Persen' : 'Nominal'}</span></td>
                    <td>{item.target_layanan || '-'}</td>
                    <td><span className={`badge ${item.status === 'Aktif' ? 'badge-selesai' : 'badge-batal'}`}>{item.status}</span></td>
                    <td>
                      <div className="aksi-group">
                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.nama_event)}>Hapus</button>
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
              <h3>{editingId ? 'Edit Diskon' : 'Tambah Diskon'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Event</label>
                  <input type="text" name="nama_event" className="form-control" value={form.nama_event} onChange={handleChange} placeholder="Nama event diskon" required />
                </div>
                <div className="form-group">
                  <label>Tipe Potongan</label>
                  <select name="tipe" className="form-control" value={form.tipe} onChange={handleChange} required>
                    {TIPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nilai Potongan</label>
                  <input type="number" name="potongan" className="form-control" min={0} value={form.potongan || ''} onChange={handleChange} placeholder={form.tipe === 'Persentase' ? '10 (10%)' : '50000'} required />
                  <small style={{ color: 'var(--gray)', fontSize: '0.75rem' }}>
                    {form.tipe === 'Persentase' ? 'Masukkan angka persen (contoh: 10 untuk 10%)' : 'Masukkan nominal Rupiah (contoh: 50000)'}
                  </small>
                </div>
                <div className="form-group">
                  <label>Target Layanan (opsional)</label>
                  <input type="text" name="target_layanan" className="form-control" value={form.target_layanan} onChange={handleChange} placeholder="Semua layanan" />
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
                <button type="submit" className="btn btn-primary" disabled={saving || !form.nama_event.trim() || form.potongan <= 0}>
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

export default Diskon;
