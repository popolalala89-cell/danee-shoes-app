// Danee Shoes Care — Sales Service
// Store sales management

import { getSupabase } from '../supabase';
import type {
  StoreSaleRow,
  StoreSaleCreate,
  ServiceResponse,
} from '../types-supabase';

const TABLE = 'store_sales';

/**
 * Get all sales, ordered by tanggal descending
 */
export async function getAll(): Promise<ServiceResponse<StoreSaleRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('tanggal', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data penjualan' };
  }
}

/**
 * Get sales by product ID
 */
export async function getByProduct(
  produkId: string
): Promise<ServiceResponse<StoreSaleRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('produk_id', produkId)
      .order('tanggal', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data penjualan per produk' };
  }
}

/**
 * Create a new sale and update inventory
 * Checks stock availability before recording
 * Creates cashflow entry for the sale
 */
export async function create(
  payload: StoreSaleCreate
): Promise<ServiceResponse<StoreSaleRow>> {
  try {
    const supabase = getSupabase();
    const total = payload.total || payload.qty * payload.harga_satuan;

    // 1. Check stock availability in menu_store
    const { data: product, error: prodErr } = await supabase
      .from('menu_store')
      .select('id, stok, nama_produk')
      .eq('id', payload.produk_id)
      .single();

    if (prodErr) {
      return { success: false, error: 'Produk tidak ditemukan' };
    }

    if (!product || product.stok < payload.qty) {
      return {
        success: false,
        error: `Stok tidak mencukupi. Stok saat ini: ${product?.stok || 0}, dibutuhkan: ${payload.qty}`,
      };
    }

    // 2. Reduce stock in menu_store (inventory_store syncs via DB trigger)
    const { error: stockErr } = await supabase
      .from('menu_store')
      .update({ stok: product.stok - payload.qty })
      .eq('id', payload.produk_id);

    if (stockErr) {
      return { success: false, error: stockErr.message };
    }

    // 3. Insert sale record
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        nama_pembeli: payload.nama_pembeli || null,
        produk_id: payload.produk_id,
        nama_produk: payload.nama_produk,
        qty: payload.qty,
        harga_satuan: payload.harga_satuan,
        total,
      })
      .select()
      .single();

    if (error) {
      // Rollback stock on sale insert failure
      await supabase
        .from('menu_store')
        .update({ stok: product.stok })
        .eq('id', payload.produk_id);

      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mencatat penjualan' };
  }
}
