// Danee Shoes Care — Referral Service
// Referral management: CRUD + lookup + tracking

import { getSupabase } from '../supabase';
import type {
  ReferralRow,
  ReferralCreate,
  ReferralUpdate,
  ServiceResponse,
} from '../types-supabase';

const REFERRAL_TABLE = 'referral';

/**
 * Get all referrals
 */
export async function getAllReferral(): Promise<ServiceResponse<ReferralRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(REFERRAL_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data referral' };
  }
}

/**
 * Create new referral
 */
export async function createReferral(
  payload: ReferralCreate
): Promise<ServiceResponse<ReferralRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(REFERRAL_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat referral' };
  }
}

/**
 * Update referral
 */
export async function updateReferral(
  id: string,
  payload: ReferralUpdate
): Promise<ServiceResponse<ReferralRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(REFERRAL_TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengupdate referral' };
  }
}

/**
 * Nonaktifkan referral (soft delete: set status Nonaktif)
 */
export async function nonaktifkanReferral(
  id: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(REFERRAL_TABLE)
      .update({ status: 'Nonaktif' })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus referral' };
  }
}

/**
 * Get referral by code (public)
 */
export async function getReferralByCode(
  code: string
): Promise<ServiceResponse<{ id: string; kode: string; nama: string } | null>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(REFERRAL_TABLE)
      .select('id, kode, nama_referral')
      .eq('kode', code)
      .eq('status', 'Aktif')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: { id: data.id, kode: data.kode, nama: data.nama_referral },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mencari referral' };
  }
}

/**
 * Track referral click (increment total_klik)
 */
export async function trackReferralClick(
  code: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { data: ref, error: getErr } = await supabase
      .from(REFERRAL_TABLE)
      .select('id, total_klik')
      .eq('kode', code)
      .eq('status', 'Aktif')
      .maybeSingle();

    if (getErr || !ref) {
      return { success: false, error: 'Referral tidak ditemukan' };
    }

    const { error } = await supabase
      .from(REFERRAL_TABLE)
      .update({ total_klik: (ref.total_klik || 0) + 1 })
      .eq('id', ref.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mencatat klik referral' };
  }
}
