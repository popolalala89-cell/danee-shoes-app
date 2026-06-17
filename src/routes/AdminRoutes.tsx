// Danee Shoes & Clean — Admin Sub-Routing
// All routes under /admin/* are rendered here

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
/*  Admin Routes                                                       */
/* ------------------------------------------------------------------ */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Ringkasan />} />
      <Route path="/menu-jasa" element={<MenuJasa />} />
      <Route path="/menu-store" element={<MenuStore />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/penjualan" element={<Penjualan />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/cashflow" element={<Cashflow />} />
      <Route path="/profit-sharing" element={<ProfitSharing />} />
      <Route path="/konten" element={<KontenWeb />} />
      <Route path="/diskon" element={<Diskon />} />
      <Route path="/referral" element={<Referral />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
