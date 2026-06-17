// Danee Shoes Care — Menu Store Service
// Full CRUD for menu_store table
// inventory_store is auto-synced by DB trigger

import { getSupabase } from '../supabase';
import type {
  MenuStoreRow,
  MenuStoreCreate,
  MenuStoreUpdate,
  ServiceResponse,
} from '../types-supabase';

const TABLE = 'menu_store';

/**
 * Get all products
 */
export async function getAll(): Promise<ServiceResponse<MenuStoreRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data menu store' };
  }
}

/**
 * Get only active (Aktif) products
 */
export async function getAllActive(): Promise<ServiceResponse<MenuStoreRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('status', 'Aktif')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data menu store aktif' };
  }
}

/**
 * Get single product by id
 */
export async function getById(
  id: string
): Promise<ServiceResponse<MenuStoreRow>> {
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
    return { success: false, error: err.message || 'Gagal mengambil data menu store' };
  }
}

/**
 * Create new product
 * Note: inventory_store is auto-synced by DB trigger tg_sync_inventory_store
 */
export async function create(
  payload: MenuStoreCreate
): Promise<ServiceResponse<MenuStoreRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat menu store' };
  }
}

/**
 * Update existing product
 * Note: inventory_store is auto-synced by DB trigger
 */
export async function update(
  id: string,
  payload: MenuStoreUpdate
): Promise<ServiceResponse<MenuStoreRow>> {
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
    return { success: false, error: err.message || 'Gagal mengupdate menu store' };
  }
}

/**
 * Soft-delete (set status to Nonaktif)
 */
export async function remove(
  id: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(TABLE)
      .update({ status: 'Nonaktif' })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus menu store' };
  }
}
