import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, logout } from '../lib/api';
import Ringkasan from './Ringkasan';
import MenuJasa from './MenuJasa';
import MenuStore from './MenuStore';
import Orders from './Orders';
import Penjualan from './Penjualan';
import Inventory from './Inventory';
import Cashflow from './Cashflow';
import ProfitSharing from './ProfitSharing';
import KontenWeb from './KontenWeb';
import Diskon from './Diskon';
import Referral from './Referral';

/* ------------------------------------------------------------------ */
/*  Tab config — maps key → component + display label                 */
/* ------------------------------------------------------------------ */
interface TabConfig {
  component: React.ReactNode;
  label: string;
}

const tabs: Record<string, TabConfig> = {
  ringkasan:       { component: <Ringkasan />,       label: 'Ringkasan' },
  'menu-jasa':     { component: <MenuJasa />,        label: 'Menu Jasa' },
  'menu-store':    { component: <MenuStore />,       label: 'Menu Store' },
  pesanan:         { component: <Orders />,          label: 'Pesanan' },
  penjualan:      { component: <Penjualan />,       label: 'Penjualan' },
  inventory:       { component: <Inventory />,       label: 'Inventory' },
  cashflow:        { component: <Cashflow />,        label: 'Keuangan' },
  'profit-sharing':{ component: <ProfitSharing />,   label: 'Profit Sharing' },
  'konten-web':    { component: <KontenWeb />,       label: 'Konten Web' },
  diskon:          { component: <Diskon />,          label: 'Manajemen Diskon' },
  referral:        { component: <Referral />,        label: 'Referral' },
};

/* ------------------------------------------------------------------ */
/*  Bottom-nav items (the 5 visible tabs)                             */
/* ------------------------------------------------------------------ */
interface NavItem {
  id: string;
  label: string;
  emoji: string;
}

const bottomNavItems: NavItem[] = [
  { id: 'ringkasan', label: 'Ringkasan',   emoji: '🏠' },
  { id: 'pesanan',   label: 'Pesanan',     emoji: '📋' },
  { id: 'cashflow',  label: 'Keuangan',    emoji: '📊' },
  { id: 'inventory', label: 'Inventory',   emoji: '📦' },
  { id: '__more__',  label: 'Lainnya',     emoji: '⋯' },
];

/* ------------------------------------------------------------------ */
/*  "Lainnya" grid items — the remaining 7 pages                      */
/* ------------------------------------------------------------------ */
interface MoreItem {
  id: string;
  label: string;
  emoji: string;
}

