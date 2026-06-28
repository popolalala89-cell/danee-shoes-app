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
/*  Sidebar items (all pages, no "__more__" wrapper)                 */
/* ------------------------------------------------------------------ */
const sidebarNavItems: NavItem[] = [
  { id: 'ringkasan',     label: 'Ringkasan',     icon: 'dashboard',          route: '/admin' },
  { id: 'pesanan',       label: 'Pesanan',       icon: 'receipt_long',       route: '/admin/orders' },
  { id: 'inventory',     label: 'Inventory',     icon: 'inventory_2',        route: '/admin/inventory' },
  { id: 'keuangan',      label: 'Keuangan',      icon: 'account_balance',    route: '/admin/cashflow' },
  { id: 'menu-jasa',     label: 'Menu Jasa',     icon: 'cleaning_services',  route: '/admin/menu-jasa' },
  { id: 'menu-store',    label: 'Menu Store',    icon: 'storefront',         route: '/admin/menu-store' },
  { id: 'penjualan',     label: 'Penjualan',     icon: 'payments',           route: '/admin/penjualan' },
  { id: 'profit-sharing',label: 'Profit Sharing',icon: 'handshake',          route: '/admin/profit-sharing' },
  { id: 'konten',        label: 'Konten Web',    icon: 'public',             route: '/admin/konten' },
  { id: 'diskon',        label: 'Diskon',        icon: 'local_offer',        route: '/admin/diskon' },
  { id: 'referral',      label: 'Referral',      icon: 'link',               route: '/admin/referral' },
  { id: 'settings',      label: 'Pengaturan',    icon: 'settings',           route: '/admin/settings' },
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

function getPageTitle(pathname: string, showingMore: boolean): string {
  if (showingMore) return 'Lainnya';
  return pageTitles[pathname] || 'Ringkasan';
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const [navDirection, setNavDirection] = useState<'forward' | 'backward'>('forward');
  const prevTabRef = useRef<string>('ringkasan');
  const menuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
    // Determine tab index for direction
    const tabOrder: Record<string, number> = {
      ringkasan: 0, pesanan: 1, inventory: 2, keuangan: 3, __more__: 4,
    };
    const currentActive = showMore ? '__more__' : getActiveTabId(location.pathname);
    const prevIdx = tabOrder[prevTabRef.current] ?? 0;
    const currIdx = tabOrder[currentActive] ?? 0;

    if (prevIdx < currIdx) setNavDirection('forward');
    else if (prevIdx > currIdx) setNavDirection('backward');
    else setNavDirection('forward');

    prevTabRef.current = currentActive;

    if (location.pathname.startsWith('/admin') && bottomNavItems.some(
      (n) => n.id !== '__more__' && location.pathname === n.route
    )) {
      setShowMore(false);
    }
    // Bump key to re-trigger animation
    setPageKey((k) => k + 1);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setSidebarOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNavClick = (item: NavItem) => {
    setMenuOpen(false);
    if (item.id === '__more__') {
      setShowMore(true);
      // Bump key for transition animation
      const currentIdx = 4; // __more__
      const prevIdx = tabIdOrder.indexOf(getActiveTabId(location.pathname));
      setNavDirection(prevIdx < currentIdx ? 'forward' : 'backward');
      prevTabRef.current = '__more__';
      setPageKey((k) => k + 1);
    } else {
      setShowMore(false);
      navigate(item.route);
    }
  };

  /* Helper for tab ordering */
  const tabIdOrder = ['ringkasan', 'pesanan', 'inventory', 'keuangan', '__more__'];

  const handleMoreItemClick = (item: MoreItem) => {
    setShowMore(false);
    navigate(item.route);
  };

  /* ── Sidebar navigation click ────────────────────────────────── */
  const handleSidebarNav = (route: string) => {
    setSidebarOpen(false);
    setShowMore(false);
    navigate(route);
  };

  /* ── Swipe gesture: geser kiri/kanan untuk ganti tab ──────────── */
  const SWIPE_THRESHOLD = 60;

  /** True if the touch target or any parent is a horizontally-scrollable container */
  const isInsideScrollableX = (target: EventTarget | null): boolean => {
    if (!target || !(target as HTMLElement).closest) return false;
    const el = (target as HTMLElement).closest(
      '.table-wrap, [style*="overflow-x: auto"], [style*="overflow-x:scroll"], ' +
      '[style*="overflow: auto"], [style*="overflow:scroll"], ' +
      'table, .audit-detail-table'
    );
    if (el) return true;
    // Also check computed style for overflow-x auto/scroll on any parent
    let node = target as HTMLElement | null;
    while (node && node !== contentRef.current) {
      const style = window.getComputedStyle(node);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
      node = node.parentElement;
    }
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // ═══ Skip swipe if touch started on a horizontally-scrollable element ═══
    if (isInsideScrollableX(e.target)) return;

    // Only trigger navigation if swipe is predominantly horizontal
    // (prevents scroll gestures from triggering tab change)
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.5) return;

    let swipeDir: 'left' | 'right' | null = null;
    if (deltaX > SWIPE_THRESHOLD) swipeDir = 'right';
    else if (deltaX < -SWIPE_THRESHOLD) swipeDir = 'left';
    if (!swipeDir) return;

    const tabOrder = ['ringkasan', 'pesanan', 'inventory', 'keuangan', '__more__'] as const;
    const currentIdx = tabOrder.indexOf((showMore ? '__more__' : getActiveTabId(location.pathname)) as typeof tabOrder[number]);
    if (currentIdx === -1) return;

    let nextIdx: number;
    if (swipeDir === 'left') {
      nextIdx = Math.min(currentIdx + 1, tabOrder.length - 1);
    } else {
      nextIdx = Math.max(currentIdx - 1, 0);
    }
    if (nextIdx === currentIdx) return;

    const nextTab = tabOrder[nextIdx];
    if (nextTab === '__more__') {
      setShowMore(true);
      const moreTargetIdx = tabOrder.length - 1;
      const prevSwipeIdx = tabOrder.indexOf(showMore ? '__more__' : getActiveTabId(location.pathname) as typeof tabOrder[number]);
      setNavDirection(prevSwipeIdx < moreTargetIdx ? 'forward' : 'backward');
      prevTabRef.current = '__more__';
      setPageKey((k) => k + 1);
    } else {
      setShowMore(false);
      const route = bottomNavItems.find(n => n.id === nextTab)?.route;
      if (route) navigate(route);
    }
  };

  const permittedMoreItems = useMemo(
    () => moreItems.filter((item) => hasPermission(item.id)),
    [hasPermission]
  );

  const permittedSidebarItems = useMemo(
    () => sidebarNavItems.filter((item) => hasPermission(item.id)),
    [hasPermission]
  );

  const today = new Date();
  const dateStr = formatDateIndonesian(today);
  const pageTitle = getPageTitle(location.pathname, showMore);
  const pageIcon = showMore ? 'apps' : (pageIcons[location.pathname] || 'dashboard');
  const activeTabId = showMore ? '__more__' : getActiveTabId(location.pathname);

  const userEmail = user?.email || 'Admin';
  const userInitial = userEmail.charAt(0).toUpperCase();

  /* ================================================================== */
  /*  Render                                                            */
  /* ================================================================== */
  return (
    <div className="admin-wrap">
      {/* ============================================================
         TOP APP BAR
        ============================================================ */}
      <header className="top-app-bar">
        <div className="topbar-left">
          {/* Hamburger — toggles sidebar on mobile */}
          <button
            className="hamburger-admin ripple ripple-light"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Menu"
          >
            <span className="mat-icon">menu</span>
          </button>

          {/* User avatar — toggles dropdown on click */}
          <div
            className="topbar-avatar"
            style={{ cursor: 'pointer' }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {userInitial}
          </div>

          {/* Icon + Title */}
          <span className="mat-icon topbar-page-icon">{pageIcon}</span>
          <span className="topbar-title">{pageTitle}</span>
        </div>

        <div className="topbar-right">
          <span className="topbar-date">{dateStr}</span>

          {/* Avatar dropdown menu */}
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
                navigate('/admin/settings');
              }}>
                <span className="mat-icon">settings</span>
                <span>Pengaturan</span>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-item ripple" onClick={handleLogout} style={{ color: '#ef4444' }}>
                <span className="mat-icon">logout</span>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================
         SIDEBAR (overlay drawer on mobile, permanent on desktop)
        ============================================================ */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Brand header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>👟</span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                Danee Shoes
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', lineHeight: 1.2 }}>
                Care Management
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {permittedSidebarItems.map((item) => {
            const isActive = location.pathname === item.route;
            return (
              <button
                key={item.id}
                className={`nav-item ripple${isActive ? ' active' : ''}`}
                onClick={() => handleSidebarNav(item.route)}
              >
                <span className="mat-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 'var(--space-sm) 0' }}>
          <button className="nav-item ripple" onClick={() => {
            setSidebarOpen(false);
            navigate('/');
          }}>
            <span className="mat-icon">public</span>
            <span>Kembali ke Website</span>
          </button>
          <button
            className="nav-item ripple"
            onClick={handleLogout}
            style={{ color: '#ef4444' }}
          >
            <span className="mat-icon">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
         MAIN CONTENT
        ============================================================ */}
      <main className="admin-content" ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        {showMore ? (
          <PageTransition key={pageKey} direction={navDirection}>
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
          <PageTransition key={pageKey} direction={navDirection}>
            <AdminRoutes />
          </PageTransition>
        )}
      </main>

      {/* ============================================================
         BOTTOM NAVIGATION
        ============================================================ */}
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
