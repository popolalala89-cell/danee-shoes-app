import { useState, useEffect } from 'react';
import { getDashboardSummary } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { DashboardSummary } from '../lib/types';

function Ringkasan() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardSummary();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat ringkasan dashboard.');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-gray)' }}>Memuat ringkasan dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>{error}</p>
        <button className="btn btn-primary" onClick={loadSummary}>
          Coba Lagi
        </button>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Omset Hari Ini',
      value: data ? formatCurrency(data.todayIncome) : '-',
      borderColor: 'var(--success)',
    },
    {
      label: 'Order Aktif',
      value: data ? String(data.activeOrders) : '-',
      borderColor: 'var(--primary)',
    },
    {
      label: 'Stok Menipis',
      value: data ? String(data.lowStock.length) : '-',
      borderColor: 'var(--danger)',
    },
    {
      label: 'Pesanan Selesai',
      value: '-',
      borderColor: 'var(--gold)',
    },
  ];

  return (
    <div className="admin-main">
      {/* Summary Grid */}
      <div className="summary-grid">
        {summaryCards.map((card, idx) => (
          <div
            key={idx}
            className="summary-card"
            style={{ borderLeftColor: card.borderColor }}
          >
            <div className="label">{card.label}</div>
            <div className="value">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Top Layanan */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-dark)' }}>
            🏆 Top Layanan
          </h3>
          {data && data.topLayanan && data.topLayanan.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem' }}>Layanan</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '0.8rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.topLayanan.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-gray)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px' }}>{item.nama}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Belum ada data layanan.</p>
          )}
        </div>

        {/* Top Produk */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-dark)' }}>
            🥇 Top Produk
          </h3>
          {data && data.topProduk && data.topProduk.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem' }}>Produk</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '0.8rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.topProduk.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-gray)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px' }}>{item.nama}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Belum ada data produk.</p>
          )}
        </div>
      </div>

      {/* Stok Menipis Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            ⚠️ Stok Menipis
          </h3>
        </div>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          {data && data.lowStock && data.lowStock.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Stok Sistem</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock.map((item, idx) => (
                  <tr key={item.ProdukID || idx}>
                    <td>{item.NamaProduk}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: item.StokSistem === 0 ? '#fee2e2' : '#fef3c7',
                          color: item.StokSistem === 0 ? '#991b1b' : '#92400e',
                        }}
                      >
                        {item.StokSistem}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-gray)' }}>
              Semua stok aman. ✅
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Ringkasan;
