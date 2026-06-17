// Danee Shoes & Clean — Dashboard Service
// Dashboard summary and leaderboard

import { getSupabase } from '../supabase';
import type {
  OrderRow,
  CashflowRow,
  InventoryStoreRow,
  StoreSaleRow,
  DashboardSummary,
  ServiceResponse,
} from '../types-supabase';

/**
 * Get dashboard ringkasan:
 * - Orders count by status
 * - Today's revenue
 * - Low stock items
 * - Active order count
 */
export async function getRingkasan(): Promise<ServiceResponse<DashboardSummary>> {
  try {
    const supabase = getSupabase();

    // Get today's date boundaries (WITA/UTC+8)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Fetch data in parallel
    const [
      ordersRes,
      cashflowRes,
      inventoryRes,
      salesRes,
    ] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('cashflow').select('*').gte('tanggal', todayStart.toISOString()).lte('tanggal', todayEnd.toISOString()),
      supabase.from('inventory_store').select('*').lte('stok_sistem', 3),
      supabase.from('store_sales').select('*'),
    ]);

    const orders = (ordersRes.data || []) as OrderRow[];
    const cashflow = (cashflowRes.data || []) as CashflowRow[];
    const lowStock = (inventoryRes.data || []) as InventoryStoreRow[];
    const sales = (salesRes.data || []) as StoreSaleRow[];

    // Today's income from cashflow (Pemasukan only)
    let todayIncome = 0;
    for (const cf of cashflow) {
      if (cf.tipe === 'Pemasukan') {
        todayIncome += cf.jumlah;
      }
    }

    // Active orders (not Selesai or Batal)
    const activeOrders = orders.filter(
      (o) => o.status !== 'Selesai' && o.status !== 'Batal'
    ).length;

    // Orders by status
    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    return {
      success: true,
      data: {
        todayIncome,
        activeOrders,
        lowStock,
        topLayanan: calculateTopLayanan(orders),
        topProduk: calculateTopProduk(sales),
        // Include extra fields for richer dashboard
        ...(statusCounts as any),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal mengambil ringkasan dashboard',
    };
  }
}

/**
 * Get leaderboard data — top services and products
 */
export async function getLeaderboard(): Promise<
  ServiceResponse<{
    topLayanan: { nama: string; total: number }[];
    topProduk: { nama: string; total: number }[];
  }>
> {
  try {
    const supabase = getSupabase();

    const [ordersRes, salesRes] = await Promise.all([
      supabase.from('orders').select('layanan'),
      supabase.from('store_sales').select('nama_produk, qty'),
    ]);

    const orders = (ordersRes.data || []) as Pick<OrderRow, 'layanan'>[];
    const sales = (salesRes.data || []) as Pick<StoreSaleRow, 'nama_produk' | 'qty'>[];

    return {
      success: true,
      data: {
        topLayanan: calculateTopLayanan(orders),
        topProduk: calculateTopProduk(sales),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal mengambil leaderboard',
    };
  }
}

/**
 * Calculate top services from orders
 */
function calculateTopLayanan(
  orders: Pick<OrderRow, 'layanan'>[]
): { nama: string; total: number }[] {
  const layananMap: Record<string, number> = {};

  for (const order of orders) {
    if (!order.layanan) continue;
    const items = order.layanan.split(/[,;\n]+/);
    for (const item of items) {
      // Clean the item name — remove brackets, quantities, price annotations
      const cleanName = item
        .replace(/\[.*?\]/g, '')
        .replace(/\(\s*\d+\s*[xX]\s*\)?/gi, '')
        .replace(/@.*$/g, '')
        .replace(/Rp\s*[\d.]+/gi, '')
        .trim();

      if (cleanName && !cleanName.endsWith('-')) {
        layananMap[cleanName] = (layananMap[cleanName] || 0) + 1;
      }
    }
  }

  return Object.entries(layananMap)
    .filter(([_, count]) => count > 0)
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

/**
 * Calculate top products from sales
 */
function calculateTopProduk(
  sales: Pick<StoreSaleRow, 'nama_produk' | 'qty'>[]
): { nama: string; total: number }[] {
  const produkMap: Record<string, number> = {};

  for (const sale of sales) {
    const name = (sale.nama_produk || '').trim();
    if (!name) continue;
    produkMap[name] = (produkMap[name] || 0) + (sale.qty || 1);
  }

  return Object.entries(produkMap)
    .filter(([_, count]) => count > 0)
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
