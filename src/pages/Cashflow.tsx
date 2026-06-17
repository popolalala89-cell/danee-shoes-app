import { useState, useEffect } from 'react';
import { getAll as getAllCashflow, create as createCashflow, getSummary as getCashflowSummary } from '../lib/services/cashflow-service';
import { formatCurrency, formatDate } from '../lib/utils';
import type { CashflowRow } from '../lib/types-supabase';

const FILTER_TIPE = ['Semua', 'Pemasukan', 'Pengeluaran'] as const;

const Cashflow: React.FC = () => {
  const [data, setData] = useState<CashflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTipe, setFilterTipe] = useState<string>('Semua');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Summary
  const [summary, setSummary] = useState<{ totalPemasukan: number; totalPengeluaran: number; saldo: number } | null>(null);

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [formTipe, setFormTipe] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [formKategori, setFormKategori] = useState('');
  const [formJumlah, setFormJumlah] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tipeFilter = filterTipe === 'Semua' ? undefined : filterTipe as 'Pemasukan' | 'Pengeluaran';
      const startDate = dateStart || undefined;
      const endDate = dateEnd || undefined;

      const [dataRes, summaryRes] = await Promise.all([
        getAllCashflow(tipeFilter, startDate, endDate),
        getCashflowSummary(startDate, endDate),
      ]);

      if (dataRes.success) setData(dataRes.data || []);
      else setError(dataRes.error || 'Gagal memuat cashflow.');

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterTipe, dateStart, dateEnd]);

  const openAdd = () => {
    setFormTipe('Pemasukan');
    setFormKategori('');
    setFormJumlah('');
    setFormKeterangan('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJumlah || parseFloat(formJumlah) <= 0) return;
    setSubmitting(true);
    try {
      const res = await createCashflow({
        tipe: formTipe,
        kategori: formKategori.trim() || '',
        jumlah: parseFloat(formJumlah),
        keterangan: formKeterangan.trim() || null,
      });
      if (res.success) {
        setShowModal(false);
        await fetchData();
      } else {
        setError(res.error || 'Gagal menyimpan.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  const total = summary || { totalPemasukan: 0, totalPengeluaran: 0, saldo: 0 };

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Cashflow</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah</button>
      </div>

      {/* Summary Bar */}
      <div className="summary-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderLeft: '4px solid var(--success)' }}>
          <div className="label">Pemasukan</div>
          <div className="value" style={{ color: '#059669' }}>{formatCurrency(total.totalPemasukan)}</div>
        </div>
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', borderLeft: '4px solid var(--danger)' }}>
          <div className="label">Pengeluaran</div>
          <div className="value" style={{ color: '#dc2626' }}>{formatCurrency(total.totalPengeluaran)}</div>
        </div>
        <div className="summary-card" style={{ background: total.saldo >= 0 ? 'linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', borderLeft: `4px solid ${total.saldo >= 0 ? 'var(--primary)' : 'var(--danger)'}` }}>
          <div className="label">Selisih</div>
          <div className="value" style={{ color: total.saldo >= 0 ? '#2563eb' : '#dc2626' }}>{formatCurrency(total.saldo)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="tab-btns">
          {FILTER_TIPE.map((f) => (
            <button key={f} className={`tab-btn ${filterTipe === f ? 'active' : ''}`} onClick={() => setFilterTipe(f)}>{f}</button>
          ))}
        </div>
        <input type="date" className="form-control" value={dateStart} onChange={(e) => setDateStart(e.target.value)} style={{ maxWidth: 160 }} />
        <span style={{ color: 'var(--gray)' }}>—</span>
        <input type="date" className="form-control" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} style={{ maxWidth: 160 }} />
        {(dateStart || dateEnd || filterTipe !== 'Semua') && (
          <button className="btn btn-sm btn-outline" onClick={() => { setDateStart(''); setDateEnd(''); setFilterTipe('Semua'); }}>Reset</button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && (
        <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat cashflow...</p></div>
      )}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Keterangan</th><th>Jumlah</th></tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">Belum ada data cashflow.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.tanggal || '')}</td>
                    <td><span className={`badge ${item.tipe === 'Pemasukan' ? 'badge-selesai' : 'badge-batal'}`}>{item.tipe}</span></td>
                    <td>{item.kategori || '-'}</td>
                    <td>{item.keterangan || '-'}</td>
                    <td style={{ fontWeight: 700, color: item.tipe === 'Pemasukan' ? '#059669' : '#dc2626' }}>{item.tipe === 'Pemasukan' ? '+' : '-'}{formatCurrency(item.jumlah)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Cashflow</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tipe</label>
                  <select className="form-control" value={formTipe} onChange={(e) => setFormTipe(e.target.value as 'Pemasukan' | 'Pengeluaran')} required>
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <input type="text" className="form-control" value={formKategori} onChange={(e) => setFormKategori(e.target.value)} placeholder="Kategori (opsional)" />
                </div>
                <div className="form-group">
                  <label>Jumlah (Rp)</label>
                  <input type="number" className="form-control" min={0} value={formJumlah} onChange={(e) => setFormJumlah(e.target.value)} placeholder="0" required />
                </div>
                <div className="form-group">
                  <label>Keterangan</label>
                  <textarea className="form-control" rows={3} value={formKeterangan} onChange={(e) => setFormKeterangan(e.target.value)} placeholder="Keterangan (opsional)" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={() => setShowModal(false)} disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !formJumlah || parseFloat(formJumlah) <= 0}>
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

export default Cashflow;
