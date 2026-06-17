import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRingkasan } from '../lib/services/dashboard-service';
import { formatCurrency } from '../lib/utils';
import type { DashboardSummary, OrderRow } from '../lib/types-supabase';
import FAB from '../components/ui/FAB';

const STATUS_LABELS: Record<string, string> = {
  Waiting: '⏳ Waiting',
  Checking: '🔍 Checking',
  'Proses Cleaning': '🧹 Cleaning',
  'Proses Repair': '🔧 Repair',
  'Proses Pengeringan': '💨 Pengeringan',
  Ready: '✅ Ready',
  Selesai: '✅ Selesai',
  Batal: '❌ Batal',
};

function Ringkasan() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('bulan_ini');

  useEffect(() => { loadSummary(); }, [period]);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await getRingkasan(period);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Gagal memuat ringkasan dashboard.');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-main">
        <div className="admin-topbar"><h1>Ringkasan</h1></div>
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p style={{ color: 'var(--text-gray)', marginTop: 'var(--space-md)', fontSize: '0.9375rem' }}>
            Memuat ringkasan dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-main">
        <div className="admin-topbar"><h1>Ringkasan</h1></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem var(--space-md)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: 'var(--space-md)' }}>⚠️</div>
          <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>{error}</p>
          <button className="btn btn-primary" onClick={loadSummary} style={{ marginTop: 'var(--space-sm)' }}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      <div className="admin-topbar"><h1>Ringkasan</h1></div>

      {/* ─── 3 KARTU ATAS (AppScript style) ─── */}
      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        {/* Kartu 1: Pendapatan Hari Ini */}
        <div className="card" style={{ padding: 'var(--space-md)', borderTop: '5px solid var(--success)' }}>
          <div className="s-label" style={{ color: 'var(--success)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mat-icon" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 4, color: 'var(--success)' }}>payments</span> Pendapatan Hari Ini
          </div>
          <div className="s-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
            {formatCurrency(data?.todayIncome ?? 0)}
          </div>
          <div className="s-sub" style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginTop: 4 }}>
            Total pemasukan hari ini
          </div>
        </div>

        {/* Kartu 2: Pesanan Aktif + Daftar Antrean */}
        <div className="card" style={{ padding: 'var(--space-md)', borderTop: '5px solid var(--primary)' }}>
          <div className="s-label" style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            📋 Pesanan Aktif
          </div>
          <div className="s-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
            {data?.activeOrders ?? 0}
          </div>
          <div className="s-sub" style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 8 }}>
            Belum selesai
          </div>
          {data?.activeOrdersList && data.activeOrdersList.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px dashed #cbd5e1', paddingTop: 10, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.activeOrdersList.map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '4px 0' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>
                    {o.nama_pelanggan || '-'}
                  </span>
                  <span style={{ color: 'var(--gray)', fontSize: '0.7rem' }}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kartu 3: Peringatan Stok */}
        <div className="card" style={{ padding: 'var(--space-md)', borderTop: `5px solid ${(data?.lowStock?.length ?? 0) > 0 ? 'var(--warning)' : 'var(--success)'}` }}>
          <div className="s-label" style={{ color: (data?.lowStock?.length ?? 0) > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            {(data?.lowStock?.length ?? 0) > 0 ? '⚠️ Peringatan Stok' : '✅ Status Stok'}
          </div>
          {data && data.lowStock && data.lowStock.length > 0 ? (
            <>
              <div className="s-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                {data.lowStock.length} <small style={{ fontSize: '1rem', color: 'var(--text-gray)' }}>Item Menipis</small>
              </div>
              <div style={{ marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 15, fontSize: '0.85rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                {data.lowStock.slice(0, 3).map((item, idx) => (
                  <div key={item.id || idx} style={{ marginBottom: 8 }}>
                    {item.nama_produk} <b style={{ float: 'right', color: 'var(--danger)' }}>{item.stok_sistem}</b>
                  </div>
                ))}
                {data.lowStock.length > 3 && (
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-gray)', fontStyle: 'italic', borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                    + {data.lowStock.length - 3} item lainnya (Cek tab Inventory)
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="s-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Aman
              </div>
              <div className="s-sub" style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginTop: 8 }}>
                Semua operasional siap.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── LEADERBOARD: KOMODITAS TERLARIS ─── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <span className="mat-icon" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 4, color: 'var(--warning)' }}>emoji_events</span> Komoditas Terlaris
          </h3>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="form-control"
            style={{ width: 'auto', height: 32, padding: '0 0.5rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: 6, cursor: 'pointer', color: '#1e293b', border: '1px solid #cbd5e1' }}
          >
            <option value="bulan_ini">Bulan Ini</option>
            <option value="sepanjang_masa">Sepanjang Masa</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {/* Kolom Kiri: Top Jasa */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 12, borderBottom: '2px solid rgba(0,95,163,0.1)', paddingBottom: 6 }}>
              🛎️ Top 5 Jasa Terlaris
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data && data.topLayanan && data.topLayanan.length > 0 ? (
                data.topLayanan.map((item, idx) => {
                  const maxTotal = data.topLayanan[0].total || 1;
                  const pct = (item.total / maxTotal) * 100;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                        <span>{idx + 1}. {item.nama}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{item.total} Order</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(to right, #38bdf8, var(--primary))', borderRadius: 10 }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-gray)', padding: '1rem 0' }}>Belum ada data transaksi untuk periode ini.</p>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Top Produk */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 700, marginBottom: 12, borderBottom: '2px solid rgba(16,185,129,0.1)', paddingBottom: 6 }}>
              <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4, color: 'var(--primary)' }}>inventory_2</span> Top 5 Produk Terlaris
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data && data.topProduk && data.topProduk.length > 0 ? (
                data.topProduk.map((item, idx) => {
                  const maxTotal = data.topProduk[0].total || 1;
                  const pct = (item.total / maxTotal) * 100;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, color: '#334155' }}>
                        <span>{idx + 1}. {item.nama}</span>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>{item.total} Pcs</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(to right, #34d399, var(--success))', borderRadius: 10 }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-gray)', padding: '1rem 0' }}>Belum ada data transaksi untuk periode ini.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB — Tambah Pesanan Baru */}
      <FAB icon="add" onClick={() => navigate('/admin/pesanan')} />
    </div>
  );
}

export default Ringkasan;
