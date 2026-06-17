import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import AdminRoutes from '../routes/AdminRoutes';
import PageTransition from '../components/ui/PageTransition';

/* ------------------------------------------------------------------ */
/*  Page title map                                                    */
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
/*  Icon name map — Material Symbols                                  */
/* ------------------------------------------------------------------ */
const pageIcons: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/orders': 'receipt_long',
  '/admin/inventory': 'inventory_2',
  '/admin/cashflow': 'account_balance',
  '/admin/menu-jasa': 'cleaning_services',
  '/admin/menu-store': 'storefront',
  '/admin/penjualan': 'payments',
  '/admin/profit-sharing': 'handshake',
  '/admin/konten': 'public',
  '/admin/diskon': 'local_offer',
  '/admin/referral': 'link',
  '/admin/settings': 'settings',
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
  { id: 'ringkasan', label: 'Ringkasan', icon: 'dashboard', route: '/admin' },
  { id: 'pesanan',   label: 'Pesanan',   icon: 'receipt_long', route: '/admin/orders' },
  { id: 'inventory', label: 'Inventory', icon: 'inventory_2', route: '/admin/inventory' },
  { id: 'keuangan',  label: 'Keuangan',  icon: 'account_balance', route: '/admin/cashflow' },
  { id: '__more__',  label: 'Lainnya',   icon: 'more_horiz',  route: '' },
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
  { id: 'menu-jasa',     label: 'Menu Jasa',       icon: 'cleaning_services', route: '/admin/menu-jasa' },
  { id: 'menu-store',    label: 'Menu Store',       icon: 'storefront',        route: '/admin/menu-store' },
  { id: 'penjualan',     label: 'Penjualan',        icon: 'payments',          route: '/admin/penjualan' },
  { id: 'profit-sharing',label: 'Profit Sharing',   icon: 'handshake',         route: '/admin/profit-sharing' },
  { id: 'konten',        label: 'Konten Web',       icon: 'public',            route: '/admin/konten' },
  { id: 'diskon',        label: 'Diskon',           icon: 'local_offer',       route: '/admin/diskon' },
  { id: 'referral',      label: 'Referral',         icon: 'link',              route: '/admin/referral' },
  { id: 'settings',      label: 'Pengaturan',       icon: 'settings',          route: '/admin/settings' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function formatDateIndonesian(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function getActiveTabId(pathname: string): string {
  if (pathname === '/admin') return 'ringkasan';
  if (pathname === '/admin/orders') return 'pesanan';
  if (pathname === '/admin/inventory') return 'inventory';
  if (pathname === '/admin/cashflow') return 'keuangan';
  return '__more__';
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [pageKey, setPageKey] = useState(0);
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

  /* Sync showMore + trigger page transition on navigate */
  useEffect(() => {
    if (location.pathname.startsWith('/admin') && bottomNavItems.some(
      (n) => n.id !== '__more__' && location.pathname === n.route
    )) {
      setShowMore(false);
    }
    // Bump key to re-trigger page-enter animation
    setPageKey((k) => k + 1);
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

  const permittedMoreItems = useMemo(
    () => moreItems.filter((item) => hasPermission(item.id)),
    [hasPermission]
  );

  const today = new Date();
  const dateStr = formatDateIndonesian(today);
  const pageTitle = getPageTitle(location.pathname, showMore);
  const pageIcon = showMore ? 'apps' : (pageIcons[location.pathname] || 'dashboard');
  const activeTabId = showMore ? '__more__' : getActiveTabId(location.pathname);

  const userEmail = user?.email || 'Admin';
  const userInitial = (userEmail as string).charAt(0).toUpperCase();

  function getPageTitle(pathname: string, showingMore: boolean): string {
    if (showingMore) return 'Lainnya';
    return pageTitles[pathname] || 'Ringkasan';
  }

  /* ================================================================== */
  /*  Render                                                            */
  /* ================================================================== */
  return (
    <div className="admin-wrap">
      {/* Status bar spacer (edge-to-edge on Android) */}
      <div className="status-bar-spacer" />

      {/* ============================================================ */}
      {/*  TOP APP BAR                                                  */}
      {/* ============================================================ */}
      <header className="top-app-bar">
        <div className="topbar-left">
          {/* Hamburger */}
          <button
            className="hamburger-admin ripple ripple-light"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <span className="mat-icon">menu</span>
          </button>

          {/* User avatar */}
          <div className="topbar-avatar">{userInitial}</div>

          {/* Icon + Title */}
          <span className="mat-icon topbar-page-icon">{pageIcon}</span>
          <span className="topbar-title">{pageTitle}</span>
        </div>

        <div className="topbar-right">
          <span className="topbar-date">{dateStr}</span>

          {/* Hamburger dropdown */}
          {menuOpen && (
            <div ref={menuRef} className="dropdown-menu">
              {/* User info */}
              <div className="dropdown-user">
                <div className="dropdown-avatar">{userInitial}</div>
                <div>
                  <div className="dropdown-name">{userEmail}</div>
                  <div className="dropdown-role">Administrator</div>
                </div>
              </div>
              <div className="dropdown-divider" />

              <div className="dropdown-item ripple" onClick={() => {
                setMenuOpen(false);
                setShowMore(false);
                navigate('/');
              }}>
                <span className="mat-icon">public</span>
                <span>Kembali ke Website</span>
              </div>

              {hasPermission('settings') && (
                <div className="dropdown-item ripple" onClick={() => {
                  setMenuOpen(false);
                  setShowMore(false);
                  navigate('/admin/settings');
                }}>
                  <span className="mat-icon">settings</span>
                  <span>Pengaturan</span>
                </div>
              )}

              <div className="dropdown-divider" />

              <div className="dropdown-item ripple" onClick={handleLogout} style={{ color: '#ef4444' }}>
                <span className="mat-icon">logout</span>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main className="admin-content">
        {showMore ? (
          <PageTransition key={pageKey}>
            {/* ---------- "Lainnya" grid view ---------- */}
            <div className="more-container">
              <p className="more-heading">
                <span className="mat-icon" style={{ verticalAlign: 'middle', marginRight: 8 }}>apps</span>
                Menu Lainnya
              </p>
              <div className="more-grid">
                {permittedMoreItems.map((item) => (
                  <button
                    key={item.id}
                    className="more-card ripple"
                    onClick={() => handleMoreItemClick(item)}
                  >
                    <span className="mat-icon more-card-icon">{item.icon}</span>
                    <span className="more-card-label">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Logout */}
              <button className="logout-btn ripple" onClick={handleLogout}>
                <span className="mat-icon">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </PageTransition>
        ) : (
          /* ---------- Routed page content with transition ---------- */
          <div className="page-enter" key={pageKey}>
            <AdminRoutes />
          </div>
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
              className={`bottom-nav-item ripple${isActive ? ' active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <span className="mat-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
