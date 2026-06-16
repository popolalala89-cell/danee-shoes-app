import React, { useState, useEffect } from 'react';
import { getProfitSharingData, getProfitHistorySummary } from '../lib/api';
import { formatCurrency, getMonthRange } from '../lib/utils';
import type { ProfitSharing, ProfitHistory, Dompet } from '../lib/types';

/* ═══════════════════════════════════════════════════════════════
   ProfitSharing — Material Design Android Finance App
   ═══════════════════════════════════════════════════════════════ */

// ── Icon components (SVG) ────────────────────────────────────
const Icons = {
  revenue: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  cost: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  commission: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  wallet: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  chevronDown: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  history: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  link: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
};

// ── Dompet item config ───────────────────────────────────────
const DOMPET_CONFIG = [
  { key: 'owner' as const, label: 'Owner', icon: '👑', color: '#6366f1', bgLight: '#eef2ff' },
  { key: 'kas' as const, label: 'Kas Danee', icon: '🏦', color: '#10b981', bgLight: '#ecfdf5' },
  { key: 'cuci' as const, label: 'Cuci', icon: '👔', color: '#06b6d4', bgLight: '#ecfeff' },
  { key: 'repair' as const, label: 'Repair', icon: '🔧', color: '#f59e0b', bgLight: '#fffbeb' },
  { key: 'admin' as const, label: 'Admin', icon: '⚙️', color: '#ef4444', bgLight: '#fef2f2' },
  { key: 'web' as const, label: 'Web', icon: '🌐', color: '#8b5cf6', bgLight: '#f5f3ff' },
  { key: 'zakat' as const, label: 'Zakat', icon: '🤲', color: '#ec4899', bgLight: '#fdf2f8' },
  { key: 'investor' as const, label: 'Investor', icon: '📈', color: '#14b8a6', bgLight: '#f0fdfa' },
];

