// Danee Shoes & Clean — Admin Sub-Routing
// All routes under /admin/* are rendered here

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Ringkasan from '../pages/Ringkasan';
import MenuJasa from '../pages/MenuJasa';
import MenuStore from '../pages/MenuStore';
import Orders from '../pages/Orders';
import Penjualan from '../pages/Penjualan';
import Inventory from '../pages/Inventory';
import Cashflow from '../pages/Cashflow';
import ProfitSharing from '../pages/ProfitSharing';
import KontenWeb from '../pages/KontenWeb';
import Diskon from '../pages/Diskon';
import Referral from '../pages/Referral';
import Settings from '../pages/Settings';

/* ------------------------------------------------------------------ */
/*  Route permission mapping                                           */
/* ------------------------------------------------------------------ */
const routePermissionMap: Record<string, string> = {
  '/': 'ringkasan',
  '/menu-jasa': 'menu-jasa',
  '/menu-store': 'menu-store',
  '/orders': 'pesanan',
  '/penjualan': 'penjualan',
  '/inventory': 'inventory',
  '/cashflow': 'keuangan',
  '/profit-sharing': 'profit-sharing',
  '/konten': 'konten',
  '/diskon': 'diskon',
  '/referral': 'referral',
  '/settings': 'settings',
};

/* ------------------------------------------------------------------ */
/*  Permission guard wrapper                                          */
/* ------------------------------------------------------------------ */
function RequirePermission({ children }: { children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  const location = useLocation();

  // Strip /admin prefix to match routePermissionMap keys
  const routeKey = location.pathname.replace(/^\/admin/, '') || '/';
  const requiredPerm = routePermissionMap[routeKey];

  if (requiredPerm && !hasPermission(requiredPerm)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontWeight: 600 }}>Akses Ditolak</h3>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.9rem' }}>
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '10px 24px', background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 10, cursor: 'pointer', color: '#475569', fontWeight: 500, fontSize: '0.9rem',
          }}
        >
          Kembali
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Admin Routes                                                       */
/* ------------------------------------------------------------------ */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RequirePermission><Ringkasan /></RequirePermission>} />
      <Route path="/menu-jasa" element={<RequirePermission><MenuJasa /></RequirePermission>} />
      <Route path="/menu-store" element={<RequirePermission><MenuStore /></RequirePermission>} />
      <Route path="/orders" element={<RequirePermission><Orders /></RequirePermission>} />
      <Route path="/penjualan" element={<RequirePermission><Penjualan /></RequirePermission>} />
      <Route path="/inventory" element={<RequirePermission><Inventory /></RequirePermission>} />
      <Route path="/cashflow" element={<RequirePermission><Cashflow /></RequirePermission>} />
      <Route path="/profit-sharing" element={<RequirePermission><ProfitSharing /></RequirePermission>} />
      <Route path="/konten" element={<RequirePermission><KontenWeb /></RequirePermission>} />
      <Route path="/diskon" element={<RequirePermission><Diskon /></RequirePermission>} />
      <Route path="/referral" element={<RequirePermission><Referral /></RequirePermission>} />
      <Route path="/settings" element={<RequirePermission><Settings /></RequirePermission>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
