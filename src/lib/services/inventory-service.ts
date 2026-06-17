// Danee Shoes & Clean — Inventory Service
// Store inventory and bahan inventory management

import { getSupabase } from '../supabase';
import type {
  InventoryStoreRow,
  InventoryBahanRow,
  ServiceResponse,
} from '../types-supabase';

// ===== INVENTORY STORE =====

/**
 * Get all store inventory
 */
export async function getStoreInventory(): Promise<ServiceResponse<InventoryStoreRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('inventory_store')
      .select('*')
      .order('nama_produk', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data inventory store' };
  }
}

/**
 * Stock opname — update physical count, auto-calculate selisih
 * selisih = stok_fisik - stok_sistem
 */
export async function stockOpname(
  produkId: string,
  stokFisik: number
): Promise<ServiceResponse<InventoryStoreRow>> {
  try {
    const supabase = getSupabase();

    // Get current inventory record
    const { data: inv, error: getErr } = await supabase
      .from('inventory_store')
      .select('*')
      .eq('produk_id', produkId)
      .single();

    if (getErr) {
      return { success: false, error: 'Produk inventory tidak ditemukan' };
    }

    const selisih = stokFisik - (inv?.stok_sistem || 0);

    const { data, error } = await supabase
      .from('inventory_store')
      .update({
        stok_fisik: stokFisik,
        selisih,
        update_terakhir: new Date().toISOString(),
      })
      .eq('produk_id', produkId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal melakukan stock opname' };
  }
}

/**
 * Purchase stock — add quantity to inventory
 * Also updates menu_store.stok
 */
export async function purchaseStock(
  produkId: string,
  qty: number
): Promise<ServiceResponse<InventoryStoreRow>> {
  try {
    const supabase = getSupabase();

    // Get current inventory
    const { data: inv, error: getErr } = await supabase
      .from('inventory_store')
      .select('*')
      .eq('produk_id', produkId)
      .single();

    if (getErr) {
      return { success: false, error: 'Produk inventory tidak ditemukan' };
    }

    const newStokSistem = (inv?.stok_sistem || 0) + qty;

    // Update inventory_store
    const { data, error } = await supabase
      .from('inventory_store')
      .update({
        stok_sistem: newStokSistem,
        update_terakhir: new Date().toISOString(),
      })
      .eq('produk_id', produkId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Also update menu_store.stok
    const { error: menuErr } = await supabase
      .from('menu_store')
      .update({ stok: newStokSistem })
      .eq('id', produkId);

    if (menuErr) {
      // Non-critical: log but don't fail
      console.warn('Gagal update menu_store stok:', menuErr.message);
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah stok' };
  }
}

// ===== INVENTORY BAHAN =====

/**
 * Get all bahan inventory
 */
export async function getBahanInventory(): Promise<ServiceResponse<InventoryBahanRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('inventory_bahan')
      .select('*')
      .order('nama_bahan', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data inventory bahan' };
  }
}

/**
 * Add new bahan item
 */
export async function addBahan(data: {
  nama_bahan: string;
  satuan: string;
  stok_sistem?: number;
}): Promise<ServiceResponse<InventoryBahanRow>> {
  try {
    const supabase = getSupabase();
    const { data: result, error } = await supabase
      .from('inventory_bahan')
      .insert(data)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah bahan' };
  }
}

/**
 * Stock opname for bahan — update physical count
 */
export async function stockOpnameBahan(
  bahanId: string,
  stokFisik: number
): Promise<ServiceResponse<InventoryBahanRow>> {
  try {
    const supabase = getSupabase();

    const { data: inv, error: getErr } = await supabase
      .from('inventory_bahan')
      .select('*')
      .eq('id', bahanId)
      .single();

    if (getErr) {
      return { success: false, error: 'Bahan tidak ditemukan' };
    }

    const selisih = stokFisik - (inv?.stok_sistem || 0);

    const { data, error } = await supabase
      .from('inventory_bahan')
      .update({
        stok_fisik: stokFisik,
        selisih,
        update_terakhir: new Date().toISOString(),
      })
      .eq('id', bahanId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal melakukan stock opname bahan' };
  }
}

/**
 * Purchase bahan stock
 */
export async function purchaseBahan(
  bahanId: string,
  qty: number
): Promise<ServiceResponse<InventoryBahanRow>> {
  try {
    const supabase = getSupabase();

    const { data: inv, error: getErr } = await supabase
      .from('inventory_bahan')
      .select('*')
      .eq('id', bahanId)
      .single();

    if (getErr) {
      return { success: false, error: 'Bahan tidak ditemukan' };
    }

    const newStok = (inv?.stok_sistem || 0) + qty;

    const { data, error } = await supabase
      .from('inventory_bahan')
      .update({
        stok_sistem: newStok,
        update_terakhir: new Date().toISOString(),
      })
      .eq('id', bahanId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah stok bahan' };
  }
}
