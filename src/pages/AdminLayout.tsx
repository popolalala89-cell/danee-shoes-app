import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import AdminRoutes from '../routes/AdminRoutes';

/* ------------------------------------------------------------------ */
/*  Page title map — keyed by route path                              */
/* ------------------------------------------------------------------ */
const pageTitles: Record<string, string> = {
  '/admin': 'Ringkasan',
  '/admin/orders': 'Pesanan',
  '/admin/inventory': 'Inventory',
  '/admin/cashflow': 'Keuangan',
  '/admin/menu-jasa': 'Menu Jasa',
  '/admin/menu-store': 'Menu Store',
  '/admin/penjualan': 'Penjualan',
  '/admin/profit-sharing': 'Profit Sharing',
  '/admin/konten': 'Konten Web',
  '/admin/diskon': 'Diskon',
  '/admin/referral': 'Referral',
  '/admin/settings': 'Pengaturan',
};

/* ------------------------------------------------------------------ */
/*  Bottom-nav items (5 visible tabs)                                 */
/* ------------------------------------------------------------------ */
interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const bottomNavItems: NavItem[] = [
  { id: 'ringkasan', label: 'Ringkasan', icon: '🏠', route: '/admin' },
  { id: 'pesanan',   label: 'Pesanan',   icon: '📋', route: '/admin/orders' },
  { id: 'inventory', label: 'Inventory', icon: '📦', route: '/admin/inventory' },
  { id: 'keuangan',  label: 'Keuangan',  icon: '📊', route: '/admin/cashflow' },
  { id: '__more__',  label: 'Lainnya',   icon: '⋯',  route: '' },
];

