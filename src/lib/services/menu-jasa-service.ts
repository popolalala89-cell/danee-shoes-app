// Danee Shoes & Clean — Menu Jasa Service
// Full CRUD for menu_jasa table

import { getSupabase } from '../supabase';
import type {
  MenuJasaRow,
  MenuJasaCreate,
  MenuJasaUpdate,
  ServiceResponse,
} from '../types-supabase';

const TABLE = 'menu_jasa';

/**
 * Get all services, with optional kategori filter
 */
export async function getAll(
  kategori?: 'Cleaning' | 'Repair'
): Promise<ServiceResponse<MenuJasaRow[]>> {
  try {
    const supabase = getSupabase();
    let query = supabase.from(TABLE).select('*').order('urutan', { ascending: true });

    if (kategori) {
      query = query.eq('kategori', kategori);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data menu jasa' };
  }
}

/**
 * Get single service by id
 */
export async function getById(
  id: string
): Promise<ServiceResponse<MenuJasaRow>> {
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
    return { success: false, error: err.message || 'Gagal mengambil data menu jasa' };
  }
}

/**
 * Create new service
 */
export async function create(
  payload: MenuJasaCreate
): Promise<ServiceResponse<MenuJasaRow>> {
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
    return { success: false, error: err.message || 'Gagal membuat menu jasa' };
  }
}

/**
 * Update existing service
 */
export async function update(
  id: string,
  payload: MenuJasaUpdate
): Promise<ServiceResponse<MenuJasaRow>> {
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
    return { success: false, error: err.message || 'Gagal mengupdate menu jasa' };
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
    return { success: false, error: err.message || 'Gagal menghapus menu jasa' };
  }
}
