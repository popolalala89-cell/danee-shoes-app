import React, { useState, useEffect } from 'react';
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

interface TabConfig {
  component: React.ReactNode;
  label: string;
}

const tabs: Record<string, TabConfig> = {
  ringkasan: { component: <Ringkasan />, label: 'Ringkasan' },
  'menu-jasa': { component: <MenuJasa />, label: 'Menu Jasa' },
  'menu-store': { component: <MenuStore />, label: 'Menu Store' },
  pesanan: { component: <Orders />, label: 'Pesanan' },
  penjualan: { component: <Penjualan />, label: 'Penjualan' },
  inventory: { component: <Inventory />, label: 'Inventory' },
  cashflow: { component: <Cashflow />, label: 'Cashflow' },
  'profit-sharing': { component: <ProfitSharing />, label: 'Profit Sharing' },
  'konten-web': { component: <KontenWeb />, label: 'Konten Web' },
  diskon: { component: <Diskon />, label: 'Manajemen Diskon' },
  referral: { component: <Referral />, label: 'Referral' },
};

const navItems = [
  { id: 'ringkasan', label: 'Ringkasan', icon: 'fa-th-large' },
  { id: 'menu-jasa', label: 'Menu Jasa', icon: 'fa-concierge-bell' },
  { id: 'menu-store', label: 'Menu Store', icon: 'fa-store' },
  { id: 'pesanan', label: 'Pesanan', icon: 'fa-clipboard-list' },
  { id: 'penjualan', label: 'Penjualan', icon: 'fa-cash-register' },
  { id: 'inventory', label: 'Inventory', icon: 'fa-boxes' },
  { id: 'cashflow', label: 'Cashflow', icon: 'fa-chart-line' },
  { id: 'profit-sharing', label: 'Profit Sharing', icon: 'fa-hand-holding-usd' },
  { id: 'konten-web', label: 'Konten Web', icon: 'fa-globe' },
  { id: 'diskon', label: 'Manajemen Diskon', icon: 'fa-percentage' },
  { id: 'referral', label: 'Referral', icon: 'fa-link' },
];

/**
 * Format a date to Indonesian locale string.
 * Example: "Selasa, 16 Juni 2026"
 */
function formatDateIndonesian(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('ringkasan');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // On mount: redirect to /login if no auth token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const today = new Date();
  const dateStr = formatDateIndonesian(today);
  const activeLabel = tabs[activeTab]?.label || 'Ringkasan';

  return (
    <div className="admin-wrap">
      {/* Mobile overlay — visible only when sidebar is open on small screens */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'block',
          }}
          aria-hidden="true"
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <img src="/danee-logo.png" alt="Danee Shoes & Clean" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </div>
          ))}

          {/* Spacer to push logout to bottom */}
          <div style={{ flex: 1 }} />

          {/* Kembali ke Website */}
          <a
            href="/"
            className="nav-item"
            style={{ textDecoration: 'none' }}
          >
            <i className="fas fa-arrow-left" />
            <span>Kembali ke Website</span>
          </a>

          {/* Logout — danger color */}
          <div
            className="nav-item"
            onClick={handleLogout}
            style={{
              color: 'var(--danger)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <i className="fas fa-sign-out-alt" />
            <span>Logout</span>
          </div>
        </nav>
      </aside>

      {/* ===== Main Content Area ===== */}
      <main className="admin-content">
        {/* Top bar */}
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="hamburger-admin"
              onClick={() => setSidebarOpen(true)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-dark)',
                padding: '4px',
                lineHeight: 1,
              }}
              aria-label="Buka menu navigasi"
            >
              <i className="fas fa-bars" />
            </button>
            <h1>{activeLabel}</h1>
          </div>
          <span
            style={{
              color: 'var(--text-gray)',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            <i
              className="fas fa-calendar-alt"
              style={{ marginRight: '6px' }}
            />
            {dateStr}
          </span>
        </div>

        {/* Active tab content */}
        <div className="admin-main">{tabs[activeTab]?.component}</div>
      </main>
    </div>
  );
}
