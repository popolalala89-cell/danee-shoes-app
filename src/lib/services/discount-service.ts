// Danee Shoes Care — Discount Service
// Diskon event management: CRUD

import { getSupabase } from '../supabase';
import type {
  DiskonEventRow,
  DiskonEventCreate,
  DiskonEventUpdate,
  ServiceResponse,
} from '../types-supabase';

const DISKON_TABLE = 'diskon_event';

/**
 * Get all diskon events
 */
export async function getAllDiskon(): Promise<ServiceResponse<DiskonEventRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(DISKON_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data diskon' };
  }
}

/**
 * Create new diskon event
 */
export async function createDiskon(
  payload: DiskonEventCreate
): Promise<ServiceResponse<DiskonEventRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(DISKON_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat event diskon' };
  }
}

/**
 * Update diskon event
 */
export async function updateDiskon(
  id: string,
  payload: DiskonEventUpdate
): Promise<ServiceResponse<DiskonEventRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(DISKON_TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengupdate event diskon' };
  }
}

/**
 * Delete diskon event (hard delete)
 */
export async function deleteDiskon(
  id: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(DISKON_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus event diskon' };
  }
}
