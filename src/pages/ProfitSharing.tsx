import React, { useState, useEffect } from 'react';
import { getProfitSharingData, getProfitHistorySummary } from '../lib/api';
import { formatCurrency, getMonthRange } from '../lib/utils';
import type { ProfitSharing, ProfitHistory, Dompet } from '../lib/types';

function ProfitSharing() {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState<string>(currentMonth);
  const [profitData, setProfitData] = useState<ProfitSharing | null>(null);
  const [historyData, setHistoryData] = useState<ProfitHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState<boolean>(false);

  // Parse month value to year/month numbers
  function parseMonth(m: string) {
    const parts = m.split('-');
    return { year: parseInt(parts[0], 10), monthNum: parseInt(parts[1], 10) - 1 }; // 0-indexed
  }

  async function loadProfitData(m: string) {
    setLoading(true);
    setError(null);
    try {
      const { year, monthNum } = parseMonth(m);
      const range = getMonthRange(year, monthNum);
      const res = await getProfitSharingData(range.startDate, range.endDate);
      if (res.success && res.data) {
        setProfitData(res.data);
      } else {
        setError(res.message || 'Gagal memuat data profit sharing.');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan saat memuat data profit.');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoryData() {
    setLoadingHistory(true);
    setErrorHistory(null);
    try {
      const res = await getProfitHistorySummary();
      if (res.success && res.data) {
        setHistoryData(res.data);
      } else {
        setErrorHistory(res.message || 'Gagal memuat histori buku besar.');
      }
    } catch (e: any) {
      setErrorHistory(e.message || 'Terjadi kesalahan saat memuat histori.');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadProfitData(month);
  }, [month]);

  useEffect(() => {
    loadHistoryData();
  }, []);

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMonth(e.target.value);
  }

  function handleRefreshHistory() {
    loadHistoryData();
  }

  // --- Dompet breakdown helpers ---
  function renderDompetCard(label: string, base: number | null, pct: number, isPctOnly: boolean = false, color: string = 'var(--primary)') {
    return (
      <div
        className="summary-card"
        key={label}
        style={{ borderLeftColor: color, flex: '1 1 180px' }}
      >
        <div className="label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{label}</div>
        <div className="value" style={{ fontSize: '1.1rem' }}>
          {isPctOnly
            ? `${pct.toFixed(1)}%`
            : `${formatCurrency(base || 0)} + ${pct.toFixed(1)}%`}
        </div>
      </div>
    );
  }

  function renderDompetBreakdown(dompet: Dompet) {
    const cards = [
      { label: 'Owner', base: dompet.ownerBase, pct: dompet.ownerPct, isPctOnly: false, color: '#6366f1' },
      { label: 'Kas Danee', base: dompet.kasBase, pct: dompet.kasPct, isPctOnly: false, color: '#10b981' },
      { label: 'Cuci', base: dompet.cuciBase, pct: dompet.cuciPct, isPctOnly: false, color: '#06b6d4' },
      { label: 'Repair', base: null, pct: dompet.repairPct, isPctOnly: true, color: '#f59e0b' },
      { label: 'Admin', base: dompet.adminBase, pct: dompet.adminPct, isPctOnly: false, color: '#ef4444' },
      { label: 'Web', base: dompet.webBase, pct: dompet.webPct, isPctOnly: false, color: '#8b5cf6' },
      { label: 'Zakat', base: null, pct: dompet.zakatPct, isPctOnly: true, color: '#ec4899' },
      { label: 'Investor', base: null, pct: dompet.investorPct, isPctOnly: true, color: '#14b8a6' },
    ];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {cards.map((c) => renderDompetCard(c.label, c.base, c.pct, c.isPctOnly, c.color))}
      </div>
    );
  }

  // --- Format growth ---
  function formatGrowth(item: ProfitHistory): React.ReactNode {
    if (item.growthRp === undefined || item.growthPct === undefined) return '-';
    const rp = formatCurrency(item.growthRp);
    const pct = item.growthPct;
    const isPositive = item.growthRp >= 0;
    return (
      <span style={{ color: isPositive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' }}>
        {rp} ({pct})
      </span>
    );
  }

  // --- Status target ---
  function renderStatusTarget(nett: number, target: number): React.ReactNode {
    if (target <= 0) return <span style={{ color: 'var(--text-gray)' }}>-</span>;
    const pct = (nett / target) * 100;
    const achieved = nett >= target;
    return (
      <span style={{ color: achieved ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)', fontWeight: 700 }}>
        {achieved ? '✅ Tercapai' : '❌ Belum'} ({pct.toFixed(1)}%)
      </span>
    );
  }

  // --- Main render ---
  return (
    <div className="admin-main">
      {/* Header row: Month Picker + Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-dark)' }}>
          📊 Profit Sharing
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="month-picker" style={{ fontSize: '0.9rem', color: 'var(--text-gray)', fontWeight: 600 }}>
            Periode:
          </label>
          <input
            id="month-picker"
            type="month"
            value={month}
            onChange={handleMonthChange}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
              background: 'white',
              color: 'var(--text-dark)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>

      {/* Loading state for profit data */}
      {loading && (
        <div className="loading-overlay" style={{ minHeight: '200px' }}>
          <div className="loading-spinner" />
          <p style={{ color: 'var(--text-gray)', marginTop: '0.75rem' }}>Memuat data profit sharing...</p>
        </div>
      )}

      {/* Error state for profit data */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadProfitData(month)}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* Profit Data Content */}
      {!loading && !error && profitData && (
        <>
          {/* Summary Cards Row */}
          <div className="summary-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="summary-card" style={{ borderLeftColor: '#6366f1' }}>
              <div className="label">Omset Kotor</div>
              <div className="value">{formatCurrency(profitData.omsetGross)}</div>
            </div>
            <div className="summary-card" style={{ borderLeftColor: '#f59e0b' }}>
              <div className="label">Alokasi HPP</div>
              <div className="value">{formatCurrency(profitData.alokasiHPP)}</div>
            </div>
            <div className="summary-card" style={{ borderLeftColor: '#06b6d4' }}>
              <div className="label">Komisi</div>
              <div className="value">{formatCurrency(profitData.totalKomisi)}</div>
            </div>
            <div className="summary-card" style={{ borderLeftColor: '#10b981' }}>
              <div className="label">Omset Bersih (Nett)</div>
              <div className="value">{formatCurrency(profitData.omsetNett)}</div>
            </div>
          </div>

          {/* Dompet Breakdown */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-dark)' }}>
              💰 Dompet Breakdown
            </h3>
            {renderDompetBreakdown(profitData.dompet)}
          </div>

          {/* Referral Komisi Breakdown (Expandable) */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowReferral((prev) => !prev)}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                🔗 Referral Komisi ({profitData.komisiBreakdown.length})
              </h3>
              <span style={{ fontSize: '1.25rem', color: 'var(--text-gray)', transition: 'transform 0.2s', transform: showReferral ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </div>
            {showReferral && (
              <div style={{ marginTop: '1rem' }}>
                {profitData.komisiBreakdown.length === 0 ? (
                  <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Belum ada komisi referral bulan ini.</p>
                ) : (
                  <div className="table-wrap" style={{ border: 'none', borderRadius: 0, padding: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Layanan</th>
                          <th>Nama Referral</th>
                          <th>Kode</th>
                          <th>Komisi %</th>
                          <th>Nominal</th>
                          <th>Tanggal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitData.komisiBreakdown.map((item, idx) => (
                          <tr key={item.orderId || idx}>
                            <td style={{ fontSize: '0.8rem' }}>{item.orderId}</td>
                            <td>{item.layanan}</td>
                            <td>{item.namaRef}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.kodeRef}</td>
                            <td>{item.komisiPct.toFixed(1)}%</td>
                            <td style={{ fontWeight: 700, textAlign: 'right' }}>{formatCurrency(item.nominal)}</td>
                            <td style={{ fontSize: '0.8rem' }}>{item.tanggal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Histori Buku Besar Section */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
            📋 Histori Buku Besar (3 bulan terakhir)
          </h3>
          <button
            className="btn btn-primary"
            onClick={handleRefreshHistory}
            disabled={loadingHistory}
            style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
          >
            {loadingHistory ? 'Memuat...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Loading history */}
        {loadingHistory && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" />
            <p style={{ color: 'var(--text-gray)', marginTop: '0.75rem' }}>Memuat histori...</p>
          </div>
        )}

        {/* Error history */}
        {!loadingHistory && errorHistory && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ color: 'var(--danger)', marginBottom: '0.75rem', fontWeight: 600 }}>{errorHistory}</p>
            <button className="btn btn-primary" onClick={handleRefreshHistory} style={{ fontSize: '0.85rem' }}>
              Coba Lagi
            </button>
          </div>
        )}

        {/* History Table */}
        {!loadingHistory && !errorHistory && (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, padding: 0 }}>
            {historyData.length === 0 ? (
              <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', padding: '1rem 0' }}>
                Belum ada data histori buku besar.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Periode Bulan</th>
                    <th>Omset Kotor</th>
                    <th>Potongan Modal (HPP)</th>
                    <th>Omset Bersih (Nett)</th>
                    <th>Status Target</th>
                    <th>Pertumbuhan</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((item, idx) => (
                    <tr key={item.bulan || idx}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{item.bulan}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.gross)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.hpp)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.nett)}</td>
                      <td>{renderStatusTarget(item.nett, item.target)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatGrowth(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfitSharing;
