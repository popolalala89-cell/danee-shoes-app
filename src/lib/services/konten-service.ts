// Danee Shoes & Clean — Konten Service
// Content management: konten_web, diskon, referral, settings CRUD

import { getSupabase } from '../supabase';
import type {
  KontenWebRow,
  KontenWebCreate,
  KontenWebUpdate,
  DiskonEventRow,
  DiskonEventCreate,
  DiskonEventUpdate,
  ReferralRow,
  ReferralCreate,
  ReferralUpdate,
  SettingsRow,
  ServiceResponse,
} from '../types-supabase';

// ===== KONTEN WEB =====

const KONTEN_TABLE = 'konten_web';

/**
 * Get all konten web with optional kategori filter
 */
export async function getAll(
  kategori?: string
): Promise<ServiceResponse<KontenWebRow[]>> {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from(KONTEN_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (kategori) {
      query = query.eq('kategori', kategori);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data konten' };
  }
}

/**
 * Create new konten web
 */
export async function createKonten(
  payload: KontenWebCreate
): Promise<ServiceResponse<KontenWebRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(KONTEN_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat konten' };
  }
}

/**
 * Update konten web
 */
export async function updateKonten(
  id: string,
  payload: KontenWebUpdate
): Promise<ServiceResponse<KontenWebRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(KONTEN_TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengupdate konten' };
  }
}

/**
 * Delete konten web (hard delete by row)
 */
export async function deleteKonten(
  id: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(KONTEN_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus konten' };
  }
}

// ===== DISKON EVENT =====

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

// ===== REFERRAL =====

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
 * Delete referral (soft delete: set status Nonaktif)
 */
export async function deleteReferral(
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

// ===== SETTINGS (key-value) =====

const SETTINGS_TABLE = 'settings';

/**
 * Get a setting value by key
 */
export async function getSetting(
  key: string
): Promise<ServiceResponse<string | null>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.value || null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil setting' };
  }
}

/**
 * Save a setting (upsert by key)
 */
export async function saveSetting(
  key: string,
  value: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(SETTINGS_TABLE).upsert(
      { key, value },
      { onConflict: 'key' }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan setting' };
  }
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<ServiceResponse<SettingsRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil semua setting' };
  }
}
