import { useState, useEffect } from 'react';
import { getRingkasan } from '../lib/services/dashboard-service';
import { formatCurrency, formatDate } from '../lib/utils';
import type { DashboardSummary } from '../lib/types-supabase';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg, #fbbf24, #d4af37)', color: '#fff',
        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
        boxShadow: '0 2px 6px rgba(212,175,55,0.4)',
      }}>1</span>
    );
  if (rank === 2)
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg, #d1d5db, #9ca3af)', color: '#fff',
        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
        boxShadow: '0 2px 6px rgba(156,163,175,0.35)',
      }}>2</span>
    );
  if (rank === 3)
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff',
        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
        boxShadow: '0 2px 6px rgba(217,119,6,0.35)',
      }}>3</span>
    );
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%',
      background: '#f1f5f9', color: '#64748b',
      fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
    }}>{rank}</span>
  );
}

function Ringkasan() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSummary(); }, []);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await getRingkasan();
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

  const topLayananMax = data?.topLayanan && data.topLayanan.length > 0 ? Math.max(...data.topLayanan.map((l) => l.total)) : 1;
  const topProdukMax = data?.topProduk && data.topProduk.length > 0 ? Math.max(...data.topProduk.map((p) => p.total)) : 1;
  const lowStockCount = data?.lowStock?.length ?? 0;

  return (
    <div className="admin-main">
      <div className="admin-topbar"><h1>Ringkasan</h1></div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderLeft: '4px solid var(--success)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-sm)', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}>💰</div>
          <div className="label">Omset Hari Ini</div>
          <div className="value" style={{ color: '#059669' }}>{data ? formatCurrency(data.todayIncome ?? 0) : '-'}</div>
        </div>
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-sm)', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>📊</div>
          <div className="label">Order Aktif</div>
          <div className="value" style={{ color: '#2563eb' }}>{data ? String(data.activeOrders ?? 0) : '-'}</div>
        </div>
        <div className="summary-card" style={{ background: lowStockCount > 0 ? 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderLeft: `4px solid ${lowStockCount > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: lowStockCount > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-sm)', boxShadow: lowStockCount > 0 ? '0 2px 8px rgba(239,68,68,0.25)' : '0 2px 8px rgba(16,185,129,0.25)' }}>📦</div>
          <div className="label">Stok Menipis</div>
          <div className="value" style={{ color: lowStockCount > 0 ? '#dc2626' : '#059669' }}>{data ? String(lowStockCount) : '-'}</div>
        </div>
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', borderLeft: '4px solid var(--gold)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #d4af37, #b8961f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-sm)', boxShadow: '0 2px 8px rgba(212,175,55,0.25)' }}>⚡</div>
          <div className="label">Total Orders</div>
          <div className="value" style={{ color: '#92400e' }}>{data ? String(data.activeOrders + (data as any).Selesai || 0) : '-'}</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏆</span>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-dark)' }}>Top Layanan</h3>
          </div>
          <div style={{ padding: 'var(--space-sm) 0' }}>
            {data && data.topLayanan && data.topLayanan.length > 0 ? (
              data.topLayanan.slice(0, 5).map((item, idx) => (
                <div key={idx} style={{ padding: '10px var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', borderBottom: idx < Math.min(data.topLayanan.length, 5) - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <RankBadge rank={idx + 1} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nama}</div>
                    <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ width: `${topLayananMax > 0 ? (item.total / topLayananMax) * 100 : 0}%`, height: '100%', borderRadius: 2, background: idx === 0 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : idx === 1 ? 'linear-gradient(90deg, #d1d5db, #9ca3af)' : idx === 2 ? 'linear-gradient(90deg, #d97706, #b45309)' : 'linear-gradient(90deg, #3b82f6, #2563eb)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>{item.total}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-gray)', fontSize: '0.875rem' }}>Belum ada data layanan</div>
            )}
          </div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🥇</span>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-dark)' }}>Top Produk</h3>
          </div>
          <div style={{ padding: 'var(--space-sm) 0' }}>
            {data && data.topProduk && data.topProduk.length > 0 ? (
              data.topProduk.slice(0, 5).map((item, idx) => (
                <div key={idx} style={{ padding: '10px var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', borderBottom: idx < Math.min(data.topProduk.length, 5) - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <RankBadge rank={idx + 1} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nama}</div>
                    <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ width: `${topProdukMax > 0 ? (item.total / topProdukMax) * 100 : 0}%`, height: '100%', borderRadius: 2, background: idx === 0 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : idx === 1 ? 'linear-gradient(90deg, #d1d5db, #9ca3af)' : idx === 2 ? 'linear-gradient(90deg, #d97706, #b45309)' : 'linear-gradient(90deg, #3b82f6, #2563eb)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>{item.total}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-gray)', fontSize: '0.875rem' }}>Belum ada data produk</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: lowStockCount > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-dark)' }}>Stok Menipis</h3>
          {lowStockCount > 0 && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-full)', minWidth: 28 }}>{lowStockCount}</span>
          )}
        </div>
        <div style={{ padding: 'var(--space-sm)' }}>
          {data && data.lowStock && data.lowStock.length > 0 ? (
            data.lowStock.map((item, idx) => {
              const isOut = item.stok_sistem === 0;
              const isCritical = item.stok_sistem <= 2;
              return (
                <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '12px var(--space-md)', borderRadius: 'var(--radius-sm)', background: isOut ? '#fef2f2' : isCritical ? '#fffbeb' : '#f8fafc', border: isOut ? '1px solid #fecaca' : isCritical ? '1px solid #fde68a' : '1px solid #f1f5f9', marginBottom: 'var(--space-xs)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOut ? '#ef4444' : isCritical ? '#f59e0b' : '#64748b', flexShrink: 0, boxShadow: isOut ? '0 0 6px rgba(239,68,68,0.4)' : isCritical ? '0 0 6px rgba(245,158,11,0.4)' : 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nama_produk}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: isOut ? '#fee2e2' : isCritical ? '#fef3c7' : '#e2e8f0', color: isOut ? '#991b1b' : isCritical ? '#92400e' : '#475569', flexShrink: 0 }}>
                    {item.stok_sistem}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-xl) var(--space-md)', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>✅</div>
              <p style={{ color: 'var(--text-gray)', fontSize: '0.9375rem', fontWeight: 500 }}>Semua stok aman</p>
              <p style={{ color: 'var(--gray)', fontSize: '0.8125rem', marginTop: 4 }}>Tidak ada produk yang perlu di restock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Ringkasan;
