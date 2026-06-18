import React, { useState, useEffect } from 'react';
import { getProfitSharingData, getProfitHistorySummary, getAuditOrderDetails, getLaporanLabaRugi } from '../lib/services/profit-service';
import { formatCurrency } from '../lib/utils';
import type { ProfitSharingData, ProfitHistory, AuditOrderDetail, AuditOrderItem, LaporanLabaRugi } from '../lib/types-supabase';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const WALLET_GROUPS = [
  { role: 'Owner',            base: 'ownerBase',      pct: 'ownerPct',      color: '#8b5cf6', icon: 'badge' },
  { role: 'Kas (Operasional)', base: 'kasBase',        pct: 'kasPct',        color: '#3b82f6', icon: 'account_balance' },
  { role: 'Spesialis Cuci',    base: 'cuciBase',       pct: 'cuciPct',       color: '#10b981', icon: 'soap' },
  { role: 'Spesialis Repair',  base: null,             pct: 'repairPct',     color: '#f59e0b', icon: 'build' },
  { role: 'Admin (Marketing)', base: 'adminBase',      pct: 'adminPct',      color: '#ec4899', icon: 'support_agent' },
  { role: 'Engineer Web',      base: 'webBase',        pct: 'webPct',        color: '#6366f1', icon: 'code' },
  { role: 'Zakat (2.5%)',      base: null,             pct: 'zakatPct',      color: '#14b8a6', icon: 'volunteer_activism' },
  { role: 'Investor',          base: null,             pct: 'investorPct',   color: '#f43f5e', icon: 'trending_up' },
];

