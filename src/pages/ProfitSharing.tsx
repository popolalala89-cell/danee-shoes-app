import { useState, useEffect } from 'react';
import { getProfitSharingData, getProfitHistorySummary } from '../lib/services/profit-service';
import { formatCurrency } from '../lib/utils';
import type { ProfitSharingData, ProfitHistory } from '../lib/types-supabase';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const WALLET_META = [
  { key: 'ownerBase', label: 'Owner (Base)', color: '#2563eb' },
  { key: 'ownerPct', label: 'Owner (Pct)', color: '#3b82f6' },
  { key: 'cuciBase', label: 'Cuci (Base)', color: '#059669' },
  { key: 'cuciPct', label: 'Cuci (Pct)', color: '#10b981' },
  { key: 'repairPct', label: 'Repair (Pct)', color: '#d97706' },
  { key: 'adminBase', label: 'Admin (Base)', color: '#7c3aed' },
  { key: 'adminPct', label: 'Admin (Pct)', color: '#8b5cf6' },
  { key: 'webBase', label: 'Web (Base)', color: '#0891b2' },
  { key: 'webPct', label: 'Web (Pct)', color: '#06b6d4' },
  { key: 'kasBase', label: 'Kas (Base)', color: '#dc2626' },
  { key: 'kasPct', label: 'Kas (Pct)', color: '#ef4444' },
  { key: 'zakatPct', label: 'Zakat (Pct)', color: '#d4af37' },
  { key: 'investorPct', label: 'Investor (Pct)', color: '#4f46e5' },
];

const ProfitSharing: React.FC = () => {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [data, setData] = useState<ProfitSharingData | null>(null);
  const [history, setHistory] = useState<ProfitHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profitRes, historyRes] = await Promise.all([
        getProfitSharingData(bulan, tahun),
        getProfitHistorySummary(),
      ]);
      if (profitRes.success) setData(profitRes.data || null);
      else setError(profitRes.error || 'Gagal memuat profit sharing.');
      if (historyRes.success) setHistory(historyRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [bulan, tahun]);

  const penCapaian = data ? (data.omsetNett / (data.target || 1)) * 100 : 0;
  const cleanedRevenue = data ? data.omsetGross - data.alokasiHPP : 0;
  const repairRevenue = data?.alokasiHPP ?? 0;

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Profit Sharing</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <select className="form-control" value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} style={{ maxWidth: 140 }}>
            {BULAN.map((nama, idx) => <option key={idx} value={idx + 1}>{nama}</option>)}
          </select>
          <select className="form-control" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} style={{ maxWidth: 100 }}>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-sm btn-outline" onClick={fetchData} disabled={loading}>&#x21bb;</button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /><p>Menghitung profit sharing...</p></div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-gray)' }}>Tidak ada data untuk bulan ini.</div>
      ) : (
        <>
          {/* Summary */}
          <div className="summary-grid" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderLeft: '4px solid var(--success)' }}>
              <div className="label">Omset Gross</div>
              <div className="value" style={{ color: '#059669', fontSize: '1.125rem' }}>{formatCurrency(data.omsetGross)}</div>
            </div>
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)', borderLeft: '4px solid #d97706' }}>
              <div className="label">Alokasi HPP</div>
              <div className="value" style={{ color: '#d97706' }}>{formatCurrency(data.alokasiHPP)}</div>
            </div>
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', borderLeft: '4px solid var(--danger)' }}>
              <div className="label">Total Komisi</div>
              <div className="value" style={{ color: '#dc2626' }}>{formatCurrency(data.totalKomisi)}</div>
            </div>
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)', borderLeft: '4px solid var(--primary)' }}>
              <div className="label">Omset Net</div>
              <div className="value" style={{ color: '#2563eb', fontSize: '1.125rem' }}>{formatCurrency(data.omsetNett)}</div>
            </div>
          </div>

          {/* Target Progress */}
          <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
              <span style={{ fontWeight: 600 }}>Target: {formatCurrency(data.target)}</span>
              <span style={{ fontWeight: 700, color: penCapaian >= 100 ? '#059669' : '#d97706' }}>
                {penCapaian.toFixed(1)}% tercapai
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(penCapaian, 100)}%`, height: '100%', borderRadius: 6, background: penCapaian >= 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #fbbf24, #d97706)', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 4 }}>Cleaning Revenue</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(cleanedRevenue)}</div>
            </div>
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 4 }}>Repair Revenue</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{formatCurrency(repairRevenue)}</div>
            </div>
          </div>

          {/* Wallet Distribution */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}>Distribusi Dompet</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            {WALLET_META.map((wallet) => {
              const value = (data.dompet as any)[wallet.key] || 0;
              return (
                <div key={wallet.key} className="card" style={{ padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${wallet.color}` }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-gray)' }}>{wallet.label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{formatCurrency(value)}</span>
                </div>
              );
            })}
          </div>

          {/* Commission Table */}
          {data.komisiBreakdown && data.komisiBreakdown.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}>Komisi Referral</h3>
              <div className="table-wrap" style={{ marginBottom: 'var(--space-lg)' }}>
                <table>
                  <thead>
                    <tr><th>Order</th><th>Referral</th><th>Kode</th><th>%</th><th>Nominal</th></tr>
                  </thead>
                  <tbody>
                    {data.komisiBreakdown.map((k, idx) => (
                      <tr key={idx}>
                        <td>{k.orderId}</td>
                        <td>{k.namaRef}</td>
                        <td>{k.kodeRef}</td>
                        <td>{k.komisiPct}%</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(k.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* History */}
          {history.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}>Riwayat Profit</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Bulan</th><th>Gross</th><th>HPP</th><th>Net</th><th>Pertumbuhan</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{h.bulan}</td>
                        <td>{formatCurrency(h.gross)}</td>
                        <td>{formatCurrency(h.hpp)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(h.nett)}</td>
                        <td style={{ color: (h.growthRp || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                          {h.growthRp !== undefined ? `${(h.growthRp || 0) >= 0 ? '+' : ''}${formatCurrency(h.growthRp)} (${h.growthPct || '0'}%)` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ProfitSharing;