// ── Main Component ───────────────────────────────────────────
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
    return { year: parseInt(parts[0], 10), monthNum: parseInt(parts[1], 10) - 1 };
  }

  // Format month for display: "2026-06" -> "Juni 2026"
  function formatMonthDisplay(m: string): string {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const parts = m.split('-');
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${months[monthIdx] || ''} ${year}`;
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

  function handlePrevMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function handleNextMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function handleRefreshHistory() {
    loadHistoryData();
  }

  // ── Dompet breakdown helpers ──────────────────────────────
  function getDompetValue(dompet: Dompet, key: string): { base: number | null; pct: number } {
    const d = dompet as any;
    const isPctOnly = key === 'repair' || key === 'zakat' || key === 'investor';
    const base = isPctOnly ? null : (d[key + 'Base'] ?? null);
    const pct = d[key + 'Pct'] ?? 0;
    return { base, pct };
  }

  function renderDompetGrid(dompet: Dompet) {
    return (
      <div className="dompet-grid">
        {DOMPET_CONFIG.map((cfg) => {
          const { base, pct } = getDompetValue(dompet, cfg.key);
          const isPctOnly = base === null;
          return (
            <div key={cfg.key} className="dompet-item" style={{ borderLeftColor: cfg.color }}>
              <div className="dompet-item-header">
                <span className="dompet-icon" style={{ background: cfg.bgLight, color: cfg.color }}>
                  {cfg.icon}
                </span>
                <span className="dompet-label">{cfg.label}</span>
              </div>
              <div className="dompet-value">
                {isPctOnly
                  ? `${(pct ?? 0).toFixed(1)}%`
                  : `${formatCurrency(base ?? 0)}`}
              </div>
              {!isPctOnly && (
                <div className="dompet-pct-bar">
                  <div className="dompet-pct-fill" style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: cfg.color }} />
                </div>
              )}
              {isPctOnly && (
                <div className="dompet-pct-badge" style={{ background: cfg.bgLight, color: cfg.color }}>
                  {(pct ?? 0).toFixed(1)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Format growth ──────────────────────────────────────────
  function formatGrowth(item: ProfitHistory): React.ReactNode {
    if (item.growthRp === undefined || item.growthPct === undefined) return '-';
    const rp = formatCurrency(item.growthRp);
    const pct = item.growthPct;
    const isPositive = item.growthRp >= 0;
    return (
      <span className={`growth-badge ${isPositive ? 'growth-positive' : 'growth-negative'}`}>
        {isPositive ? '↑' : '↓'} {rp} ({pct})
      </span>
    );
  }

  // ── Status target ──────────────────────────────────────────
  function renderStatusTarget(nett: number, target: number): React.ReactNode {
    if (target <= 0) return <span className="text-muted">-</span>;
    const pct = (nett / target) * 100;
    const achieved = nett >= target;
    return (
      <span className={`status-badge ${achieved ? 'badge-success' : 'badge-danger'}`}>
        {achieved ? '✅ Tercapai' : '❌ Belum'} ({pct.toFixed(1)}%)
      </span>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="admin-main">

      {/* ═══════════════════════════════════════════════════
          HEADER — Month Picker (Material Design)
          ═══════════════════════════════════════════════════ */}
      <div className="ps-header">
        <div className="ps-header-left">
          <h2 className="ps-title">📊 Profit Sharing</h2>
          <p className="ps-subtitle">{formatMonthDisplay(month)}</p>
        </div>
        <div className="ps-month-picker">
          <button className="ps-month-nav" onClick={handlePrevMonth} aria-label="Bulan sebelumnya">
            ‹
          </button>
          <div className="ps-month-display">
            {Icons.calendar}
            <span>{formatMonthDisplay(month)}</span>
            <input
              id="month-picker"
              type="month"
              value={month}
              onChange={handleMonthChange}
              className="ps-month-input"
            />
          </div>
          <button className="ps-month-nav" onClick={handleNextMonth} aria-label="Bulan berikutnya">
            ›
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LOADING STATE
          ═══════════════════════════════════════════════════ */}
      {loading && (
        <div className="loading-overlay" style={{ minHeight: '200px' }}>
          <div className="loading-spinner" />
          <p>Memuat data profit sharing...</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          ERROR STATE
          ═══════════════════════════════════════════════════ */}
      {!loading && error && (
        <div className="error-box">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary btn-sm" onClick={() => loadProfitData(month)}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          PROFIT DATA CONTENT
          ═══════════════════════════════════════════════════ */}
      {!loading && !error && profitData && (
        <>

          {/* ── Summary Cards ─────────────────────────── */}
          <div className="ps-summary-row">
            <div className="ps-summary-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
              <div className="ps-summary-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>
                {Icons.revenue}
              </div>
              <div className="ps-summary-info">
                <span className="ps-summary-label">Omset Kotor</span>
                <span className="ps-summary-value">{formatCurrency(profitData.omsetGross ?? 0)}</span>
              </div>
            </div>

            <div className="ps-summary-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
              <div className="ps-summary-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                {Icons.cost}
              </div>
              <div className="ps-summary-info">
                <span className="ps-summary-label">Alokasi HPP</span>
                <span className="ps-summary-value">{formatCurrency(profitData.alokasiHPP ?? 0)}</span>
              </div>
            </div>

            <div className="ps-summary-card" style={{ '--accent': '#06b6d4' } as React.CSSProperties}>
              <div className="ps-summary-icon" style={{ background: '#ecfeff', color: '#06b6d4' }}>
                {Icons.commission}
              </div>
              <div className="ps-summary-info">
                <span className="ps-summary-label">Komisi</span>
                <span className="ps-summary-value">{formatCurrency(profitData.totalKomisi ?? 0)}</span>
              </div>
            </div>

            <div className="ps-summary-card ps-summary-highlight" style={{ '--accent': '#10b981' } as React.CSSProperties}>
              <div className="ps-summary-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                {Icons.wallet}
              </div>
              <div className="ps-summary-info">
                <span className="ps-summary-label">Omset Bersih (Nett)</span>
                <span className="ps-summary-value ps-value-highlight">{formatCurrency(profitData.omsetNett ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* ── Dompet Breakdown ──────────────────────── */}
          <div className="ps-section card">
            <div className="ps-section-header">
              <div className="ps-section-title-group">
                <span className="ps-section-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>💰</span>
                <h3 className="ps-section-title">Dompet Breakdown</h3>
              </div>
            </div>
            {profitData.dompet && renderDompetGrid(profitData.dompet)}
          </div>

          {/* ── Referral Komisi (Expandable) ──────────── */}
          <div className="ps-section card">
            <div
              className="ps-section-header ps-clickable"
              onClick={() => setShowReferral((prev) => !prev)}
            >
              <div className="ps-section-title-group">
                <span className="ps-section-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
                  {Icons.link}
                </span>
                <h3 className="ps-section-title">
                  Referral Komisi ({(profitData.komisiBreakdown || []).length})
                </h3>
              </div>
              <span className={`ps-chevron ${showReferral ? 'ps-chevron-open' : ''}`}>
                {Icons.chevronDown}
              </span>
            </div>
            {showReferral && (
              <div className="ps-section-body">
                {(profitData.komisiBreakdown || []).length === 0 ? (
                  <div className="ps-empty-state">
                    <span className="ps-empty-icon">🔗</span>
                    <p>Belum ada komisi referral bulan ini.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Layanan</th>
                          <th>Nama Referral</th>
                          <th>Kode</th>
                          <th>Komisi %</th>
                          <th style={{ textAlign: 'right' }}>Nominal</th>
                          <th>Tanggal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(profitData.komisiBreakdown || []).map((item, idx) => (
                          <tr key={item.orderId || idx}>
                            <td className="ps-mono">{item.orderId}</td>
                            <td>{item.layanan}</td>
                            <td>{item.namaRef}</td>
                            <td className="ps-mono">{item.kodeRef}</td>
                            <td>{(item.komisiPct ?? 0).toFixed(1)}%</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {formatCurrency(item.nominal ?? 0)}
                            </td>
                            <td className="ps-date">{item.tanggal}</td>
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

      {/* ═══════════════════════════════════════════════════
          HISTORI BUKU BESAR
          ═══════════════════════════════════════════════════ */}
      <div className="ps-section card">
        <div className="ps-section-header">
          <div className="ps-section-title-group">
            <span className="ps-section-icon" style={{ background: '#f0f4ff', color: '#3b82f6' }}>
              {Icons.history}
            </span>
            <h3 className="ps-section-title">Histori Buku Besar</h3>
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleRefreshHistory}
            disabled={loadingHistory}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loadingHistory ? (
              <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
            ) : (
              Icons.refresh
            )}
            {loadingHistory ? 'Memuat...' : 'Refresh'}
          </button>
        </div>

        {/* Loading history */}
        {loadingHistory && (
          <div className="loading-overlay" style={{ minHeight: '120px' }}>
            <div className="loading-spinner" />
            <p>Memuat histori...</p>
          </div>
        )}

        {/* Error history */}
        {!loadingHistory && errorHistory && (
          <div className="error-box">
            <p className="error-text">{errorHistory}</p>
            <button className="btn btn-primary btn-sm" onClick={handleRefreshHistory}>
              Coba Lagi
            </button>
          </div>
        )}

        {/* History Table */}
        {!loadingHistory && !errorHistory && (
          <div className="table-wrap">
            {historyData.length === 0 ? (
              <div className="ps-empty-state">
                <span className="ps-empty-icon">📋</span>
                <p>Belum ada data histori buku besar.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th style={{ textAlign: 'right' }}>Omset Kotor</th>
                    <th style={{ textAlign: 'right' }}>Potongan HPP</th>
                    <th style={{ textAlign: 'right' }}>Omset Bersih</th>
                    <th>Status Target</th>
                    <th style={{ textAlign: 'right' }}>Pertumbuhan</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((item, idx) => (
                    <tr key={item.bulan || idx} className={idx % 2 === 1 ? 'ps-row-alt' : ''}>
                      <td className="ps-mono">{item.bulan}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.gross ?? 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.hpp ?? 0)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(item.nett ?? 0)}
                      </td>
                      <td>{renderStatusTarget(item.nett, item.target)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {formatGrowth(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          INLINE STYLES — ProfitSharing specific
          ═══════════════════════════════════════════════════ */}
      <style>{`
        /* ── Header ──────────────────────────────────────── */
        .ps-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-lg);
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        .ps-header-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ps-title {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 500;
          color: var(--text-dark);
        }
        .ps-subtitle {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--text-gray);
          font-weight: 400;
        }

        /* ── Month Picker ────────────────────────────────── */
        .ps-month-picker {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--white);
          border-radius: var(--radius-full);
          box-shadow: var(--elevation-1);
          padding: 2px;
        }
        .ps-month-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: var(--text-dark);
          font-size: 1.25rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 50%;
          transition: var(--transition-fast);
          -webkit-tap-highlight-color: transparent;
        }
        .ps-month-nav:active {
          background: var(--light);
        }
        .ps-month-display {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          color: var(--text-dark);
          font-size: 0.875rem;
          font-weight: 500;
          position: relative;
          cursor: pointer;
          min-width: 140px;
          justify-content: center;
        }
        .ps-month-display svg {
          color: var(--text-gray);
          flex-shrink: 0;
        }
        .ps-month-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
        }

        /* ── Summary Cards ───────────────────────────────── */
        .ps-summary-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }
        .ps-summary-card {
          background: var(--white);
          border-radius: var(--radius);
          padding: var(--space-md);
          box-shadow: var(--elevation-1);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
          overflow: hidden;
        }
        .ps-summary-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent, var(--primary));
        }
        .ps-summary-highlight {
          grid-column: 1 / -1;
          flex-direction: row;
          align-items: center;
          padding: var(--space-md) var(--space-md);
          border: 1px solid #d1fae5;
          background: linear-gradient(135deg, #ecfdf5 0%, var(--white) 60%);
        }
        .ps-summary-highlight .ps-summary-value {
          font-size: 1.5rem;
          color: var(--success);
        }
        .ps-summary-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ps-summary-icon svg {
          width: 20px;
          height: 20px;
        }
        .ps-summary-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .ps-summary-label {
          font-size: 0.6875rem;
          color: var(--text-gray);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ps-summary-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-dark);
          line-height: 1.2;
          word-break: break-word;
        }

        /* ── Section Cards ───────────────────────────────── */
        .ps-section {
          margin-bottom: var(--space-lg);
          padding: 0;
          overflow: hidden;
        }
        .ps-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          border-bottom: 1px solid #f1f5f9;
        }
        .ps-clickable {
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s;
        }
        .ps-clickable:active {
          background: #f8fafc;
        }
        .ps-section-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ps-section-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .ps-section-icon svg {
          width: 18px;
          height: 18px;
        }
        .ps-section-title {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--text-dark);
        }
        .ps-section-body {
          padding: var(--space-md);
        }
        .ps-chevron {
          color: var(--text-gray);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
        }
        .ps-chevron-open {
          transform: rotate(180deg);
        }

        /* ── Dompet Grid ─────────────────────────────────── */
        .dompet-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          padding: var(--space-sm);
        }
        .dompet-item {
          background: var(--white);
          border-radius: var(--radius-sm);
          padding: 12px;
          border-left: 3px solid var(--gray);
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: background 0.15s;
        }
        .dompet-item:active {
          background: #f8fafc;
        }
        .dompet-item-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dompet-icon {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          flex-shrink: 0;
        }
        .dompet-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-gray);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .dompet-value {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-dark);
          padding-left: 36px;
        }
        .dompet-pct-bar {
          height: 4px;
          background: #f1f5f9;
          border-radius: 2px;
          overflow: hidden;
          margin-left: 36px;
        }
        .dompet-pct-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dompet-pct-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 600;
          margin-left: 36px;
          width: fit-content;
        }

        /* ── Table Enhancements ───────────────────────────── */
        .ps-mono {
          font-family: 'Roboto Mono', monospace;
          font-size: 0.8125rem;
        }
        .ps-date {
          font-size: 0.8125rem;
          white-space: nowrap;
        }
        .ps-row-alt {
          background: #f8fafc;
        }

        /* ── Growth / Status Badges ──────────────────────── */
        .growth-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          white-space: nowrap;
        }
        .growth-positive {
          color: #065f46;
          background: #d1fae5;
        }
        .growth-negative {
          color: #991b1b;
          background: #fee2e2;
        }
        .badge-success {
          background: #d1fae5;
          color: #065f46;
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 600;
        }
        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 600;
        }

        /* ── Empty State ──────────────────────────────────── */
        .ps-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-xl);
          text-align: center;
          gap: var(--space-sm);
        }
        .ps-empty-icon {
          font-size: 2rem;
          opacity: 0.4;
        }
        .ps-empty-state p {
          color: var(--text-gray);
          font-size: 0.875rem;
          margin: 0;
        }

        /* ── Responsive ───────────────────────────────────── */
        @media (max-width: 380px) {
          .ps-summary-row {
            grid-template-columns: 1fr;
          }
          .ps-summary-highlight {
            grid-column: 1;
          }
          .dompet-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (min-width: 600px) {
          .ps-summary-row {
            grid-template-columns: 1fr 1fr 1fr 1fr;
          }
          .ps-summary-highlight {
            grid-column: 1 / -1;
          }
          .dompet-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 900px) {
          .dompet-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default ProfitSharing;