const ProfitSharing: React.FC = () => {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [data, setData] = useState<ProfitSharingData | null>(null);
  const [history, setHistory] = useState<ProfitHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditOrders, setAuditOrders] = useState<AuditOrderDetail[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [laporan, setLaporan] = useState<LaporanLabaRugi | null>(null);
  const [laporanLoading, setLaporanLoading] = useState(false);
  const [laporanExpanded, setLaporanExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = (forceRecalculate: boolean = false) => {
    setLoading(true);
    setError(null);
    Promise.all([
      getProfitSharingData(bulan, tahun, forceRecalculate),
      getProfitHistorySummary(),
    ]).then(([profitRes, historyRes]) => {
      if (profitRes.success) setData(profitRes.data || null);
      else setError(profitRes.error || 'Gagal memuat profit sharing.');
      if (historyRes.success) setHistory(historyRes.data || []);
    }).catch((e: any) => {
      setError(e.message || 'Gagal memuat data.');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(false); }, [bulan, tahun]);

  const loadAuditDetail = () => {
    if (auditOrders) {
      setAuditExpanded(!auditExpanded);
      return;
    }
    setAuditLoading(true);
    getAuditOrderDetails(bulan, tahun).then((res) => {
      if (res.success) setAuditOrders(res.data || []);
      setAuditExpanded(true);
    }).finally(() => {
      setAuditLoading(false);
    });
  };

  const toggleOrderExpand = (kode: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  };

  const loadLaporan = () => {
    if (laporan) {
      setLaporanExpanded(!laporanExpanded);
      return;
    }
    setLaporanLoading(true);
    getLaporanLabaRugi(bulan, tahun).then((res) => {
      if (res.success) {
        setLaporan(res.data || null);
        setLaporanExpanded(true);
      }
    }).finally(() => {
      setLaporanLoading(false);
    });
  };

  const salinLaporan = async () => {
    if (!laporan) return;
    const p = laporan.pendapatan;
    const b = laporan.biaya;
    const d = laporan.distribusi;
    const lines = [
      `📊 LAPORAN LABA RUGI`,
      `Periode: ${laporan.periode}`,
      `─────────────────────────`,
      `PENDAPATAN:`,
      `  Jasa Cleaning       ${formatCurrency(p.cleaning)}`,
      `  Jasa Repair         ${formatCurrency(p.repair)}`,
      `  Produk Store        ${formatCurrency(p.produk)}`,
      `  TOTAL PENDAPATAN    ${formatCurrency(p.total)}`,
      ``,
      `BIAYA:`,
      `  HPP Cleaning        ${formatCurrency(b.hppCleaning)}`,
      `  HPP Repair          ${formatCurrency(b.hppRepair)}`,
      `  Komisi Referral     ${formatCurrency(b.komisiReferral)}`,
      `  TOTAL BIAYA         ${formatCurrency(b.total)}`,
      ``,
      `LABA BERSIH           ${formatCurrency(laporan.labaBersih)}`,
      `─────────────────────────`,
      `DISTRIBUSI LABA:`,
      ...d.map((r) => {
        const parts: string[] = [];
        if (r.base > 0) parts.push(`base ${formatCurrency(r.base)}`);
        if (r.pct > 0) parts.push(`pct ${formatCurrency(r.pct)}`);
        const detail = parts.length > 0 ? ` (${parts.join(' + ')})` : '';
        return `  ${r.role.padEnd(22)} ${formatCurrency(r.total).padStart(12)}${detail}`;
      }),
      `─────────────────────────`,
      `TOTAL DISTRIBUSI       ${formatCurrency(laporan.totalDistribusi)}`,
      laporan.balance ? `✅ BALANCE OK (Laba = Distribusi)` : `⚠️ SELISIH Rp${formatCurrency(Math.abs(laporan.labaBersih - laporan.totalDistribusi))}`,
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for non-HTTPS
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const penCapaian = data ? (data.omsetNett / (data.target || 1)) * 100 : 0;
  const modePersen = data ? data.omsetNett >= data.target : false;

  // Sistem Audit calculations (like AppScript)
  const calcAudit = (d: ProfitSharingData) => {
    const totalDistribusi = WALLET_GROUPS.reduce((sum, g) => {
      const baseVal = (g.base ? (d.dompet as any)[g.base] || 0 : 0);
      const pctVal = (g.pct ? (d.dompet as any)[g.pct] || 0 : 0);
      return sum + baseVal + pctVal;
    }, 0);
    const uangBelumTarget = d.omsetNett < d.target ? d.omsetNett : 0;
    const selisihDistribusi = Math.round(d.omsetNett - (totalDistribusi + uangBelumTarget));
    const selisihGross = Math.round(d.omsetGross - (d.omsetNett + d.alokasiHPP + d.totalKomisi));
    const totalSelisih = Math.abs(selisihDistribusi) + Math.abs(selisihGross);
    return { totalSelisih, selisihDistribusi, selisihGross };
  };

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Profit Sharing</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select className="form-control" value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} style={{ maxWidth: 120 }}>
            {BULAN.map((nama, idx) => <option key={idx} value={idx + 1}>{nama}</option>)}
          </select>
          <select className="form-control" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} style={{ maxWidth: 90 }}>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-sm btn-primary" onClick={() => fetchData(true)} disabled={loading}>
            {loading ? 'Menghitung...' : '🔄 Hitung Ulang'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /><p>Menghitung profit sharing...</p></div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-gray)' }}>Tidak ada data untuk bulan ini.</div>
      ) : (
        <>
          {/* ── Summary Bar ── like AppScript: Gross | HPP | Komisi | Nett | Target */}
          <div style={{ background: '#fff', padding: 25, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', marginBottom: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 15 }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 700 }}>Omset Kotor (Gross)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)' }}>{formatCurrency(data.omsetGross)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 700 }}>Total Potongan HPP</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f43f5e' }}>- {formatCurrency(data.alokasiHPP)}</div>
              </div>
              {data.totalKomisi > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 700 }}>Komisi Referral</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>- {formatCurrency(data.totalKomisi)}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 700 }}>Omset Bersih (Nett)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(data.omsetNett)}</div>
              </div>
              <div style={{ borderLeft: '2px dashed #e2e8f0', paddingLeft: 15 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 700 }}>Target Operasional</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>{formatCurrency(data.target)}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: 16, background: '#f1f5f9', borderRadius: 20, overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ width: `${Math.min(penCapaian, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #10b981)', transition: 'width 1s ease' }} />
            </div>

            {/* Status Sistem — like AppScript */}
            <div style={{ marginTop: 15, fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
              Status Sistem:{' '}
              {modePersen
                ? <span style={{ color: '#10b981' }}>🚀 MODE PERSEN AKTIF (Target Tercapai)</span>
                : <span style={{ color: '#f59e0b' }}>🔒 PENGUMPULAN BIAYA OPERASIONAL</span>
              }
            </div>
          </div>

          {/* ── Sistem Audit ── like AppScript */}
          {(() => {
            const audit = calcAudit(data);
            const isSinkron = audit.totalSelisih <= 2;
            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 20px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                  <b>Sistem Audit:</b> Gross = Nett + HPP &nbsp;|&nbsp; Distribusi ≤ Nett
                </div>
                <div>
                  {isSinkron
                    ? <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="mat-icon" style={{ fontSize: 16 }}>check_circle</span> SINKRON (100% Balance)</span>
                    : <span style={{ color: '#ef4444', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="mat-icon" style={{ fontSize: 16 }}>warning</span> KEBOCORAN Rp {formatCurrency(audit.totalSelisih)} DETECTED</span>
                  }
                </div>
              </div>
            );
          })()}

          {/* ── Dompet Distribution ── */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}>Distribusi Dompet</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 'var(--space-lg)' }}>
            {/* Komisi Referral card first (clickable like AppScript) */}
            {data.totalKomisi > 0 && (
              <div style={{ background: '#fff', padding: 25, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', borderTop: '4px solid #ef4444', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: '0.2s' }}
                onClick={() => document.getElementById('komisi-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📤 Komisi Referral <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>↗</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-dark)' }}>{formatCurrency(data.totalKomisi)}</div>
              </div>
            )}
            {/* Alokasi Modal (HPP) card */}
            <div style={{ background: '#fff', padding: 25, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', borderTop: '4px solid #64748b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                📦 Alokasi Modal (HPP)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-dark)' }}>{formatCurrency(data.alokasiHPP)}</div>
            </div>
            {WALLET_GROUPS.map((g) => {
              const baseVal = g.base ? ((data.dompet as any)[g.base] || 0) : 0;
              const pctVal = g.pct ? ((data.dompet as any)[g.pct] || 0) : 0;
              const total = baseVal + pctVal;
              const detailParts: string[] = [];
              if (baseVal > 0) detailParts.push(`base ${formatCurrency(baseVal)}`);
              if (pctVal > 0) detailParts.push(`pct ${formatCurrency(pctVal)}`);
              const detail = detailParts.join(' + ');
              return (
                <div key={g.role} style={{ background: '#fff', padding: 25, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', borderTop: `4px solid ${g.color}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mat-icon" style={{ fontSize: 20 }}>{g.icon}</span> {g.role}
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-dark)' }}>{formatCurrency(total)}</div>
                  {detail && <div style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginTop: 4 }}>{detail}</div>}
                </div>
              );
            })}
          </div>

          {/* ── Komisi Referral Table ── */}
          {data.komisiBreakdown && data.komisiBreakdown.length > 0 && (
            <div id="komisi-section">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}>Detail Komisi Referral</h3>
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
            </div>
          )}

          {/* ── Histori Buku Besar (3 Bulan Terakhir) ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-gray)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px' }}>
              <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>history</span> Histori Buku Besar (3 Bulan Terakhir)
            </span>
            <button onClick={() => fetchData(false)} style={{ background: '#f1f5f9', color: 'var(--text-dark)', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: '0.2s' }}>
              <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>refresh</span> Refresh
            </button>
          </div>
          {history.length > 0 ? (
            <div className="table-wrap" style={{ marginBottom: 'var(--space-lg)' }}>
              <table>
                <thead>
                  <tr><th>Bulan</th><th>Gross</th><th>Alokasi HPP</th><th>Net</th><th>Status</th><th>Pertumbuhan</th></tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => {
                    const modePersenHist = h.nett >= h.target;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s' }}>
                        <td style={{ padding: 15, fontWeight: 800, color: 'var(--text-dark)' }}>{h.bulan}</td>
                        <td style={{ padding: 15, fontWeight: 600, color: 'var(--text-gray)' }}>{formatCurrency(h.gross)}</td>
                        <td style={{ padding: 15, fontWeight: 700, color: '#f43f5e' }}>- {formatCurrency(h.hpp)}</td>
                        <td style={{ padding: 15, fontWeight: 800, color: '#10b981' }}>{formatCurrency(h.nett)}</td>
                        <td style={{ padding: 15 }}>
                          {modePersenHist
                            ? <span style={{ background: '#dcfce7', color: '#166534', padding: '5px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>🚀 MODE PERSEN</span>
                            : <span style={{ background: '#fef3c7', color: '#92400e', padding: '5px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>🔒 PENGUMPULAN</span>
                          }
                        </td>
                        <td style={{ padding: 15 }}>
                          {h.growthRp === undefined ? '-' : h.growthRp > 0 ? (
                            <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>
                              <span>↑</span> +{formatCurrency(h.growthRp)}{' '}
                              <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 6, marginLeft: 4 }}>+{h.growthPct || '0'}%</span>
                            </div>
                          ) : h.growthRp < 0 ? (
                            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.9rem' }}>
                              <span>↓</span> -{formatCurrency(Math.abs(h.growthRp))}{' '}
                              <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 6, marginLeft: 4 }}>{h.growthPct || '0'}%</span>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-gray)', fontWeight: 700, fontSize: '0.9rem' }}>
                              <span>−</span> Stabil{' '}
                              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, marginLeft: 4 }}>0%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 30, fontWeight: 600, color: 'var(--text-gray)' }}>
              Belum ada histori di bulan sebelumnya.
            </div>
          )}

          {/* ── Audit Detail per Order (FASE 4) ── */}
          <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-md)' }}>
            <div
              onClick={loadAuditDetail}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: 'var(--space-sm)' }}
            >
              <span style={{ color: 'var(--text-gray)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>fact_check</span> Audit Detail per Order
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 400, marginLeft: 8 }}>
                  {auditExpanded ? '▲ sembunyikan' : '▼ tampilkan'}
                </span>
              </span>
              {auditLoading && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Memuat...</span>}
            </div>

            {auditExpanded && (
              <div>
                {auditLoading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-gray)' }}>
                    <div className="loading-spinner" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
                    Memuat detail audit...
                  </div>
                ) : !auditOrders || auditOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, fontWeight: 600, color: 'var(--text-gray)' }}>
                    Tidak ada order Selesai di bulan ini.
                  </div>
                ) : (
                  <div className="table-wrap" style={{ marginBottom: 'var(--space-md)' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 30 }}></th>
                          <th>Kode</th>
                          <th>Tanggal</th>
                          <th>Items</th>
                          <th>Gross</th>
                          <th>HPP</th>
                          <th>Komisi</th>
                          <th>Nett</th>
                          <th>Audit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditOrders.map((ao, idx) => {
                          const isOpen = expandedOrders.has(ao.kode);
                          const totalSelisih = Math.abs(ao.gross - ao.alokasiHPP - ao.komisi - ao.nett);
                          return (
                            <React.Fragment key={ao.kode}>
                              <tr
                                onClick={() => toggleOrderExpand(ao.kode)}
                                style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                              >
                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-light)' }}>
                                  {isOpen ? '▼' : '▶'}
                                </td>
                                <td style={{ padding: 10, fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.85rem' }}>{ao.kode}</td>
                                <td style={{ padding: 10, fontWeight: 500, color: 'var(--text-gray)', fontSize: '0.8rem' }}>{ao.tanggal}</td>
                                <td style={{ padding: 10, fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.85rem' }}>{ao.items.length}</td>
                                <td style={{ padding: 10, fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.85rem' }}>{formatCurrency(ao.gross)}</td>
                                <td style={{ padding: 10, fontWeight: 600, color: '#f43f5e', fontSize: '0.85rem' }}>- {formatCurrency(ao.alokasiHPP)}</td>
                                <td style={{ padding: 10, fontWeight: 600, color: ao.komisi > 0 ? '#ef4444' : 'var(--text-light)', fontSize: '0.85rem' }}>
                                  {ao.komisi > 0 ? `- ${formatCurrency(ao.komisi)}` : '-'}
                                </td>
                                <td style={{ padding: 10, fontWeight: 800, color: '#10b981', fontSize: '0.85rem' }}>{formatCurrency(ao.nett)}</td>
                                <td style={{ padding: 10 }}>
                                  {ao.status === 'SINKRON' ? (
                                    <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                      ✓ SINKRON
                                    </span>
                                  ) : (
                                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                      ⚠ SELISIH Rp{formatCurrency(ao.selisih)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                              {isOpen && (
                                <tr>
                                  <td colSpan={9} style={{ padding: 0, background: '#f8fafc' }}>
                                    <div style={{ padding: '8px 20px 12px 40px' }}>
                                      <table style={{ fontSize: '0.78rem', width: '100%' }}>
                                        <thead>
                                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-gray)' }}>Item</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-gray)' }}>Qty</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-gray)' }}>@Harga</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-gray)' }}>Gross</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-gray)' }}>HPP</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-gray)' }}>Jalur</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {ao.items.map((item, iIdx) => (
                                            <tr key={iIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                              <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--text-dark)' }}>{item.nama}</td>
                                              <td style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--text-gray)' }}>{item.qty}</td>
                                              <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-gray)' }}>{item.hargaSatuan > 0 ? formatCurrency(item.hargaSatuan) : '-'}</td>
                                              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-dark)' }}>{item.gross > 0 ? formatCurrency(item.gross) : '-'}</td>
                                              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: item.hpp > 0 ? '#f43f5e' : 'var(--text-light)' }}>{item.hpp > 0 ? formatCurrency(item.hpp) : '-'}</td>
                                              <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                                <span style={{
                                                  background: item.jalur === 'B' ? '#fef3c7' : '#dcfce7',
                                                  color: item.jalur === 'B' ? '#92400e' : '#166534',
                                                  padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800
                                                }}>
                                                  {item.jalur === 'A' ? 'CLEAN' : 'REPAIR'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                          {/* Summary row for this order */}
                                          <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                                            <td style={{ padding: '6px 8px', color: 'var(--text-dark)' }}>Total</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-dark)' }}></td>
                                            <td style={{ padding: '6px 8px' }}></td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-dark)' }}>{formatCurrency(ao.gross)}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f43f5e' }}>{formatCurrency(ao.alokasiHPP)}</td>
                                            <td style={{ padding: '6px 8px' }}></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Laporan Laba Rugi (FASE 5) ── */}
          <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-md)' }}>
            <div
              onClick={loadLaporan}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: 'var(--space-sm)' }}
            >
              <span style={{ color: 'var(--text-gray)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>account_balance</span> Laporan Laba Rugi
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 400, marginLeft: 8 }}>
                  {laporanExpanded ? '▲ sembunyikan' : '▼ tampilkan'}
                </span>
              </span>
              {laporanLoading && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Menghitung...</span>}
            </div>

            {laporanExpanded && (
              <div>
                {laporanLoading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-gray)' }}>
                    <div className="loading-spinner" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
                    Menghitung laporan laba rugi...
                  </div>
                ) : !laporan ? (
                  <div style={{ textAlign: 'center', padding: 20, fontWeight: 600, color: 'var(--text-gray)' }}>
                    Tidak ada data transaksi periode ini.
                  </div>
                ) : (
                  <div className="report-card">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '50%' }}>📊 LAPORAN LABA RUGI — {laporan.periode}</th>
                          <th className="cell-amount">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* ── PENDAPATAN ── */}
                        <tr className="section-header pendapatan">
                          <td colSpan={2}>PENDAPATAN</td>
                        </tr>
                        {laporan.pendapatan.cleaning > 0 && (
                          <tr className="row-item">
                            <td>Jasa Cleaning</td>
                            <td className="cell-amount">{formatCurrency(laporan.pendapatan.cleaning)}</td>
                          </tr>
                        )}
                        {laporan.pendapatan.repair > 0 && (
                          <tr className="row-item">
                            <td>Jasa Repair</td>
                            <td className="cell-amount">{formatCurrency(laporan.pendapatan.repair)}</td>
                          </tr>
                        )}
                        {laporan.pendapatan.produk > 0 && (
                          <tr className="row-item">
                            <td>Produk Store</td>
                            <td className="cell-amount">{formatCurrency(laporan.pendapatan.produk)}</td>
                          </tr>
                        )}
                        <tr className="row-total pendapatan">
                          <td>TOTAL PENDAPATAN</td>
                          <td className="cell-amount">{formatCurrency(laporan.pendapatan.total)}</td>
                        </tr>

                        {/* ── BIAYA ── */}
                        <tr className="section-header biaya">
                          <td colSpan={2}>BIAYA</td>
                        </tr>
                        {laporan.biaya.hppCleaning > 0 && (
                          <tr className="row-item">
                            <td>HPP Cleaning</td>
                            <td className="cell-amount">- {formatCurrency(laporan.biaya.hppCleaning)}</td>
                          </tr>
                        )}
                        {laporan.biaya.hppRepair > 0 && (
                          <tr className="row-item">
                            <td>HPP Repair</td>
                            <td className="cell-amount">- {formatCurrency(laporan.biaya.hppRepair)}</td>
                          </tr>
                        )}
                        {laporan.biaya.komisiReferral > 0 && (
                          <tr className="row-item">
                            <td>Komisi Referral</td>
                            <td className="cell-amount">- {formatCurrency(laporan.biaya.komisiReferral)}</td>
                          </tr>
                        )}
                        <tr className="row-total biaya">
                          <td>TOTAL BIAYA</td>
                          <td className="cell-amount">- {formatCurrency(laporan.biaya.total)}</td>
                        </tr>

                        {/* ── LABA BERSIH ── */}
                        <tr className="row-laba">
                          <td>LABA BERSIH</td>
                          <td className="cell-amount">{formatCurrency(laporan.labaBersih)}</td>
                        </tr>

                        {/* ── DISTRIBUSI LABA ── */}
                        <tr className="section-header distribusi">
                          <td colSpan={2}>DISTRIBUSI LABA</td>
                        </tr>
                        {laporan.distribusi.map((r, idx) => {
                          const parts: string[] = [];
                          if (r.base > 0) parts.push(`base ${formatCurrency(r.base)}`);
                          if (r.pct > 0) parts.push(`pct ${formatCurrency(r.pct)}`);
                          const detail = parts.length > 0 ? ` (${parts.join(' + ')})` : '';
                          return (
                            <tr key={idx} className="row-item">
                              <td>
                                {r.role}
                                {detail && <span className="detail-note"> {detail}</span>}
                              </td>
                              <td className="cell-amount">{formatCurrency(r.total)}</td>
                            </tr>
                          );
                        })}
                        <tr className="row-distribusi-total">
                          <td>TOTAL DISTRIBUSI</td>
                          <td className="cell-amount">{formatCurrency(laporan.totalDistribusi)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Balance + Clipboard + Target info */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {laporan.balance
                          ? <span style={{ color: '#10b981' }}>✅ Balance: Laba = Distribusi</span>
                          : <span style={{ color: '#ef4444' }}>⚠️ Selisih Rp{formatCurrency(Math.abs(laporan.labaBersih - laporan.totalDistribusi))}</span>
                        }
                      </div>
                      <button
                        onClick={salinLaporan}
                        style={{
                          background: copied ? '#dcfce7' : '#f1f5f9',
                          color: copied ? '#166534' : 'var(--text-dark)',
                          border: copied ? '1px solid #86efac' : '1px solid #e2e8f0',
                          padding: '8px 16px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          transition: '0.2s',
                        }}
                      >
                        {copied ? '✅ Tersalin!' : '📋 Salin'}
                      </button>
                    </div>
                    <div style={{ padding: '0 16px 12px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {laporan.modePersen
                        ? `🚀 Mode Persen Aktif (Omset ≥ Target Rp${formatCurrency(laporan.target)})`
                        : `🔒 Pengumpulan Biaya Operasional (Omset < Target Rp${formatCurrency(laporan.target)})`
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitSharing;