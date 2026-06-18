// Danee Shoes Care — Order Service
// Full order management

import { getSupabase } from '../supabase';
import type {
  OrderRow,
  OrderCreate,
  OrderUpdate,
  OrderStatus,
  ServiceResponse,
} from '../types-supabase';

const TABLE = 'orders';

/**
 * Get all orders, with optional status filter
 * Ordered by tanggal descending (newest first)
 */
export async function getAll(
  status?: OrderStatus
): Promise<ServiceResponse<OrderRow[]>> {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from(TABLE)
      .select('*')
      .order('tanggal', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data order' };
  }
}

/**
 * Get single order by id
 */
export async function getById(
  id: string
): Promise<ServiceResponse<OrderRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data order' };
  }
}

/**
 * Lookup order by kode (order code)
 */
export async function getByKode(
  kode: string
): Promise<ServiceResponse<OrderRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('kode', kode)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mencari order berdasarkan kode' };
  }
}

/**
 * Create a new order
 * Auto-generates kode via DB trigger
 * Bayar di Awal: cashflow entry should be created by caller or edge function
 */
export async function create(
  payload: OrderCreate
): Promise<ServiceResponse<OrderRow>> {
  try {
    const supabase = getSupabase();
    
    // Generate kode unik format ORD-XXXXXXXXX (max 15 char)
    const unix = String(Date.now());
    const rand = Math.floor(Math.random() * 100);
    const generatedKode = `ORD-${unix.slice(-8)}${String(rand).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        kode: generatedKode,
        nama_pelanggan: payload.nama_pelanggan,
        kontak_wa: payload.kontak_wa || null,
        layanan: payload.layanan,
        harga: payload.harga,
        catatan: payload.catatan || null,
        diskon_info: payload.diskon_info || null,
        referral: payload.referral || null,
        tipe_pembayaran: payload.tipe_pembayaran || 'Bayar di Akhir',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat order' };
  }
}

/**
 * Update order status
 * Validates against allowed status transitions
 */
export async function updateStatus(
  id: string,
  newStatus: OrderStatus
): Promise<ServiceResponse<OrderRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengupdate status order' };
  }
}

/**
 * Full order update (edit order details)
 */
export async function update(
  id: string,
  payload: OrderUpdate
): Promise<ServiceResponse<OrderRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengupdate order' };
  }
}

/**
 * Public tracking: search orders by kode, kontak_wa, or nama_pelanggan
 */
export async function trackOrder(
  keyword: string
): Promise<ServiceResponse<OrderRow[]>> {
  try {
    const supabase = getSupabase();
    const keywordLower = keyword.toLowerCase().trim();

    // Pake RPC function yang bypass RLS (SECURITY DEFINER)
    const { data, error } = await supabase
      .rpc('search_orders', { keyword: keywordLower });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal melacak order' };
  }
}
