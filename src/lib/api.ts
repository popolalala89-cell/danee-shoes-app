// Danee Shoes Care — API Service Layer
// Connects to existing GAS backend via HTTP
import type { MenuJasa, MenuStore, Order, StoreSale, InventoryItem, BahanItem, Cashflow, DashboardSummary, ProfitSharing, ProfitHistory, KontenWeb, DiskonEvent, Referral, ThemeSettings } from './types';

const BASE_URL = 'https://script.google.com/macros/s/AKfycbwVgyCZ-dWiInd2XbU1YGJ_x1qeTmk6tZpLbXCW9LyEuiuZjvY2_mAoiZjajSRwfV7Y/exec';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

let authToken: string | null = localStorage.getItem('danee_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem('danee_token', token);
  else localStorage.removeItem('danee_token');
}

export function getToken(): string | null {
  return authToken;
}

async function callGAS<T = any>(
  action: string,
  params: Record<string, any> = {},
  method: 'GET' | 'POST' = 'POST'
): Promise<ApiResponse<T>> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  
  if (authToken && !params.token) {
    params.token = authToken;
  }

  const options: RequestInit = {
    method,
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
  };

  if (method === 'POST') {
    options.body = JSON.stringify(params);
  } else {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }

  try {
    const res = await fetch(url.toString(), options);
    // GAS web app returns text, parse as JSON
    const text = await res.text();
    // Handle redirect responses (login wall)
    if (text.includes('accounts.google.com') || text.includes('Sign in')) {
      return { success: false, message: 'Sesi backend habis. Buka web app dulu di browser.' };
    }
    return JSON.parse(text);
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal terhubung ke server.' };
  }
}

// ===== AUTH =====
export async function login(password: string) {
  const res = await callGAS<{ token: string }>('login', { password });
  if (res.success && res.token) setToken(res.token);
  return res;
}

export async function checkAuth() {
  if (!authToken) return false;
  const res = await callGAS('checkAuth');
  return res?.success === true;
}

export async function logout() {
  const res = await callGAS('logout');
  setToken(null);
  return res;
}

// ===== MENU JASA =====
export async function getMenuJasa() {
  return callGAS<MenuJasa[]>('getMenuJasa');
}

export async function saveMenuJasa(data: Partial<MenuJasa>) {
  return callGAS('saveMenuJasa', { data });
}

export async function deleteMenuJasa(id: string) {
  return callGAS('deleteMenuJasa', { id });
}

// ===== MENU STORE =====
export async function getMenuStore() {
  return callGAS<MenuStore[]>('getMenuStore');
}

export async function saveMenuStore(data: Partial<MenuStore>) {
  return callGAS('saveMenuStore', { data });
}

export async function deleteMenuStore(id: string) {
  return callGAS('deleteMenuStore', { id });
}

// ===== ORDERS =====
export async function getOrders() {
  return callGAS<Order[]>('getOrders');
}

export async function addOrder(data: Partial<Order>) {
  return callGAS<{ orderId: string }>('addOrder', { data });
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  return callGAS('updateOrderStatus', { orderId, newStatus });
}

export async function updateOrder(orderId: string, data: Partial<Order>) {
  return callGAS('updateOrder', { orderId, data });
}

export async function trackOrder(keyword: string) {
  return callGAS<Order[]>('trackOrder', { keyword });
}

// ===== STORE SALES =====
export async function getSales() {
  return callGAS<StoreSale[]>('getSales');
}

export async function recordSale(data: {
  ProdukID: string;
  Qty: number;
  NamaProduk: string;
  HargaSatuan: number;
  NamaPembeli?: string;
}) {
  return callGAS('recordSale', { data });
}

// ===== INVENTORY =====
export async function getInventoryStore() {
  return callGAS<InventoryItem[]>('getInventoryStore');
}

export async function stockOpnameStore(items: { ProdukID: string; StokFisik: number }[]) {
  return callGAS('stockOpnameStore', { items });
}

export async function purchaseStock(data: { ProdukID: string; NamaProduk: string; Qty: number; HargaBeli: number }) {
  return callGAS('purchaseStock', { data });
}

// ===== BAHAN =====
export async function getInventoryBahan() {
  return callGAS<BahanItem[]>('getInventoryBahan');
}

export async function addBahan(data: { NamaBahan: string; Satuan: string; Stok: number }) {
  return callGAS('addBahan', { data });
}

export async function stockOpnameBahan(items: { BahanID: string; StokFisik: number }[]) {
  return callGAS('stockOpnameBahan', { items });
}

export async function purchaseBahan(data: { BahanID: string; NamaBahan: string; Qty: number; HargaBeli: number }) {
  return callGAS('purchaseBahan', { data });
}

// ===== CASHFLOW =====
export async function getCashflow(filters?: { startDate?: string; endDate?: string }) {
  return callGAS<Cashflow[]>('getCashflow', { filters });
}

export async function addCashflowManual(data: { Tipe: string; Kategori: string; Keterangan: string; Jumlah: number }) {
  return callGAS('addCashflowManual', { data });
}

// ===== DASHBOARD =====
export async function getDashboardSummary(period: string = 'bulan_ini') {
  return callGAS<DashboardSummary>('getDashboardSummary', { period });
}

// ===== PROFIT SHARING =====
export async function getProfitSharingData(startDate?: string, endDate?: string) {
  return callGAS<ProfitSharing>('getProfitSharingData', { startDate, endDate });
}

export async function getProfitHistorySummary() {
  return callGAS<ProfitHistory[]>('getProfitHistorySummary');
}

// ===== KONTEN WEB =====
export async function getKontenWeb() {
  return callGAS<KontenWeb[]>('getKontenWeb');
}

export async function saveKontenWeb(data: Partial<KontenWeb>) {
  return callGAS('saveKontenWeb', { data });
}

export async function deleteKontenWeb(id: string) {
  return callGAS('deleteKontenWeb', { id });
}

// ===== DISKON =====
export async function getDiskonEvent() {
  return callGAS<DiskonEvent[]>('getDiskonEvent');
}

export async function saveDiskonEvent(data: Partial<DiskonEvent>) {
  return callGAS('saveDiskonEvent', { data });
}

export async function deleteDiskonEvent(id: string) {
  return callGAS('deleteDiskonEvent', { id });
}

// ===== REFERRAL =====
export async function getReferralAdmin() {
  return callGAS<Referral[]>('getReferralAdmin');
}

export async function saveReferral(data: Partial<Referral>) {
  return callGAS('saveReferral', { data });
}

export async function deleteReferral(id: string) {
  return callGAS('deleteReferral', { id });
}

// ===== THEME =====
export async function getThemeSettings() {
  return callGAS<ThemeSettings>('getThemeSettings');
}

export async function saveThemeSettings(primaryColor: string, hoverColor: string) {
  return callGAS('saveThemeSettings', { primaryColor, hoverColor });
}

// ===== PUBLIC (no auth) =====
export async function getReferralByCode(code: string) {
  return callGAS('getReferralByCode', { code });
}

export async function trackReferralClick(code: string) {
  return callGAS('trackReferralClick', { code });
}