/* ------------------------------------------------------------------ */
/*  "Lainnya" grid items                                              */
/* ------------------------------------------------------------------ */
interface MoreItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const moreItems: MoreItem[] = [
  { id: 'menu-jasa',     label: 'Menu Jasa',       icon: '🛎️', route: '/admin/menu-jasa' },
  { id: 'menu-store',    label: 'Menu Store',       icon: '🏪', route: '/admin/menu-store' },
  { id: 'penjualan',     label: 'Penjualan',        icon: '💰', route: '/admin/penjualan' },
  { id: 'profit-sharing',label: 'Profit Sharing',   icon: '🤝', route: '/admin/profit-sharing' },
  { id: 'konten',        label: 'Konten Web',       icon: '🌐', route: '/admin/konten' },
  { id: 'diskon',        label: 'Diskon',           icon: '🏷️', route: '/admin/diskon' },
  { id: 'referral',      label: 'Referral',         icon: '🔗', route: '/admin/referral' },
  { id: 'settings',      label: 'Pengaturan',       icon: '⚙️', route: '/admin/settings' },
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

function getActiveTabId(pathname: string): string {
  if (pathname === '/admin') return 'ringkasan';
  if (pathname === '/admin/orders') return 'pesanan';
  if (pathname === '/admin/inventory') return 'inventory';
  if (pathname === '/admin/cashflow') return 'keuangan';
  return '__more__';
}

function getPageTitle(pathname: string, showMore: boolean): string {
  if (showMore) return 'Lainnya';
  return pageTitles[pathname] || 'Ringkasan';
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close hamburger dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  /* Sync showMore when navigating directly */
  useEffect(() => {
    if (location.pathname.startsWith('/admin') && bottomNavItems.some(
      (n) => n.id !== '__more__' && location.pathname === n.route
    )) {
      setShowMore(false);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNavClick = (item: NavItem) => {
    setMenuOpen(false);
    if (item.id === '__more__') {
      setShowMore(true);
    } else {
      setShowMore(false);
      navigate(item.route);
    }
  };

  const handleMoreItemClick = (item: MoreItem) => {
    setShowMore(false);
    navigate(item.route);
  };

  /* ----- derived state ----- */
  const today = new Date();
  const dateStr = formatDateIndonesian(today);
  const pageTitle = getPageTitle(location.pathname, showMore);
  const activeTabId = showMore ? '__more__' : getActiveTabId(location.pathname);

  const userEmail = user?.email || 'Admin';
  const userInitial = (userEmail as string).charAt(0).toUpperCase();

  /* ================================================================== */
  /*  Render                                                            */
  /* ================================================================== */
  return (
    <div className="admin-wrap">
      {/* ============================================================ */}
      {/*  TOP APP BAR                                                  */}
      {/* ============================================================ */}
      <header className="top-app-bar">
        <div style={styles.topBarLeft}>
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={styles.hamburgerBtn}
            aria-label="Menu"
          >
            ☰
          </button>

          {/* User avatar initials */}
          <div style={styles.avatarCircle}>
            {userInitial}
          </div>

          <span style={styles.topBarTitle}>{pageTitle}</span>
        </div>

        <div style={styles.topBarRight}>
          <span style={styles.topBarDate}>{dateStr}</span>

          {/* Hamburger dropdown */}
          {menuOpen && (
            <div ref={menuRef} style={styles.dropdown}>
              {/* User info */}
              <div style={styles.dropdownUser}>
                <div style={styles.dropdownAvatar}>{userInitial}</div>
                <div>
                  <div style={styles.dropdownName}>{userEmail}</div>
                  <div style={styles.dropdownRole}>Administrator</div>
                </div>
              </div>
              <div style={styles.dropdownDivider} />

              <div
                style={styles.dropdownItem}
                onClick={() => {
                  setMenuOpen(false);
                  setShowMore(false);
                  navigate('/');
                }}
              >
                <span>🌐</span>
                <span>Kembali ke Website</span>
              </div>

              <div
                style={styles.dropdownItem}
                onClick={() => {
                  setMenuOpen(false);
                  setShowMore(false);
                  navigate('/admin/settings');
                }}
              >
                <span>⚙️</span>
                <span>Pengaturan</span>
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
      </header>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main style={styles.mainContent}>
        {showMore ? (
          /* ---------- "Lainnya" grid view ---------- */
          <div style={styles.moreContainer}>
            <p style={styles.moreHeading}>Menu Lainnya</p>
            <div style={styles.moreGrid}>
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  style={styles.moreCard}
                  onClick={() => handleMoreItemClick(item)}
                >
                  <span style={styles.moreCardIcon}>{item.icon}</span>
                  <span style={styles.moreCardLabel}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Logout */}
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        ) : (
          /* ---------- Routed page content ---------- */
          <AdminRoutes />
        )}
      </main>

      {/* ============================================================ */}
      {/*  BOTTOM NAVIGATION                                            */}
      {/* ============================================================ */}
      <nav className="bottom-nav">
        {bottomNavItems.map((item) => {
          const isActive = item.id === activeTabId;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item${isActive ? ' active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles (overlays and custom elements not in CSS)            */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  /* ---- Top bar left section ---- */
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    flex: 1,
  },

  /* ---- Hamburger ---- */
  hamburgerBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '4px 4px',
    lineHeight: 1,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    flexShrink: 0,
  },

  /* ---- Avatar circle in top bar ---- */
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    flexShrink: 0,
  },

  /* ---- Title ---- */
  topBarTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    position: 'relative',
  },

  topBarDate: {
    fontSize: '0.72rem',
    opacity: 0.85,
    whiteSpace: 'nowrap',
    display: 'none', /* hidden on small screens */
  },

  /* ---- Hamburger dropdown ---- */
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    minWidth: 220,
    overflow: 'hidden',
    zIndex: 1200,
  },

  dropdownUser: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
  },

  dropdownAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #034BB9, #2563eb)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: 700,
    flexShrink: 0,
  },

  dropdownName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e293b',
  },

  dropdownRole: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: 2,
  },

  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.1s',
    color: '#1e293b',
  },

  dropdownDivider: {
    height: 1,
    background: '#e5e7eb',
    margin: '0 12px',
  },

  /* ---- Main content area ---- */
  mainContent: {
    flex: 1,
    marginTop: 56,
    padding: '12px 12px 80px',
    overflowY: 'auto',
    background: '#f5f5f5',
    minHeight: 'calc(100vh - 56px)',
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

  moreCardIcon: {
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
};