const moreItems: MoreItem[] = [
  { id: 'menu-jasa',     label: 'Menu Jasa',         emoji: '🛎️' },
  { id: 'menu-store',    label: 'Menu Store',         emoji: '🏪' },
  { id: 'penjualan',     label: 'Penjualan',          emoji: '💰' },
  { id: 'profit-sharing',label: 'Profit Sharing',     emoji: '🤝' },
  { id: 'konten-web',    label: 'Konten Web',         emoji: '🌐' },
  { id: 'diskon',        label: 'Manajemen Diskon',   emoji: '🏷️' },
  { id: 'referral',      label: 'Referral',           emoji: '🔗' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function formatDateIndonesian(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function AdminLayout() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('ringkasan');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* redirect to /login when unauthenticated */
  useEffect(() => {
    const token = getToken();
    if (!token) navigate('/login');
  }, [navigate]);

  /* close hamburger dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  /* ----- derived state ----- */
  const today = new Date();
  const dateStr = formatDateIndonesian(today);
  const activeLabel = tabs[activeTab]?.label || 'Ringkasan';
  const isMoreView = activeTab === '__more__';

  /* ================================================================== */
  /*  Render                                                            */
  /* ================================================================== */
  return (
    <div style={styles.adminWrap}>

      {/* ============================================================ */}
      {/*  TOP APP BAR — fixed                                         */}
      {/* ============================================================ */}
      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <img
            src="/danee-logo.png"
            alt="Danee"
            style={styles.topBarLogo}
          />
          <span style={styles.topBarTitle}>{activeLabel}</span>
        </div>

        <div style={styles.topBarRight}>
          <span style={styles.topBarDate}>
            <span style={{ marginRight: 6 }}>📅</span>
            {dateStr}
          </span>

          {/* Hamburger menu button */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={styles.hamburgerBtn}
              aria-label="Menu"
            >
              ☰
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={styles.dropdown}>
                <div
                  style={styles.dropdownItem}
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = '/';
                  }}
                >
                  <span>🌐</span>
                  <span>Kembali ke Website</span>
                </div>
                <div style={styles.dropdownDivider} />
                <div
                  style={{ ...styles.dropdownItem, color: '#ef4444' }}
                  onClick={handleLogout}
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main style={styles.mainContent}>
        {isMoreView ? (
          /* ---------- "Lainnya" grid view ---------- */
          <div style={styles.moreContainer}>
            <p style={styles.moreHeading}>Menu Lainnya</p>
            <div style={styles.moreGrid}>
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  style={styles.moreCard}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span style={styles.moreCardEmoji}>{item.emoji}</span>
                  <span style={styles.moreCardLabel}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Logout button at bottom */}
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        ) : (
          /* ---------- Normal page content ---------- */
          tabs[activeTab]?.component
        )}
      </main>

      {/* ============================================================ */}
      {/*  BOTTOM NAVIGATION — fixed                                   */}
      {/* ============================================================ */}
      <nav style={styles.bottomNav}>
        {bottomNavItems.map((item) => {
          const isActive = item.id === '__more__'
            ? activeTab === '__more__' || !bottomNavItems.some((b) => b.id === activeTab)
            : activeTab === item.id;

          return (
            <button
              key={item.id}
              style={{
                ...styles.bottomNavItem,
                color: isActive ? 'var(--primary, #6366f1)' : '#94a3b8',
              }}
              onClick={() => setActiveTab(item.id)}
            >
              <span style={styles.bottomNavEmoji}>{item.emoji}</span>
              <span style={styles.bottomNavLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles — mobile-first, Android Material-inspired           */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  /* wrapper fills viewport, column layout */
  adminWrap: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f5f5f5',
  },

  /* ---- Top App Bar ---- */
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 12px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  topBarLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    objectFit: 'contain',
    flexShrink: 0,
  },
  topBarTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  topBarDate: {
    fontSize: '0.75rem',
    opacity: 0.9,
    whiteSpace: 'nowrap',
  },
  hamburgerBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.6rem',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
    borderRadius: 8,
  },

  /* ---- Hamburger dropdown ---- */
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    minWidth: 200,
    overflow: 'hidden',
    zIndex: 200,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  dropdownDivider: {
    height: 1,
    background: '#e5e7eb',
    margin: '0 12px',
  },

  /* ---- Main content area ---- */
  mainContent: {
    flex: 1,
    marginTop: 56,             /* below top bar */
    padding: '12px 12px 96px', /* bottom padding for bottom nav */
    overflowY: 'auto',
  },

  /* ---- "Lainnya" grid ---- */
  moreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 8,
  },
  moreHeading: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  moreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  moreCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '18px 8px',
    cursor: 'pointer',
    transition: 'transform 0.12s, box-shadow 0.12s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  moreCardEmoji: {
    fontSize: '1.8rem',
    lineHeight: 1,
  },
  moreCardLabel: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 1.2,
  },

  /* ---- Logout button in Lainnya ---- */
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: '12px 32px',
    background: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: 12,
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },

  /* ---- Bottom Navigation ---- */
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    background: '#fff',
    borderTop: '1px solid #e5e7eb',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  bottomNavItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 0',
    transition: 'color 0.15s',
    outline: 'none',
  },
  bottomNavEmoji: {
    fontSize: '1.4rem',
    lineHeight: 1,
  },
  bottomNavLabel: {
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
};
